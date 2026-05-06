from __future__ import annotations

import json
import re
from typing import Any

from app.config import get_settings
from app.schemas import EvidenceItem, HintGenerateRequest


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
        '  "next_action_check": {"action_type":"string|null"}\n'
        "}"
    )


def _to_prompt_payload(request: HintGenerateRequest, hint_level: str) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "policy": {
            "hint_level": hint_level,
            "instruction_tone": _instruction_tone(hint_level),
            "phase": request.selected_phase,
            "low_confidence": request.low_confidence,
        },
        "runtime": {
            "chapter_code": request.chapter_code,
            "from_node_code": request.from_node_code,
            "action_type": request.action_type,
            "fail_count_after_action": request.fail_count_after_action,
        },
        "user_message": request.user_message,
        "query_context_excerpt": _compact_query_text(request.query_text),
        "evidences": [_compact_evidence(item, hint_level) for item in request.evidences],
    }
    if request.es_signal:
        payload["es_signal"] = request.es_signal.model_dump()
    return payload


def _compact_query_text(query_text: str | None) -> str | None:
    if not query_text:
        return None

    keep_prefixes = (
        "current_input:",
        "expected_action_type:",
    )
    lines = [line.strip() for line in query_text.splitlines() if line.strip()]
    kept: list[str] = []
    for line in lines:
        if line.startswith(keep_prefixes):
            kept.append(line)

    recent_commands = _extract_recent_command_lines(lines, limit=3)
    if recent_commands:
        kept.append("recent_commands:")
        kept.extend(recent_commands)

    return "\n".join(kept) if kept else None


def _extract_recent_command_lines(lines: list[str], limit: int) -> list[str]:
    if not lines or limit <= 0:
        return []

    in_recent_actions = False
    commands: list[str] = []
    for line in lines:
        if line == "recent_actions:":
            in_recent_actions = True
            continue
        if in_recent_actions and line == "es_signals:":
            break
        if not in_recent_actions:
            continue
        if "action_type=command" not in line:
            continue

        commands.append(line)
        if len(commands) >= limit:
            break

    return commands


def _compact_evidence(item: EvidenceItem, hint_level: str) -> dict[str, Any]:
    metadata = item.metadata or {}
    expected_value = _resolve_expected_input_value(metadata, hint_level, item.action_type)
    metadata_min = {
        "expected_input": expected_value,
        "priority_rank": metadata.get("priority_rank"),
    }
    content = _rewrite_content_expected_input(item.content, expected_value)

    return {
        "action_type": item.action_type,
        "similarity": item.similarity,
        "priority_rank": item.priority_rank,
        "content": content,
        "metadata": metadata_min,
    }


def _resolve_expected_input_value(
    metadata: dict[str, Any],
    hint_level: str,
    action_type: str | None,
) -> str | None:
    raw_expected = _safe_str(metadata.get("expected_input"))
    config = _as_dict(metadata.get("validator_config"))

    rule = str(config.get("rule") or "").strip().upper() if config else ""
    exact_value = _resolve_expected_input_exact(raw_expected, config, rule)
    return _adapt_expected_input_by_hint_level(
        raw_expected=raw_expected,
        exact_value=exact_value,
        rule=rule,
        hint_level=hint_level,
        action_type=action_type,
        command_from_config=_safe_str(config.get("command")) if config else None,
    )


def _resolve_expected_input_exact(raw_expected: str | None, config: dict[str, Any], rule: str) -> str | None:
    if not config:
        return raw_expected if _looks_like_command_text(raw_expected) else None

    if rule == "NORMALIZED_COMMAND":
        return _build_command_from_config(config)

    if rule == "VIRTUAL_FS_COMMAND":
        command = _safe_str(config.get("command"))
        resolved_path = _normalize_hint_path(_safe_str(config.get("resolvedPath")))
        if command and resolved_path:
            return f"{command} {resolved_path}"
        return _build_command_from_config(config)

    if rule == "FIND_TMP_COMMAND":
        return 'find . -name "*.tmp"'

    if rule == "PARSED_TAR_COMMAND":
        output_file = _safe_str(config.get("outputFile")) or "bundle.tar"
        required_files = [_normalize_hint_path(_safe_str(v)) for v in _as_list(config.get("requiredFiles"))]
        required_files = [v for v in required_files if v]
        if required_files:
            return f"tar -cvf {output_file} " + " ".join(required_files)
        return f"tar -cvf {output_file} <files>"

    if rule == "NC_SEND_FILE":
        host = _safe_str(config.get("host")) or "<host>"
        port = _safe_str(config.get("port")) or "<port>"
        stdin_file = _normalize_hint_path(_safe_str(config.get("stdinFile")) or "<file>")
        return f"nc {host} {port} < {stdin_file}"

    if rule == "CHAINED_COMMAND":
        operator = _safe_str(config.get("operator")) or "&&"
        commands = []
        for c in _as_list(config.get("commands")):
            part = _build_command_from_config(_as_dict(c))
            if part:
                commands.append(part)
        if commands:
            return f" {operator} ".join(commands)
        return None

    if rule == "AUTO_SYSTEM":
        return "auto"

    return _build_command_from_config(config) or (raw_expected if _looks_like_command_text(raw_expected) else None)


