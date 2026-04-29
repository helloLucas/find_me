from __future__ import annotations

import json
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException

from app.config import get_settings
from app.gms_client import GmsLlmClient
from app.prompt_builder import build_prompt, resolve_hint_level
from app.retrieval_formatter import render_query_text
from app.schemas import (
    EvidenceItem,
    HintGenerateRequest,
    HintGenerateResponse,
    HintRetrieveRequest,
    HintRetrieveResponse,
    NextActionCheck,
)
from app.vector_search import VectorSearchRepository

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.gms_key:
        raise RuntimeError("GMS_KEY is not configured. Set it in environment or .env")
    app.state.gms_client = GmsLlmClient(settings)
    app.state.vector_repo = VectorSearchRepository(settings)
    try:
        yield
    finally:
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
    prompt = build_prompt(request)
    llm: GmsLlmClient = app.state.gms_client

    try:
        raw_text = await llm.generate_text(prompt)
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
        return _fallback_response(request)

    try:
        response = HintGenerateResponse(
            hint_text=parsed["hint_text"],
            hint_level=parsed["hint_level"],
            why_this_hint=parsed.get("why_this_hint", ""),
            next_action_check=NextActionCheck(**(parsed.get("next_action_check") or {})),
            used_transition_ids=[int(x) for x in parsed.get("used_transition_ids", []) if x is not None],
            model=settings.gms_llm_model.removeprefix("models/"),
        )
    except Exception:
        return _fallback_response(request)

    if not response.hint_text.strip() or not response.hint_level.strip():
        return _fallback_response(request)

    return response


@app.post("/v1/hints/retrieve", response_model=HintRetrieveResponse)
async def retrieve_hint_evidence(request: HintRetrieveRequest) -> HintRetrieveResponse:
    llm: GmsLlmClient = app.state.gms_client
    repo: VectorSearchRepository = app.state.vector_repo
    output_dim = request.output_dimensionality or settings.gms_embedding_output_dimensionality
    search_top_k = request.search_top_k or settings.retrieve_default_search_top_k
    evidence_limit = request.evidence_limit or settings.retrieve_default_evidence_limit
    min_similarity = request.min_similarity or settings.retrieve_default_min_similarity

    query_text = render_query_text(
        chapter_id=request.chapter_id,
        from_node_id=request.from_node_id,
        action_type=request.action_type,
        current_input=request.current_input,
        fail_count_after_action=request.fail_count_after_action,
        expected_action_type=request.expected_action_type,
        expected_input_hint=request.expected_input_hint,
        recent_actions=request.recent_actions,
        extra_context=request.extra_context,
        es_signal=request.es_signal,
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

    vector_literal = "[" + ",".join(str(v) for v in vector) + "]"
    phase, selected, low_confidence = repo.search(
        query_vector=vector_literal,
        chapter_code=request.chapter_id,
        from_node_code=request.from_node_id,
        action_type=request.action_type,
        search_top_k=search_top_k,
        evidence_limit=evidence_limit,
        min_similarity=min_similarity,
    )
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
        selected_phase=phase,
        low_confidence=low_confidence,
        query_vector_dimension=len(vector),
        query_text=query_text,
        candidate_count=len(selected),
        evidences=evidence_items,
    )


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


def _to_int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _to_text(value) -> str | None:
    return None if value is None else str(value)


def _fallback_response(request: HintGenerateRequest) -> HintGenerateResponse:
    hint_level = resolve_hint_level(request.fail_count_after_action, request.low_confidence)
    top = request.evidences[0] if request.evidences else None
    expected_input = None
    if top and top.metadata:
        value = top.metadata.get("expected_input")
        expected_input = str(value) if value is not None else None

    if top is None:
        hint_text = "현재 노드에서 가능한 행동 유형을 다시 확인하고 직전 행동을 한 단계씩 복기해보세요."
        action_type = request.action_type
    elif hint_level == "LOW_CONFIDENCE":
        hint_text = "근거 신뢰도가 낮아 정답 단정은 어렵습니다. 같은 행동 타입으로 입력 형식을 점검해보세요."
        action_type = top.action_type or request.action_type
    elif hint_level == "LIGHT":
        hint_text = f"핵심 행동 타입은 {top.action_type or 'action'} 입니다. 입력 대상과 형식을 먼저 다시 확인해보세요."
        action_type = top.action_type or request.action_type
    elif hint_level == "MEDIUM":
        if expected_input:
            hint_text = (
                f"지금 노드의 정답 경로는 {top.action_type or 'action'} 입니다. "
                f"입력 형식을 다음 단서에 맞춰보세요: {expected_input}"
            )
        else:
            hint_text = f"지금 노드는 {top.action_type or 'action'} 동작이 핵심입니다. 입력 형식을 더 정확히 맞춰보세요."
        action_type = top.action_type or request.action_type
    else:
        if expected_input:
            hint_text = f"정답 행동은 {top.action_type or 'action'} 이고, 시도할 값은 `{expected_input}` 입니다."
        else:
            hint_text = f"정답 행동은 {top.action_type or 'action'} 입니다."
        action_type = top.action_type or request.action_type

    used_transition_ids = [top.transition_id] if top and top.transition_id is not None else []

    return HintGenerateResponse(
        hint_text=hint_text,
        hint_level=hint_level,
        why_this_hint="fallback_generated",
        next_action_check=NextActionCheck(
            action_type=action_type,
            input_pattern=expected_input,
        ),
        used_transition_ids=used_transition_ids,
        model=settings.gms_llm_model.removeprefix("models/"),
    )
