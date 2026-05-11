from __future__ import annotations

import hashlib
import json
import math
import re
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException

from app.command_usage_resolver import resolve_command_usage_context
from app.config import get_settings
from app.gms_client import GmsLlmClient
from app.prompt_builder import (
    build_prompt,
    resolve_command_usage_examples_from_metadata,
    resolve_hint_level,
)
from app.retrieval_formatter import render_query_text
from app.schemas import (
    EvidenceItem,
    HintGenerateRequest,
    HintGenerateResponse,
    HintRetrieveRequest,
    HintRetrieveResponse,
)
from app.vector_search import VectorSearchRepository
from app.hint_state import (
    check_and_update_repeat_count,
    close_redis,
    get_pattern_embedding,
    get_repeat_count,
    init_redis,
    set_pattern_embedding,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.gms_key:
        raise RuntimeError("GMS_KEY is not configured. Set it in environment or .env")
    app.state.gms_client = GmsLlmClient(settings)
    app.state.vector_repo = VectorSearchRepository(settings)
    await init_redis()
    try:
        yield
    finally:
        await close_redis()
        await app.state.gms_client.close()


app = FastAPI(
    title="Lucas Hint Orchestrator",
    version="0.1.0",
    description="LLM orchestrator for Lucas live hints",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name, "env": settings.app_env}


@app.post("/v1/hints/generate", response_model=HintGenerateResponse)
async def generate_hint(request: HintGenerateRequest) -> HintGenerateResponse:
    hint_level = resolve_hint_level(
        request.fail_count_after_action, request.repeat_count_after_action, request.low_confidence
    )
    prompt_request = request
    if hint_level == "MEDIUM" and len(request.evidences) > 1:
        prompt_request = request.model_copy(update={"evidences": request.evidences[:1]})
    prompt = build_prompt(prompt_request)
    llm: GmsLlmClient = app.state.gms_client
    intent_subtype = (request.intent_subtype or "progress_hint").strip().lower()
    prompt_mode = "command_usage" if intent_subtype == "command_usage" else "progress_hint"
    if hint_level in {"MEDIUM", "STRONG"}:
        selected_model = settings.gms_llm_model
    elif intent_subtype == "command_usage":
        selected_model = settings.gms_command_usage_llm_model
    else:
        selected_model = settings.gms_light_llm_model

    try:
        raw_text = await llm.generate_text(
            prompt,
            model_name=selected_model,
            prompt_mode=prompt_mode,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to generate hint from GMS",
                "upstream_status": exc.response.status_code,
                "upstream_body": exc.response.text,
            },
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail={"message": "Cannot reach GMS endpoint"}) from exc

    parsed = _parse_json_or_none(raw_text)
    if parsed is None:
        if intent_subtype == "command_usage":
            fallback = _build_command_usage_fallback_response(request, selected_model, hint_level)
            if fallback:
                return fallback
        raise HTTPException(
            status_code=502,
            detail={
                "code": "LLM_INVALID_JSON",
                "message": "LLM returned invalid JSON response",
            },
        )
    parsed = _normalize_llm_payload(parsed, default_hint_level=hint_level)

    try:
        response = HintGenerateResponse(
            hint_text=parsed["hint_text"],
            hint_level=parsed["hint_level"],
            model=selected_model.removeprefix("models/"),
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "LLM_RESPONSE_SCHEMA_ERROR",
                "message": "LLM response schema validation failed",
            },
        )

    if intent_subtype == "command_usage":
        response = HintGenerateResponse(
            hint_text=_sanitize_command_usage_hint_text(
                _format_command_usage_hint_text(response.hint_text),
                request.command_usage_context or {},
            ),
            hint_level=response.hint_level,
            model=response.model,
        )

    if not response.hint_text.strip() or not response.hint_level.strip():
        if intent_subtype == "command_usage":
            fallback = _build_command_usage_fallback_response(request, selected_model, hint_level)
            if fallback:
                return fallback
        raise HTTPException(
            status_code=502,
            detail={
                "code": "LLM_EMPTY_RESPONSE",
                "message": "LLM returned empty hint fields",
            },
        )

    return response


