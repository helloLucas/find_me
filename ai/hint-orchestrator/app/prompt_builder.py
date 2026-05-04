from __future__ import annotations

import json
from typing import Any

from app.config import get_settings
from app.schemas import HintGenerateRequest


def resolve_hint_level(fail_count_after_action: int, low_confidence: bool) -> str:
    settings = get_settings()
    if low_confidence:
        return "LOW_CONFIDENCE"
    if fail_count_after_action >= settings.hint_level_strong_fail_threshold:
        return "STRONG"
    if fail_count_after_action >= settings.hint_level_medium_fail_threshold:
        return "MEDIUM"
    return "LIGHT"


def build_prompt(request: HintGenerateRequest) -> str:
    hint_level = resolve_hint_level(request.fail_count_after_action, request.low_confidence)
    payload = _to_prompt_payload(request, hint_level)
    payload_json = json.dumps(payload, ensure_ascii=False, indent=2)

    return (
        "입력 컨텍스트(JSON):\n"
        f"{payload_json}\n\n"
        "반드시 JSON 객체 하나만 출력해라. 마크다운 금지.\n"
        "{\n"
        '  "hint_text": "string",\n'
        '  "hint_level": "LOW_CONFIDENCE|LIGHT|MEDIUM|STRONG",\n'
        '  "why_this_hint": "string",\n'
        '  "next_action_check": {"action_type":"string|null","input_pattern":"string|null"},\n'
        '  "used_transition_ids": [number]\n'
        "}"
    )


def _to_prompt_payload(request: HintGenerateRequest, hint_level: str) -> dict[str, Any]:
    return {
        "policy": {
            "hint_level": hint_level,
            "instruction_tone": _instruction_tone(hint_level),
            "phase": request.selected_phase,
            "low_confidence": request.low_confidence,
        },
        "runtime": {
            "session_id": request.session_id,
            "user_id": request.user_id,
            "chapter_code": request.chapter_code,
            "from_node_code": request.from_node_code,
            "action_type": request.action_type,
            "fail_count_after_action": request.fail_count_after_action,
        },
        "user_message": request.user_message,
        "query_text": request.query_text,
        "evidences": [item.model_dump() for item in request.evidences],
        "es_signal": request.es_signal.model_dump() if request.es_signal else None,
    }


def _instruction_tone(hint_level: str) -> str:
    if hint_level == "LOW_CONFIDENCE":
        return "정답을 직접 말하지 말고, 탐색 방향만 짧게 제시"
    if hint_level == "LIGHT":
        return "정답을 직접 말하지 말고, 부드럽고 간단한 방향 힌트"
    if hint_level == "MEDIUM":
        return "정답을 직접 말하지 말고 핵심 단서를 한 단계 더 구체화"
    return "필요 시 구체 입력 패턴을 말하듯이 자연스럽게 제시"
