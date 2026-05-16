from __future__ import annotations

import json
import math
from typing import Any

import redis.asyncio as redis

from app.config import get_settings

_redis_client: redis.Redis | None = None
_memory_state: dict[str, dict[str, Any]] = {}


async def init_redis() -> None:
    global _redis_client
    settings = get_settings()
    try:
        client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password or None,
            decode_responses=True,
            socket_connect_timeout=1.5,
            socket_timeout=1.5,
        )
        await client.ping()
        _redis_client = client
    except Exception:
        _redis_client = None


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
    _redis_client = None


async def get_pattern_embedding(cache_key: str) -> list[float] | None:
    global _redis_client
    redis_key = f"lucas:hint:pattern-embed:{cache_key}"
    if _redis_client is not None:
        try:
            raw = await _redis_client.get(redis_key)
            parsed = _parse_vector(raw)
            if parsed:
                return parsed
        except Exception:
            pass

    state = _memory_state.get(redis_key)
    if not state:
        return None
    return _safe_vector(state.get("vector"))


async def set_pattern_embedding(
    cache_key: str,
    embedding: list[float],
    *,
    ttl_seconds: int,
) -> None:
    global _redis_client
    redis_key = f"lucas:hint:pattern-embed:{cache_key}"
    ttl = _resolve_ttl_seconds(ttl_seconds)

    if _redis_client is not None:
        try:
            await _redis_client.setex(redis_key, ttl, json.dumps(embedding))
            return
        except Exception:
            pass

    _memory_state[redis_key] = {"vector": embedding}


async def get_one_time_hint_served(
    *,
    session_id: str,
    chapter_code: str,
    hint_key: str,
) -> bool:
    global _redis_client
    redis_key = _one_time_hint_key(session_id=session_id, chapter_code=chapter_code, hint_key=hint_key)
    if _redis_client is not None:
        try:
            raw = await _redis_client.get(redis_key)
            return str(raw).strip().lower() == "1"
        except Exception:
            pass
    state = _memory_state.get(redis_key)
    return bool(state and state.get("served") is True)


async def set_one_time_hint_served(
    *,
    session_id: str,
    chapter_code: str,
    hint_key: str,
    ttl_seconds: int,
) -> None:
    global _redis_client
    redis_key = _one_time_hint_key(session_id=session_id, chapter_code=chapter_code, hint_key=hint_key)
    ttl = _resolve_ttl_seconds(ttl_seconds)
    if _redis_client is not None:
        try:
            await _redis_client.setex(redis_key, ttl, "1")
            return
        except Exception:
            pass
    _memory_state[redis_key] = {"served": True}


async def next_ch4_strong_cycle(
    *,
    session_id: str,
    chapter_code: str,
    from_node_code: str,
    ttl_seconds: int,
) -> int:
    global _redis_client
    scope = _scope_key(session_id, chapter_code, from_node_code)
    redis_key = f"lucas:hint:ch4:strong-cycle:{scope}"
    ttl = _resolve_ttl_seconds(ttl_seconds)

    if _redis_client is not None:
        try:
            next_value = int(await _redis_client.incr(redis_key))
            if next_value == 1:
                await _redis_client.expire(redis_key, ttl)
            return next_value
        except Exception:
            pass

    previous = _memory_state.get(redis_key, {}).get("count")
    try:
        prev_value = int(previous)
    except Exception:
        prev_value = 0
    next_value = max(0, prev_value) + 1
    _memory_state[redis_key] = {"count": next_value}
    return next_value


async def check_and_update_repeat_count(
    *,
    session_id: str,
    chapter_code: str,
    from_node_code: str,
    current_vector: list[float],
) -> int:
    settings = get_settings()
    scope_key = _scope_key(session_id, chapter_code, from_node_code)
    node_tracker_key = f"lucas:hint:last-node:{_safe_key(session_id)}:{_safe_key(chapter_code)}"
    vector_key = f"lucas:hint:qembed:{scope_key}"
    count_key = f"lucas:hint:qrepeat:{scope_key}"
    threshold = settings.hint_repeat_similarity_threshold
    ttl_seconds = _resolve_ttl_seconds(settings.hint_repeat_ttl_seconds)

    await _cleanup_previous_node_keys(
        node_tracker_key=node_tracker_key,
        session_id=session_id,
        chapter_code=chapter_code,
        current_node_code=from_node_code,
        ttl_seconds=ttl_seconds,
    )

    previous_vector, previous_count = await _load_state(vector_key, count_key)
    next_count = 0

    if previous_vector:
        similarity = _cosine_similarity(previous_vector, current_vector)
        if similarity >= threshold:
            next_count = previous_count + 1

    await _save_state(
        vector_key,
        count_key,
        current_vector,
        next_count,
        ttl_seconds,
        refresh_ttl_on_update=settings.hint_repeat_sliding_ttl,
    )
    return next_count


async def get_repeat_count(
    *,
    session_id: str,
    chapter_code: str,
    from_node_code: str,
) -> int:
    settings = get_settings()
    scope_key = _scope_key(session_id, chapter_code, from_node_code)
    node_tracker_key = f"lucas:hint:last-node:{_safe_key(session_id)}:{_safe_key(chapter_code)}"
    vector_key = f"lucas:hint:qembed:{scope_key}"
    count_key = f"lucas:hint:qrepeat:{scope_key}"
    ttl_seconds = _resolve_ttl_seconds(settings.hint_repeat_ttl_seconds)

    await _cleanup_previous_node_keys(
        node_tracker_key=node_tracker_key,
        session_id=session_id,
        chapter_code=chapter_code,
        current_node_code=from_node_code,
        ttl_seconds=ttl_seconds,
    )

    _, previous_count = await _load_state(vector_key, count_key)
    return previous_count