@app.post("/v1/hints/retrieve", response_model=HintRetrieveResponse)
async def retrieve_hint_evidence(request: HintRetrieveRequest) -> HintRetrieveResponse:
    llm: GmsLlmClient = app.state.gms_client
    repo: VectorSearchRepository = app.state.vector_repo
    user_message = _sanitize_user_message(request.user_message)
    message_type = "none"
    intent_subtype = "progress_hint"
    route_decision = "RAG_HINT"
    if user_message:
        try:
            raw_classification = await llm.classify_message(
                user_message,
                chapter_code=request.chapter_id,
                from_node_code=request.from_node_id,
                action_type=request.action_type,
                fail_count_after_action=request.fail_count_after_action,
            )
            parsed_classification = _parse_json_or_none(raw_classification) or {}
            message_type = _normalize_message_type(parsed_classification.get("message_type"))
            intent_subtype = _normalize_intent_subtype(
                parsed_classification.get("intent_subtype"), message_type
            )
            if message_type == "hint_question" and user_message:
                if _looks_like_command_usage_question(user_message):
                    intent_subtype = "command_usage"
                elif intent_subtype == "command_usage":
                    # Ambiguous command-word follow-up is treated as progress hint by default.
                    intent_subtype = "progress_hint"
        except httpx.HTTPStatusError:
            message_type = "hint_question"
            intent_subtype = "progress_hint"
        except httpx.RequestError:
            message_type = "hint_question"
            intent_subtype = "progress_hint"
        except Exception:
            message_type = "hint_question"
            intent_subtype = "progress_hint"

        if not settings.hint_command_usage_routing_enabled and intent_subtype == "command_usage":
            intent_subtype = "progress_hint"

        route_decision = _route_decision_from_message_type(message_type)
        if route_decision == "BLOCKED_NON_HINT":
            blocked_hint_level = resolve_hint_level(request.fail_count_after_action, 0, True)
            return HintRetrieveResponse(
                message_type=message_type,
                route_decision=route_decision,
                intent_subtype=intent_subtype,
                selected_phase="blocked_non_hint",
                low_confidence=True,
                query_vector_dimension=0,
                query_text="",
                candidate_count=0,
                repeat_count_after_action=0,
                stress_score=0,
                hint_level=blocked_hint_level,
                command_usage_context=None,
                evidences=[],
            )

    output_dim = request.output_dimensionality or settings.gms_embedding_output_dimensionality
    search_top_k = min(request.search_top_k or settings.retrieve_default_search_top_k, 5)
    evidence_limit = min(request.evidence_limit or settings.retrieve_default_evidence_limit, 5)
    min_similarity = request.min_similarity or settings.retrieve_default_min_similarity

    query_text = render_query_text(
        chapter_id=request.chapter_id,
        from_node_id=request.from_node_id,
        action_type=request.action_type,
        current_input=request.current_input,
        fail_count_after_action=request.fail_count_after_action,
        expected_action_type=request.expected_action_type,
        recent_actions=request.recent_actions,
        extra_context=request.extra_context,
        es_signal=request.es_signal,
        user_message=user_message,
    )

    try:
        vector = await llm.embed_text(query_text, output_dimensionality=output_dim)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to create query embedding from GMS",
                "upstream_status": exc.response.status_code,
                "upstream_body": exc.response.text,
            },
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail={"message": "Cannot reach GMS embedding endpoint"}) from exc

    if not vector:
        raise HTTPException(status_code=502, detail={"message": "Empty embedding vector"})

    repeat_text = _build_repeat_text(
        user_message=user_message,
        current_input=request.current_input,
        recent_actions=request.recent_actions,
        from_node_id=request.from_node_id,
    )
    if repeat_text:
        try:
            repeat_vector = await llm.embed_text(repeat_text, output_dimensionality=output_dim)
            if repeat_vector:
                repeat_count = await check_and_update_repeat_count(
                    session_id=request.session_id,
                    chapter_code=request.chapter_id,
                    from_node_code=request.from_node_id,
                    current_vector=repeat_vector,
                )
            else:
                repeat_count = await get_repeat_count(
                    session_id=request.session_id,
                    chapter_code=request.chapter_id,
                    from_node_code=request.from_node_id,
                )
        except Exception:
            repeat_count = await get_repeat_count(
                session_id=request.session_id,
                chapter_code=request.chapter_id,
                from_node_code=request.from_node_id,
            )
    else:
        repeat_count = await get_repeat_count(
            session_id=request.session_id,
            chapter_code=request.chapter_id,
            from_node_code=request.from_node_id,
        )
    stress_score = (request.fail_count_after_action * settings.hint_stress_fail_weight) + (
        repeat_count * settings.hint_stress_repeat_weight
    )
    retrieval_hint_level = resolve_hint_level(
        request.fail_count_after_action,
        repeat_count,
        False,
    )
    if retrieval_hint_level in {"LOW_CONFIDENCE", "LIGHT"}:
        required_evidence_limit = max(1, settings.retrieve_evidence_limit_light)
    elif retrieval_hint_level == "MEDIUM":
        required_evidence_limit = max(1, settings.retrieve_evidence_limit_medium)
    else:
        required_evidence_limit = max(1, settings.retrieve_evidence_limit_strong)
    evidence_limit = min(max(evidence_limit, required_evidence_limit), search_top_k)

    vector_literal = "[" + ",".join(str(v) for v in vector) + "]"
    phase, selected, low_confidence = repo.search(
        query_vector=vector_literal,
        chapter_code=request.chapter_id,
        from_node_code=request.from_node_id,
        action_type=request.action_type,
        current_input=request.current_input,
        search_top_k=search_top_k,
        evidence_limit=evidence_limit,
        min_similarity=min_similarity,
        hint_level=retrieval_hint_level,
        recent_actions=request.recent_actions,
    )

    if (
        settings.hint_runtime_pattern_rerank_enabled
        and (request.action_type or "").strip().lower() == "command"
        and selected
    ):
        selected = await _rerank_candidates_with_pattern_embeddings(
            llm=llm,
            selected=selected,
            query_vector=vector,
            output_dimensionality=output_dim,
            cache_ttl_seconds=settings.hint_runtime_pattern_cache_ttl_seconds,
        )

    command_usage_context: dict | None = None
    if intent_subtype == "command_usage" and settings.hint_command_usage_routing_enabled:
        command_candidates = list(selected)
        if settings.hint_command_usage_embed_resolver_enabled and user_message:
            try:
                usage_vector = await llm.embed_text(user_message, output_dimensionality=output_dim)
                if usage_vector:
                    usage_vector_literal = "[" + ",".join(str(v) for v in usage_vector) + "]"
                    command_candidates.extend(
                        repo.search_command_catalog(
                            query_vector=usage_vector_literal,
                            chapter_code=request.chapter_id,
                            search_top_k=max(1, settings.hint_command_usage_candidate_top_k),
                        )
                    )
            except Exception:
                pass

        static_top_k = max(40, settings.hint_command_usage_candidate_top_k * 3)
        command_candidates.extend(
            repo.search_command_catalog_static(
                chapter_code=request.chapter_id,
                search_top_k=static_top_k,
            )
        )
        command_usage_context = resolve_command_usage_context(
            user_message=user_message,
            from_node_code=request.from_node_id,
            candidates=command_candidates,
            high_confidence=settings.hint_command_usage_high_confidence,
            medium_confidence=settings.hint_command_usage_medium_confidence,
        )
        asked_command = None
        if command_usage_context:
            asked_command = _to_text(command_usage_context.get("asked_command_head"))

        if not command_usage_context:
            intent_subtype = "progress_hint"
            command_usage_context = None
        elif (not command_usage_context.get("resolved_candidates")) and not asked_command:
            intent_subtype = "progress_hint"
            command_usage_context = None
        else:
            confidence = _to_float(command_usage_context.get("resolver_confidence"))
            if confidence >= settings.hint_command_usage_medium_confidence:
                low_confidence = False

    evidence_items = [
        EvidenceItem(
            knowledge_id=item.id,
            transition_id=_to_int(item.metadata.get("transition_id")),
            to_node_code=_to_text(item.metadata.get("to_node_code")),
            action_type=_to_text(item.metadata.get("action_type")),
            similarity=item.similarity,
            cosine_distance=item.cosine_distance,
            priority_rank=item.priority_rank,
            priority=item.priority,
            content=item.content,
            metadata=item.metadata,
        )
        for item in selected
    ]

    return HintRetrieveResponse(
        message_type=message_type,
        route_decision=route_decision,
        intent_subtype=intent_subtype,
        selected_phase=phase,
        low_confidence=low_confidence,
        query_vector_dimension=len(vector),
        query_text=query_text,
        candidate_count=len(selected),
        repeat_count_after_action=repeat_count,
        stress_score=stress_score,
        hint_level=retrieval_hint_level,
        command_usage_context=command_usage_context,
        evidences=evidence_items,
    )