def _adapt_expected_input_by_hint_level(
    raw_expected: str | None,
    exact_value: str | None,
    rule: str,
    hint_level: str,
    action_type: str | None,
    command_from_config: str | None,
) -> str | None:
    level = (hint_level or "").upper()
    action = (action_type or "").strip().lower()

    if level == "STRONG":
        return exact_value or raw_expected or _generic_expected_label(action)

    if level == "MEDIUM":
        by_rule = _medium_pattern_by_rule(rule, command_from_config)
        if by_rule:
            return by_rule
        if _looks_like_command_text(raw_expected):
            return _generalize_command_text(raw_expected)
        return _generic_expected_label(action)

    # LOW_CONFIDENCE / LIGHT
    by_rule = _light_label_by_rule(rule, command_from_config)
    if by_rule:
        return by_rule
    if _looks_like_command_text(raw_expected):
        head = _command_head(raw_expected)
        return f"{head} 계열 명령" if head else _generic_expected_label(action)
    return _generic_expected_label(action)


def _light_label_by_rule(rule: str, command_from_config: str | None) -> str | None:
    if rule == "PARSED_TAR_COMMAND":
        return "파일 묶음 생성 명령"
    if rule == "FIND_TMP_COMMAND":
        return "파일 탐색 명령"
    if rule == "NC_SEND_FILE":
        return "파일 전송 명령"
    if rule == "CHAINED_COMMAND":
        return "연속 정리 명령"
    if rule == "AUTO_SYSTEM":
        return "자동 진행 동작"
    if rule in {"NORMALIZED_COMMAND", "VIRTUAL_FS_COMMAND"}:
        if command_from_config:
            return f"{command_from_config} 계열 명령"
        return "다음 단계 명령"
    return None


def _medium_pattern_by_rule(rule: str, command_from_config: str | None) -> str | None:
    if rule == "PARSED_TAR_COMMAND":
        return "tar <옵션> <아카이브이름>.tar <대상들>"
    if rule == "FIND_TMP_COMMAND":
        return 'find . -name "<패턴>"'
    if rule == "NC_SEND_FILE":
        return "nc <host> <port> < <file>"
    if rule == "CHAINED_COMMAND":
        return "<명령1> && <명령2>"
    if rule == "AUTO_SYSTEM":
        return "auto"
    if rule in {"NORMALIZED_COMMAND", "VIRTUAL_FS_COMMAND"} and command_from_config:
        return f"{command_from_config} <대상>"
    return None


def _generalize_command_text(command: str) -> str:
    head = _command_head(command)
    if not head:
        return "다음 단계 명령"
    low = command.strip().lower()
    if low.startswith("tar "):
        return "tar <옵션> <아카이브이름>.tar <대상들>"
    if low.startswith("find ") and " -name " in low:
        return 'find . -name "<패턴>"'
    if low.startswith("nc "):
        return "nc <host> <port> < <file>"
    return f"{head} <대상>"


def _command_head(command: str | None) -> str | None:
    if not command:
        return None
    text = command.strip()
    if not text:
        return None
    return text.split()[0]


def _generic_expected_label(action: str) -> str:
    if action == "command":
        return "다음 단계 명령"
    if action == "click":
        return "다음 단계 UI 동작"
    if action == "system":
        return "다음 단계 시스템 동작"
    return "다음 단계 행동"


def _rewrite_content_expected_input(content: str | None, expected_value: str | None) -> str | None:
    if not content:
        return content
    if expected_value is None:
        return content
    value = expected_value
    return re.sub(r"expected_input=[^;]+", f"expected_input={value}", content)


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            loaded = json.loads(value)
            if isinstance(loaded, dict):
                return loaded
            if isinstance(loaded, str):
                loaded2 = json.loads(loaded)
                return loaded2 if isinstance(loaded2, dict) else {}
            return {}
        except json.JSONDecodeError:
            return {}
    return {}


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    return []


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_hint_path(path: str | None) -> str | None:
    if not path:
        return path
    if path.startswith("/home/guest/"):
        return "./" + path[len("/home/guest/") :]
    return path


def _build_command_from_config(config: dict[str, Any]) -> str | None:
    if not config:
        return None
    command = _safe_str(config.get("command"))
    if not command:
        return None

    args = [_safe_str(v) for v in _as_list(config.get("args"))]
    args = [a for a in args if a]

    resolved_path = _normalize_hint_path(_safe_str(config.get("resolvedPath")))
    if resolved_path:
        args.append(resolved_path)

    return " ".join([command, *args]).strip()


def _looks_like_command_text(value: str | None) -> bool:
    if not value:
        return False
    text = value.strip()
    if not text:
        return False
    if " " in text:
        return True
    if any(ch in text for ch in ('"', "'", "/", ".", "-", "<", ">", "|", "&", "=")):
        return True
    return False


def _instruction_tone(hint_level: str) -> str:
    if hint_level == "LOW_CONFIDENCE":
        return "정답을 직접 말하지 말고, 탐색 방향만 짧게 제시"
    if hint_level == "LIGHT":
        return "정답을 직접 말하지 말고, 부드럽고 간단한 방향 힌트"
    if hint_level == "MEDIUM":
        return "정답을 직접 말하지 말고 핵심 단서를 한 단계 더 구체화"
    return "필요 시 구체 입력 패턴을 말하듯이 자연스럽게 제시"
