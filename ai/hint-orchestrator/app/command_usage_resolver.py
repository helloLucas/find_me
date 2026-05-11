from __future__ import annotations

import re
from typing import Any

from app.prompt_builder import resolve_command_usage_examples_from_metadata


def resolve_command_usage_context(
    *,
    user_message: str | None,
    from_node_code: str | None,
    candidates: list[Any],
    high_confidence: float,
    medium_confidence: float,
) -> dict[str, Any] | None:
    if not candidates:
        return None

    query = (user_message or "").strip().lower()
    query_tokens = _tokenize(query)
    asked_command_head = _extract_explicit_command_head(query)
    from_node_scope = (from_node_code or "").strip().upper()

    merged: dict[str, dict[str, Any]] = {}
    for candidate in candidates:
        metadata = _metadata_of(candidate)
        action_type = str(metadata.get("action_type") or "").strip().lower()
        if action_type and action_type != "command":
            continue

        examples = resolve_command_usage_examples_from_metadata(metadata, action_type="command")
        command_head = str(examples.get("command_head") or "").strip().lower()
        if not command_head:
            continue

        signature = _signature(command_head, examples)
        retrieval_similarity = _clamp01(_similarity_of(candidate))
        semantic_score = _semantic_score(
            query=query,
            query_tokens=query_tokens,
            command_head=command_head,
            examples=examples,
            retrieval_similarity=retrieval_similarity,
            asked_command_head=asked_command_head,
        )
        priority_norm = _priority_norm(metadata, candidate)
        node_bonus = _node_bonus(metadata, from_node_scope)
        score = _clamp01((0.75 * semantic_score) + (0.15 * retrieval_similarity) + (0.10 * priority_norm) + node_bonus)

        resolved = {
            "command_head": command_head,
            "rule": examples.get("rule"),
            "example_strong": examples.get("example_strong"),
            "example_medium": examples.get("example_medium"),
            "score": round(score, 4),
            "from_node_match": node_bonus > 0,
            "transition_id": metadata.get("transition_id"),
        }

        previous = merged.get(signature)
        if previous is None or float(previous.get("score") or 0.0) < score:
            merged[signature] = resolved

    if not merged:
        if asked_command_head:
            return {
                "resolver_confidence": 0.0,
                "asked_command_head": asked_command_head,
                "resolved_candidates": [],
            }
        return None

    ranked = sorted(
        merged.values(),
        key=lambda item: (
            float(item.get("score") or 0.0),
            bool(item.get("from_node_match")),
            int(item.get("transition_id") or 0),
        ),
        reverse=True,
    )
    top_score = float(ranked[0].get("score") or 0.0)
    limit = _candidate_limit(top_score, high_confidence, medium_confidence)

    return {
        "resolver_confidence": round(top_score, 4),
        "asked_command_head": asked_command_head,
        "resolved_candidates": ranked[:limit],
    }


def _signature(command_head: str, examples: dict[str, Any]) -> str:
    rule = str(examples.get("rule") or "").strip().upper()
    medium = str(examples.get("example_medium") or "").strip().lower()
    return f"{command_head}|{rule}|{medium}"


def _semantic_score(
    *,
    query: str,
    query_tokens: set[str],
    command_head: str,
    examples: dict[str, Any],
    retrieval_similarity: float,
    asked_command_head: str | None,
) -> float:
    if asked_command_head and command_head == asked_command_head:
        return 1.0

    if not query:
        return max(0.35, retrieval_similarity)

    if command_head and re.search(rf"(?<![a-z0-9_]){re.escape(command_head)}(?![a-z0-9_])", query):
        return 1.0

    profile_text = " ".join(
        str(v) for v in [examples.get("example_strong"), examples.get("example_medium"), examples.get("rule")] if v
    ).lower()
    profile_tokens = _tokenize(profile_text)
    if not query_tokens:
        return max(0.35, retrieval_similarity)
    if not profile_tokens:
        return 0.2

    overlap = len(query_tokens & profile_tokens)
    if overlap == 0:
        return max(0.15, retrieval_similarity * 0.8)

    # Dice coefficient variant to keep scores stable with short command-like inputs.
    score = (2.0 * overlap) / (len(query_tokens) + len(profile_tokens))
    return _clamp01(score)


def _extract_explicit_command_head(query: str) -> str | None:
    if not query:
        return None

    # e.g. "tar 명령어 설명해줘"
    m = re.search(r"(?<![a-z0-9_])([a-z][a-z0-9_-]{1,31})\s*명령어", query)
    if m:
        return m.group(1)

    # e.g. "cat 어떻게 써?"
    for token in re.findall(r"[a-z][a-z0-9_-]{1,31}", query):
        if token in {"help", "option", "options"}:
            continue
        return token
    return None
def _candidate_limit(score: float, high_confidence: float, medium_confidence: float) -> int:
    if score >= high_confidence:
        return 1
    if score >= medium_confidence:
        return 2
    return 3


def _tokenize(text: str) -> set[str]:
    if not text:
        return set()
    return {m.group(0) for m in re.finditer(r"[a-z0-9_+-]{2,}", text)}


def _metadata_of(candidate: Any) -> dict[str, Any]:
    metadata = getattr(candidate, "metadata", None)
    return metadata if isinstance(metadata, dict) else {}


def _similarity_of(candidate: Any) -> float:
    value = getattr(candidate, "similarity", 0.0)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _priority_norm(metadata: dict[str, Any], candidate: Any) -> float:
    raw_priority = metadata.get("priority", getattr(candidate, "priority", 0))
    try:
        priority = float(raw_priority)
    except (TypeError, ValueError):
        return 0.0
    if priority <= 0:
        return 0.0
    return _clamp01(priority / 100.0)


def _node_bonus(metadata: dict[str, Any], scope: str) -> float:
    if not scope:
        return 0.0
    from_node = str(metadata.get("from_node_code") or "").strip().upper()
    if not from_node:
        return 0.0
    return 0.05 if from_node == scope else 0.0


def _clamp01(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 1:
        return 1.0
    return value