async def _rerank_candidates_with_pattern_embeddings(
    *,
    llm: GmsLlmClient,
    selected: list[Any],
    query_vector: list[float],
    output_dimensionality: int,
    cache_ttl_seconds: int,
) -> list[Any]:
    query_norm = _vector_norm(query_vector)
    if query_norm <= 0:
        return selected

    scored: list[tuple[float, int, Any]] = []
    for idx, candidate in enumerate(selected):
        metadata = getattr(candidate, "metadata", {}) or {}
        action = str(metadata.get("action_type") or "").strip().lower()
        if action != "command":
            scored.append((float("-inf"), idx, candidate))
            continue

        pattern_text = _pattern_text_from_metadata(metadata)
        if not pattern_text:
            scored.append((float("-inf"), idx, candidate))
            continue

        pattern_vec = await _get_or_create_pattern_embedding(
            llm=llm,
            pattern_text=pattern_text,
            output_dimensionality=output_dimensionality,
            cache_ttl_seconds=cache_ttl_seconds,
        )
        if not pattern_vec:
            scored.append((float("-inf"), idx, candidate))
            continue

        pattern_similarity = _cosine_similarity(query_vector, query_norm, pattern_vec)
        base_similarity = _to_float(getattr(candidate, "similarity", 0.0))
        priority_rank = _to_float(getattr(candidate, "priority_rank", 9999))
        priority_bonus = 1.0 / (1.0 + max(0.0, priority_rank))

        # Re-rank priority: runtime reconstructed-pattern similarity first.
        final_score = (0.80 * pattern_similarity) + (0.15 * base_similarity) + (0.05 * priority_bonus)
        scored.append((final_score, idx, candidate))

    scored.sort(key=lambda x: (x[0], -x[1]), reverse=True)
    return [item[2] for item in scored]