async def _load_state(vector_key: str, count_key: str) -> tuple[list[float] | None, int]:
    global _redis_client
    if _redis_client is not None:
        try:
            raw_vector = await _redis_client.get(vector_key)
            raw_count = await _redis_client.get(count_key)
            vector = _parse_vector(raw_vector)
            count = _parse_count(raw_count)
            return vector, count
        except Exception:
            pass

    state = _memory_state.get(vector_key)
    if not state:
        return None, 0
    vector = state.get("vector")
    count = state.get("count")
    return _safe_vector(vector), _parse_count(count)


async def _save_state(
    vector_key: str,
    count_key: str,
    vector: list[float],
    repeat_count: int,
    ttl_seconds: int,
    *,
    refresh_ttl_on_update: bool,
) -> None:
    global _redis_client
    if _redis_client is not None:
        try:
            payload_vector = json.dumps(vector)
            payload_count = str(max(0, repeat_count))
            if refresh_ttl_on_update:
                pipe = _redis_client.pipeline()
                pipe.setex(vector_key, ttl_seconds, payload_vector)
                pipe.setex(count_key, ttl_seconds, payload_count)
                await pipe.execute()
                return

            vector_ttl = await _redis_client.ttl(vector_key)
            count_ttl = await _redis_client.ttl(count_key)
            pipe = _redis_client.pipeline()
            pipe.set(vector_key, payload_vector)
            pipe.set(count_key, payload_count)
            if vector_ttl <= 0:
                pipe.expire(vector_key, ttl_seconds)
            if count_ttl <= 0:
                pipe.expire(count_key, ttl_seconds)
            await pipe.execute()
            return
        except Exception:
            pass

    _memory_state[vector_key] = {"vector": vector, "count": max(0, repeat_count)}


async def _cleanup_previous_node_keys(
    *,
    node_tracker_key: str,
    session_id: str,
    chapter_code: str,
    current_node_code: str,
    ttl_seconds: int,
) -> None:
    global _redis_client
    current_node_safe = _safe_key(current_node_code)
    if _redis_client is not None:
        try:
            previous_node_safe = await _redis_client.get(node_tracker_key)
            if previous_node_safe and previous_node_safe != current_node_safe:
                old_scope = _scope_key(session_id, chapter_code, previous_node_safe)
                old_vector_key = f"lucas:hint:qembed:{old_scope}"
                old_count_key = f"lucas:hint:qrepeat:{old_scope}"
                legacy_vector_key = f"lucas:hint:embed:{old_scope}"
                legacy_count_key = f"lucas:hint:repeat:{old_scope}"
                await _redis_client.delete(old_vector_key, old_count_key, legacy_vector_key, legacy_count_key)
            await _redis_client.setex(node_tracker_key, ttl_seconds, current_node_safe)
            return
        except Exception:
            pass

    memory_previous = _memory_state.get(node_tracker_key, {}).get("node")
    if memory_previous and memory_previous != current_node_safe:
        old_scope = _scope_key(session_id, chapter_code, memory_previous)
        _memory_state.pop(f"lucas:hint:qembed:{old_scope}", None)
        _memory_state.pop(f"lucas:hint:qrepeat:{old_scope}", None)
        _memory_state.pop(f"lucas:hint:embed:{old_scope}", None)
        _memory_state.pop(f"lucas:hint:repeat:{old_scope}", None)
    _memory_state[node_tracker_key] = {"node": current_node_safe}


def _scope_key(session_id: str, chapter_code: str, from_node_code: str) -> str:
    return f"{_safe_key(session_id)}:{_safe_key(chapter_code)}:{_safe_key(from_node_code)}"


def _one_time_hint_key(*, session_id: str, chapter_code: str, hint_key: str) -> str:
    return f"lucas:hint:one-time:{_safe_key(hint_key)}:{_safe_key(session_id)}:{_safe_key(chapter_code)}"


def _safe_key(value: str | None) -> str:
    if not value:
        return "none"
    return "".join(ch.lower() if ch.isalnum() or ch in {"-", "_", ":"} else "_" for ch in value)


def _parse_vector(raw: Any) -> list[float] | None:
    if raw is None:
        return None
    if isinstance(raw, list):
        return _safe_vector(raw)
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return _safe_vector(parsed)
        except Exception:
            return None
    return None


def _safe_vector(value: Any) -> list[float] | None:
    if not isinstance(value, list):
        return None
    out: list[float] = []
    for item in value:
        try:
            out.append(float(item))
        except Exception:
            return None
    return out if out else None


def _parse_count(raw: Any) -> int:
    try:
        return max(0, int(raw))
    except Exception:
        return 0


def _resolve_ttl_seconds(value: Any) -> int:
    try:
        ttl = int(value)
    except Exception:
        ttl = 24 * 60 * 60
    return ttl if ttl > 0 else 24 * 60 * 60


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = 0.0
    norm_left = 0.0
    norm_right = 0.0
    for a, b in zip(left, right):
        dot += a * b
        norm_left += a * a
        norm_right += b * b
    if norm_left <= 0.0 or norm_right <= 0.0:
        return 0.0
    return dot / (math.sqrt(norm_left) * math.sqrt(norm_right))