def _pattern_text_from_metadata(metadata: dict[str, Any]) -> str | None:
    examples = resolve_command_usage_examples_from_metadata(metadata, action_type="command")
    strong = _to_text(examples.get("example_strong"))
    medium = _to_text(examples.get("example_medium"))
    return (strong or medium or "").strip() or None


async def _get_or_create_pattern_embedding(
    *,
    llm: GmsLlmClient,
    pattern_text: str,
    output_dimensionality: int,
    cache_ttl_seconds: int,
) -> list[float] | None:
    key = _pattern_embedding_cache_key(pattern_text, output_dimensionality)
    cached = await get_pattern_embedding(key)
    if cached:
        return cached

    try:
        embedded = await llm.embed_text(pattern_text, output_dimensionality=output_dimensionality)
    except Exception:
        return None
    if not embedded:
        return None

    await set_pattern_embedding(
        key,
        embedded,
        ttl_seconds=cache_ttl_seconds,
    )
    return embedded


def _pattern_embedding_cache_key(pattern_text: str, output_dimensionality: int) -> str:
    text_hash = hashlib.sha256(pattern_text.encode("utf-8")).hexdigest()
    return f"dim{output_dimensionality}:{text_hash}"


def _cosine_similarity(a: list[float], a_norm: float, b: list[float]) -> float:
    b_norm = _vector_norm(b)
    if a_norm <= 0 or b_norm <= 0:
        return -1.0
    size = min(len(a), len(b))
    dot = 0.0
    for i in range(size):
        dot += a[i] * b[i]
    return dot / (a_norm * b_norm)


def _vector_norm(values: list[float]) -> float:
    if not values:
        return 0.0
    return math.sqrt(sum(v * v for v in values))


def _parse_json_or_none(text: str) -> dict | None:
    if not text or not text.strip():
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        left = text.find("{")
        right = text.rfind("}")
        if left == -1 or right == -1 or right <= left:
            return None
        candidate = text[left : right + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            return None


def _normalize_llm_payload(parsed: dict[str, Any], *, default_hint_level: str) -> dict[str, Any]:
    normalized: dict[str, Any] = dict(parsed or {})

    hint_text = normalized.get("hint_text")
    if not isinstance(hint_text, str) or not hint_text.strip():
        fallback_text = None

        steps = normalized.get("steps")
        if isinstance(steps, list):
            parts = [str(item).strip() for item in steps if str(item).strip()]
            if parts:
                fallback_text = " ".join(parts)

        if not fallback_text:
            for key in ("message", "hint", "text", "response"):
                value = normalized.get(key)
                if isinstance(value, str) and value.strip():
                    fallback_text = value.strip()
                    break

        if fallback_text:
            normalized["hint_text"] = fallback_text

    valid_levels = {"LOW_CONFIDENCE", "LIGHT", "MEDIUM", "STRONG"}
    level = str(normalized.get("hint_level") or "").strip().upper()
    if level not in valid_levels:
        level = str(default_hint_level or "LIGHT").strip().upper()
        if level not in valid_levels:
            level = "LIGHT"
    normalized["hint_level"] = level

    return normalized


def _enforce_progress_hint_text(
    *,
    text: str,
    hint_level: str,
    evidences: list[EvidenceItem],
) -> str:
    level = (hint_level or "LIGHT").strip().upper()
    patterns = _progress_patterns_by_level(evidences, level)
    if not patterns:
        return text.strip()

    required = 1 if level in {"LOW_CONFIDENCE", "LIGHT"} else (2 if level == "MEDIUM" else min(3, len(patterns)))
    required_patterns = patterns[:required]
    
    if level in {"LOW_CONFIDENCE", "LIGHT"}:
        return text.strip()

    if _contains_all_command_heads(text, required_patterns):
        return text.strip()

    if required == 1:
        return f"먼저 `{required_patterns[0]}` 형태로 확인해."
    if required == 2:
        return f"먼저 `{required_patterns[0]}`로 확인해. 그다음 `{required_patterns[1]}`로 이어가."
    return (
        f"먼저 `{required_patterns[0]}`로 범위를 확인해. "
        f"그다음 `{required_patterns[1]}`로 단서를 좁혀. "
        f"마지막으로 `{required_patterns[2]}`까지 시도해."
    )


def _progress_patterns_by_level(evidences: list[EvidenceItem], level: str) -> list[str]:
    if not evidences:
        return []

    def rank(item: EvidenceItem) -> tuple[int, float]:
        pr = item.priority_rank if item.priority_rank is not None else 9999
        sim = item.similarity if item.similarity is not None else 0.0
        return (int(pr), -float(sim))

    ordered = sorted(evidences, key=rank)
    seen: set[str] = set()
    patterns: list[str] = []
    for item in ordered:
        metadata = item.metadata or {}
        action = item.action_type or metadata.get("action_type") or "command"
        examples = resolve_command_usage_examples_from_metadata(metadata, action_type=str(action))
        pattern = None
        if level in {"LOW_CONFIDENCE", "LIGHT"}:
            pattern = _light_pattern_from_examples(examples)
        elif level == "MEDIUM":
            pattern = examples.get("example_medium") or _light_pattern_from_examples(examples)
        else:
            pattern = examples.get("example_strong") or examples.get("example_medium") or _light_pattern_from_examples(examples)

        normalized = (pattern or "").strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        patterns.append(normalized)
        if len(patterns) >= 3:
            break
    return patterns


def _light_pattern_from_examples(examples: dict[str, Any]) -> str:
    head = str(examples.get("command_head") or "").strip().lower()
    if head == "ls":
        return "ls <옵션> <경로>"
    if head == "find":
        return 'find <경로> -name "<패턴>"'
    if head == "cat":
        return "cat <파일경로>"
    if head == "grep":
        return "grep <패턴> <파일경로>"
    if head == "echo":
        return "echo <문자열>"
    if head == "tar":
        return "tar <옵션> <압축파일> <대상들...>"
    if head:
        return f"{head} <옵션> <대상>"
    medium = str(examples.get("example_medium") or "").strip()
    if medium:
        return medium
    strong = str(examples.get("example_strong") or "").strip()
    if strong:
        return strong
    return "명령어 <옵션> <대상>"


def _contains_all_command_heads(text: str, patterns: list[str]) -> bool:
    if not text:
        return False
    lowered = text.lower()
    for pattern in patterns:
        head = _command_head(pattern)
        if not head:
            continue
        if re.search(rf"(?<![a-z0-9_-]){re.escape(head)}(?![a-z0-9_-])", lowered) is None:
            return False
    return True


def _command_head(text: str | None) -> str | None:
    value = (text or "").strip().lower()
    if not value:
        return None
    token = value.split()[0]
    if re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", token):
        return token
    return None


def _to_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _to_text(value) -> str | None:
    return None if value is None else str(value)


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _build_command_usage_fallback_response(
    request: HintGenerateRequest,
    selected_model: str,
    hint_level: str,
) -> HintGenerateResponse | None:
    context = request.command_usage_context or {}
    asked_command = _to_text(context.get("asked_command_head"))
    resolved = context.get("resolved_candidates")

    if isinstance(resolved, str):
        try:
            parsed_any = json.loads(resolved)
            if isinstance(parsed_any, dict):
                resolved = parsed_any.get("resolved_candidates")
            elif isinstance(parsed_any, list):
                resolved = parsed_any
        except json.JSONDecodeError:
            pass

    if not isinstance(resolved, list) or not resolved:
        if asked_command:
            hint_text = (
                f"`{asked_command}`는 옵션과 대상을 붙여 쓰는 명령어다.\n"
                "사용 형식:\n"
                f"`{asked_command} [옵션] [대상]`"
            )
            return HintGenerateResponse(
                hint_text=_format_command_usage_hint_text(hint_text),
                hint_level=hint_level,
                model=selected_model.removeprefix("models/"),
            )
        return None

    first = resolved[0] if isinstance(resolved[0], dict) else None
    if not first:
        return None

    command_head = str(first.get("command_head") or "").strip() or "명령어"
    example_medium = str(first.get("example_medium") or "").strip()
    example_strong = str(first.get("example_strong") or "").strip()
    guide = _safe_command_usage_example(
        command_head=command_head,
        rule=str(first.get("rule") or "").strip(),
        example_strong=example_strong,
        example_medium=example_medium,
    )

    if guide:
        hint_text = (
            f"`{command_head}`는 사용법을 확인할 때 많이 쓴다.\n"
            "사용 형식:\n"
            f"`{guide}`"
        )
    else:
        hint_text = (
            f"`{command_head}`는 용도에 따라 옵션이 달라진다.\n"
            "사용 형식은 `--help`로 먼저 확인해라."
        )

    return HintGenerateResponse(
        hint_text=_format_command_usage_hint_text(hint_text),
        hint_level=hint_level,
        model=selected_model.removeprefix("models/"),
    )
def _format_command_usage_hint_text(text: str | None) -> str:
    if not text:
        return ""

    normalized = text.replace("\r\n", "\n")
    normalized = re.sub(r"(?<!\n)(`[^`\n]+`)", r"\n\1", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _sanitize_command_usage_hint_text(text: str, context: dict) -> str:
    if not text:
        return text
    normalized = text
    for candidate in _extract_command_usage_candidates(context):
        strong = _to_text(candidate.get("example_strong"))
        command_head = _to_text(candidate.get("command_head")) or "명령어"
        rule = _to_text(candidate.get("rule"))
        medium = _to_text(candidate.get("example_medium"))
        safe = _safe_command_usage_example(
            command_head=command_head,
            rule=rule,
            example_strong=strong,
            example_medium=medium,
        )
        if strong and safe and strong in normalized:
            normalized = normalized.replace(strong, safe)
    return normalized


def _extract_command_usage_candidates(context: dict) -> list[dict]:
    resolved = context.get("resolved_candidates")
    if isinstance(resolved, str):
        try:
            parsed_any = json.loads(resolved)
            if isinstance(parsed_any, dict):
                resolved = parsed_any.get("resolved_candidates")
            elif isinstance(parsed_any, list):
                resolved = parsed_any
        except json.JSONDecodeError:
            resolved = None
    if isinstance(resolved, list):
        return [item for item in resolved if isinstance(item, dict)]
    selected = context.get("selected_candidate")
    if isinstance(selected, dict):
        return [selected]
    return []


def _safe_command_usage_example(
    *,
    command_head: str,
    rule: str | None,
    example_strong: str | None,
    example_medium: str | None,
) -> str:
    normalized_rule = (rule or "").strip().upper()
    if normalized_rule == "RELAY_REQUEST_TO_FILE" and command_head.lower() == "echo":
        return 'echo "<메시지>" | nc <host> <port> > <output_file>'
    if normalized_rule == "RELAY_REQUEST" and command_head.lower() == "echo":
        return 'echo "<요청문>" | nc <host> <port>'
    if example_medium:
        return example_medium
    if example_strong:
        return _generalize_shell_command(example_strong)
    return f"{command_head} [옵션] <대상>"


def _generalize_shell_command(command: str) -> str:
    low = (command or "").strip().lower()
    if low.startswith("echo "):
        if "| nc " in low and ">" in low:
            return 'echo "<메시지>" | nc <host> <port> > <output_file>'
        if "| nc " in low:
            return 'echo "<메시지>" | nc <host> <port>'
        return 'echo "<문자열>"'
    head = (command or "").strip().split(" ")[0] if (command or "").strip() else "명령어"
    return f"{head} [옵션] <대상>"


def _fallback_response(request: HintGenerateRequest) -> HintGenerateResponse:
    hint_level = resolve_hint_level(
        request.fail_count_after_action, request.repeat_count_after_action, request.low_confidence
    )
    top = request.evidences[0] if request.evidences else None
    expected_input = None
    if top and top.metadata:
        value = top.metadata.get("expected_input")
        expected_input = str(value) if value is not None else None

    if top is None:
        hint_text = "현재 노드에서 가능한 행동 유형을 다시 확인하고 직전 행동을 한 단계씩 복기해봐."
    elif hint_level == "LOW_CONFIDENCE":
        hint_text = "근거 신뢰도가 낮아서 정답 단정은 어렵다. 같은 행동 타입으로 입력 형식을 점검해봐."
    elif hint_level == "LIGHT":
        hint_text = f"핵심 행동 타입은 {top.action_type or 'action'}다. 입력 대상과 형식을 먼저 다시 확인해봐."
    elif hint_level == "MEDIUM":
        if expected_input:
            hint_text = (
                f"지금 노드의 정답 경로는 {top.action_type or 'action'}다. "
                f"입력 형식을 다음 단서에 맞춰봐: {expected_input}"
            )
        else:
            hint_text = f"지금 노드는 {top.action_type or 'action'} 동작이 핵심이다. 입력 형식을 더 정확히 맞춰봐."
    else:
        if expected_input:
            hint_text = f"정답 행동은 {top.action_type or 'action'}이고, 시도할 값은 `{expected_input}`다."
        else:
            hint_text = f"정답 행동은 {top.action_type or 'action'}다."

    return HintGenerateResponse(
        hint_text=hint_text,
        hint_level=hint_level,
        model=settings.gms_llm_model.removeprefix("models/"),
    )
def _sanitize_user_message(user_message: str | None) -> str | None:
    if user_message is None:
        return None
    normalized = user_message.strip()
    if not normalized:
        return None
    max_len = max(1, settings.hint_user_message_max_length)
    return normalized[:max_len]


def _build_repeat_text(
    *,
    user_message: str | None,
    current_input: str | None,
    recent_actions: list[dict],
    from_node_id: str,
) -> str | None:
    normalized_message = _normalize_repeat_message(user_message)
    normalized_current_input = _normalize_repeat_message(current_input)
    if normalized_current_input and not _is_scoped_current_input(
        current_input=current_input,
        recent_actions=recent_actions,
        from_node_id=from_node_id,
    ):
        normalized_current_input = None

    if normalized_message and normalized_current_input:
        if _is_too_short_repeat_text(normalized_message) and _is_too_short_repeat_text(
            normalized_current_input
        ):
            return None
        return f"user_message={normalized_message}\ncurrent_input={normalized_current_input}"

    if normalized_message:
        if _is_too_short_repeat_text(normalized_message):
            return None
        return f"user_message={normalized_message}"

    if normalized_current_input:
        if _is_too_short_repeat_text(normalized_current_input):
            return None
        return f"current_input={normalized_current_input}"

    return None


def _normalize_repeat_message(text: str) -> str | None:
    normalized = text.strip().lower()
    if not normalized:
        return None

    # Keep expressive tone hints while reducing excessive repetition noise.
    normalized = re.sub(r"([a-zA-Z가-힣])\1{2,}", r"\1\1", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    # Remove punctuation/symbols while preserving Korean/English letters and digits.
    normalized = re.sub(r"[^0-9a-zA-Z가-힣\s]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        return None

    filler_tokens = {
        "아니",
        "그니까",
        "그러니까",
        "좀",
        "진짜",
        "제발",
        "어",
        "음",
        "uh",
        "umm",
        "well",
        "just",
        "please",
    }
    tokens = [token for token in normalized.split(" ") if token]
    if not tokens:
        return None

    filtered = [token for token in tokens if token not in filler_tokens]
    compact = " ".join(filtered if filtered else tokens).strip()
    return compact or None
def _is_scoped_current_input(
    *,
    current_input: str | None,
    recent_actions: list[dict],
    from_node_id: str,
) -> bool:
    if not current_input:
        return False
    current = current_input.strip()
    if not current:
        return False
    node_scope = (from_node_id or "").strip().upper()
    for action in recent_actions or []:
        action_node = str(action.get("from_node_id") or "").strip().upper()
        if node_scope and action_node != node_scope:
            continue
        action_input = str(action.get("input_value_norm") or "").strip()
        if action_input == current:
            return True
    return False


def _is_too_short_repeat_text(text: str) -> bool:
    compact = re.sub(r"\s+", "", text or "")
    return len(compact) <= 3


def _normalize_message_type(raw_value: object) -> str:
    value = str(raw_value or "").strip().lower()
    if value in {"hint_question", "lore_question", "other"}:
        return value
    return "hint_question"


def _normalize_intent_subtype(raw_value: object, message_type: str) -> str:
    value = str(raw_value or "").strip().lower()
    if value in {"progress_hint", "command_usage", "lore", "other"}:
        return value
    if message_type == "lore_question":
        return "lore"
    if message_type == "other":
        return "other"
    return "progress_hint"


def _looks_like_command_usage_question(text: str) -> bool:
    normalized = (text or "").strip().lower()
    if not normalized:
        return False

    # "그게/이거 무슨 명령어" 같은 지시어 후속 질문은 진행 힌트 후속 질문으로 본다.
    # `\b` 경계는 한글에서 오탐/미탐이 생길 수 있어 단순 포함 기반으로 처리한다.
    deictic_followup = bool(re.search(r"(그게|그거|이거|저거)", normalized))

    explicit_usage_patterns = [
        r"사용법",
        r"어떻게\s*(써|쓰)",
        r"옵션",
        r"예시",
        r"문법",
        r"설명",
        r"뜻",
        r"\bhelp\b",
        r"\bman\b",
    ]
    has_usage_word = any(re.search(p, normalized) for p in explicit_usage_patterns)

    has_command_word = bool(re.search(r"(명령어|커맨드)", normalized))
    has_q_word = bool(re.search(r"(뭐야|뭔데|무엇|뭐더라|알려|가르쳐)", normalized))
    has_explicit_command_head = bool(re.search(r"\b[a-z][a-z0-9_-]{1,31}\b", normalized))

    if has_explicit_command_head and (has_usage_word or has_command_word):
        return True

    if has_usage_word and not deictic_followup:
        return True

    if has_command_word and has_q_word and not deictic_followup:
        return True

    return False
def _route_decision_from_message_type(message_type: str) -> str:
    if message_type == "hint_question":
        return "RAG_HINT"
    return "BLOCKED_NON_HINT"


