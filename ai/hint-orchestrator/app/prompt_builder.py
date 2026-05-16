from __future__ import annotations

import json
import re
from typing import Any

from app.config import get_settings
from app.schemas import EvidenceItem, HintGenerateRequest


def resolve_hint_level(
    fail_count_after_action: int, repeat_count_after_action: int, low_confidence: bool
) -> str:
    settings = get_settings()
    if low_confidence:
        return "LOW_CONFIDENCE"

    stress_score = (fail_count_after_action * settings.hint_stress_fail_weight) + \
                   (repeat_count_after_action * settings.hint_stress_repeat_weight)

    if stress_score >= settings.hint_level_strong_stress_threshold:
        return "STRONG"
    if stress_score >= settings.hint_level_medium_stress_threshold:
        return "MEDIUM"
    return "LIGHT"


def build_prompt(request: HintGenerateRequest) -> str:
    hint_level = resolve_hint_level(
        request.fail_count_after_action, request.repeat_count_after_action, request.low_confidence
    )
    payload = _to_prompt_payload(request, hint_level)
    return json.dumps(payload, ensure_ascii=False, indent=2)


def resolve_command_usage_examples_from_metadata(
    metadata: dict[str, Any] | None,
    action_type: str | None = None,
) -> dict[str, str | None]:
    source = metadata or {}
    config = _as_dict(source.get("validator_config"))
    rule = str(config.get("rule") or "").strip().upper()
    raw_expected = _safe_str(source.get("expected_input"))

    strong = _resolve_expected_input_exact(raw_expected, config, rule)
    strong = _adapt_expected_input_by_hint_level(
        raw_expected=raw_expected,
        exact_value=strong,
        rule=rule,
        hint_level="STRONG",
        action_type=action_type,
        command_from_config=_safe_str(config.get("command")) if config else None,
    )
    medium = _adapt_expected_input_by_hint_level(
        raw_expected=raw_expected,
        exact_value=strong,
        rule=rule,
        hint_level="MEDIUM",
        action_type=action_type,
        command_from_config=_safe_str(config.get("command")) if config else None,
    )

    command_head = _command_head(strong) or _command_head(medium) or _command_head(raw_expected)
    if not command_head:
        command_head = _command_head(_build_command_from_config(config))

    return {
        "rule": rule or None,
        "command_head": command_head,
        "example_strong": strong,
        "example_medium": medium,
        "raw_expected_input": raw_expected,
    }


def _to_prompt_payload(request: HintGenerateRequest, hint_level: str) -> dict[str, Any]:
    intent_subtype = (request.intent_subtype or "progress_hint").strip().lower()

    if intent_subtype == "command_usage":
        query_context_excerpt = None
        evidences_payload: list[dict[str, Any]] = []
    else:
        query_context_excerpt = _compact_query_text(request.query_text)
        current_head = _extract_current_input_head(query_context_excerpt)
        evidences_payload = _build_progress_evidences(
            request.evidences,
            hint_level=hint_level,
            current_command_head=current_head,
        )

    payload: dict[str, Any] = {
        "policy": {
            "hint_level": hint_level,
            "phase": request.selected_phase,
            "intent_subtype": intent_subtype,
            "low_confidence": request.low_confidence,
        },
        "runtime": {
            "chapter_code": request.chapter_code,
            "from_node_code": request.from_node_code,
            "action_type": request.action_type,
            "fail_count_after_action": request.fail_count_after_action,
            "repeat_count_after_action": request.repeat_count_after_action,
        },
        "user_message": request.user_message,
        "query_context_excerpt": query_context_excerpt,
        "evidences": evidences_payload,
    }
    if request.command_usage_context:
        payload["command_usage_context"] = _normalize_command_usage_context(request.command_usage_context)
    if request.es_signal:
        payload["es_signal"] = request.es_signal.model_dump()
    return payload


def _extract_current_input_head(query_context_excerpt: str | None) -> str | None:
    if not query_context_excerpt:
        return None
    for line in query_context_excerpt.splitlines():
        line = line.strip()
        if not line.startswith("current_input:"):
            continue
        value = line.removeprefix("current_input:").strip()
        return _command_head(value)
    return None


def _build_progress_evidences(
    items: list[EvidenceItem],
    *,
    hint_level: str,
    current_command_head: str | None,
) -> list[dict[str, Any]]:
    compacted = [_compact_evidence(item, hint_level) for item in items]
    ordered = _order_progress_evidences(compacted, current_command_head=current_command_head)
    target_count = _target_prompt_evidence_count(hint_level, len(ordered))
    return ordered[:target_count]


def _target_prompt_evidence_count(hint_level: str, total_count: int) -> int:
    if total_count <= 0:
        return 0
    settings = get_settings()
    level = (hint_level or "").upper()
    if level in {"LOW_CONFIDENCE", "LIGHT"}:
        return min(max(1, settings.retrieve_evidence_limit_light), total_count)
    if level == "MEDIUM":
        return min(max(1, settings.retrieve_evidence_limit_medium), total_count)
    return min(max(1, settings.retrieve_evidence_limit_strong), total_count)


def _order_progress_evidences(
    evidences: list[dict[str, Any]],
    *,
    current_command_head: str | None,
) -> list[dict[str, Any]]:
    def sort_key(item: dict[str, Any]) -> tuple[int, int, float]:
        metadata = item.get("metadata") if isinstance(item, dict) else {}
        metadata = metadata if isinstance(metadata, dict) else {}
        expected = _safe_str(metadata.get("expected_input"))
        head = _command_head(expected)
        same_as_current_priority = 0 if (current_command_head and head == current_command_head) else 1

        priority_rank_raw = item.get("priority_rank")
        try:
            priority_rank = int(priority_rank_raw) if priority_rank_raw is not None else 9999
        except Exception:
            priority_rank = 9999

        similarity_raw = item.get("similarity")
        try:
            similarity = float(similarity_raw) if similarity_raw is not None else 0.0
        except Exception:
            similarity = 0.0

        return (same_as_current_priority, priority_rank, -similarity)

    return sorted(evidences, key=sort_key)



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

    recent_commands = _extract_recent_command_lines(lines, limit=2)
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

    return {
        "action_type": item.action_type,
        "similarity": item.similarity,
        "priority_rank": item.priority_rank,
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

    if rule == "DISCOVER_OPEN_PORT":
        return _build_discover_open_port_command(config)

    if rule == "CONNECT_RELAY":
        return _build_connect_relay_command(config)

    if rule == "RELAY_REQUEST":
        return _build_relay_request_command(config, output_required=False)

    if rule == "RELAY_REQUEST_TO_FILE":
        return _build_relay_request_command(config, output_required=True)

    if rule == "VALIDATE_CORE_GROUP_DAT":
        return _build_validate_core_group_dat_command(config)

    if rule == "GPG_OUTPUT_EXISTS":
        return _build_gpg_output_exists_command(config)

    if rule == "FILE_EQUIVALENCE":
        return _build_file_equivalence_command(config)

    if rule == "CONFIRMATION_STREAM_TO_SCRIPT":
        return _build_confirmation_stream_to_script_command(config)

    if rule == "DISCOVER_FILE":
        return _build_discover_file_command(config)

    if rule == "CREATE_FILE_EQUIVALENT":
        return _build_create_file_equivalent_command(config)

    if rule == "FILE_COMPOSITION":
        return _build_file_composition_command(config)

    if rule == "HASH_FILE_CHECK":
        return _build_hash_file_check_command(config)

    if rule == "NORMALIZED_COMMAND":
        normalized = _build_command_from_config(config)
        if normalized:
            return normalized
        accepted_form = _build_command_from_accepted_forms(config)
        if accepted_form:
            return accepted_form
        return None

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
        detected_files = [_normalize_hint_path(_safe_str(v)) for v in _as_list(config.get("detectedFiles"))]
        detected_files = [v for v in detected_files if v]
        protected_included = bool(config.get("protectedFileIncluded"))
        forbidden_files = [_normalize_hint_path(_safe_str(v)) for v in _as_list(config.get("forbiddenFiles"))]
        forbidden_set = {v for v in forbidden_files if v}

        files: list[str] = []
        for path in required_files:
            if path not in files:
                files.append(path)
        if protected_included:
            for path in detected_files:
                if path not in files:
                    files.append(path)
        else:
            files = [path for path in files if path not in forbidden_set]

        if files:
            return f"tar -cvf {output_file} " + " ".join(files)
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
        if exact_value:
            return exact_value
        raw_text = _safe_str(raw_expected)
        if raw_text and _looks_like_command_text(raw_text):
            return raw_text
        return _generic_expected_label(action)

    if level == "MEDIUM":
        if exact_value:
            return exact_value
        raw_text = _safe_str(raw_expected)
        if raw_text:
            head = _command_head(raw_text)
            if head:
                by_head = _medium_pattern_by_command_head(head)
                if by_head:
                    return by_head
            if _looks_like_command_text(raw_text):
                return raw_text
        return _generic_expected_label(action)
    command_candidate = exact_value or raw_expected
    command_head = _command_head(command_candidate) or _command_head(command_from_config)

    # LOW_CONFIDENCE / LIGHT
    by_rule = _light_pattern_by_rule(rule, command_from_config)
    if by_rule:
        return by_rule
    by_head = _light_pattern_by_command_head(command_head)
    if by_head:
        return by_head
    if _looks_like_command_text(command_candidate):
        return _generalize_command_text(command_candidate)
    return _generic_expected_label(action)


def _light_pattern_by_rule(rule: str, command_from_config: str | None) -> str | None:
    if rule == "RELAY_REQUEST":
        return 'echo "<문자열>" | nc <host> <port>'
    if rule == "RELAY_REQUEST_TO_FILE":
        return 'echo "<문자열>" | nc <host> <port> > <출력파일>'
    if rule == "PARSED_TAR_COMMAND":
        return f"tar <옵션> <요구하는 파일명.tar> <대상들...>"
    if rule == "FIND_TMP_COMMAND":
        return f'find <경로> -name "<패턴>"'
    if rule == "NC_SEND_FILE":
        return "nc <host> <port> < <file>"
    if rule == "CHAINED_COMMAND":
        return f"<명령어1> && <명령어2>"
    if rule == "AUTO_SYSTEM":
        return "auto"
    if rule in {"USER_FRAGMENTS_PRESENT", "USER_FRAGMENTS_INCOMPLETE"}:
        return "sh <lucas_route.sh>"
    if rule == "REGEX_FALLBACK":
        return None
    if rule in {"NORMALIZED_COMMAND", "VIRTUAL_FS_COMMAND"} and command_from_config:
        return _light_pattern_by_command_head(_command_head(command_from_config))
    return None

def _medium_pattern_by_rule(rule: str, command_from_config: str | None) -> str | None:
    if rule == "PARSED_TAR_COMMAND":
        return f"tar -cvf <요구하는 파일명.tar> <대상1> <대상2>"
    if rule == "FIND_TMP_COMMAND":
        return f'find <경로> -name "<패턴>"'
    if rule == "NC_SEND_FILE":
        return "nc <host> <port> < <file>"
    if rule == "CHAINED_COMMAND":
        return f"<명령어1> && <명령어2>"
    if rule == "AUTO_SYSTEM":
        return "auto"
    if rule in {"USER_FRAGMENTS_PRESENT", "USER_FRAGMENTS_INCOMPLETE"}:
        return "sh lucas_route.sh"
    if rule == "REGEX_FALLBACK":
        return None
    if rule in {"NORMALIZED_COMMAND", "VIRTUAL_FS_COMMAND"} and command_from_config:
        return _medium_pattern_by_command_head(_command_head(command_from_config))
    return None

def _light_pattern_by_command_head(command_head: str | None) -> str | None:
    head = (command_head or "").lower().strip()
    if not head:
        return None
    if head.startswith("sshnuke_"):
        return "sshnuke <host> --rootpw <password>"
    if head.startswith("mount_"):
        return "mount <소스경로> <마운트경로>"
    if head == "mount":
        return "mount <소스경로> <마운트경로>"
    if head == "ssh":
        return "우리가 권한을 얻어서 뭘 하려 했는지 떠올려봐."
    if head == "sshnuke":
        return "sshnuke <host> --rootpw <password>"
    if head == "execute":
        return "execute <qasm_path>"
    if head == "systemctl":
        return "systemctl <action> <unit>"
    if head == "nmap":
        return f"nmap <옵션> <host>"
    if head == "ls":
        return f"ls <옵션>"
    if head == "find":
        return f"find <경로> <조건>"
    if head == "cat":
        return f"cat <경로>"
    if head == "grep":
        return f"grep <패턴> <경로>"
    if head == "echo":
        return f"echo <문자열>"
    if head == "tar":
        return f"tar <옵션> <압축파일> <대상들...>"
    return f"{head} <옵션> <대상>"

def _medium_pattern_by_command_head(command_head: str | None) -> str | None:
    head = (command_head or "").lower().strip()
    if not head:
        return None
    if head.startswith("mount_"):
        return "mount <소스경로> <마운트경로>"
    if head.startswith("sshnuke_"):
        return "sshnuke <host> --rootpw <password>"
    if head == "ls":
        return f"ls -a[l] <경로>"
    if head == "find":
        return f'find <경로> -name "<패턴>"'
    if head == "cat":
        return f"cat <파일경로>"
    if head == "grep":
        return f"grep -n <패턴> <파일경로>"
    if head == "echo":
        return f"echo <문자열> | <다음명령>"
    if head == "tar":
        return f"tar -cvf <요구하는 파일명.tar> <대상1> <대상2>"
    return f"{head} <옵션> <대상>"

def _generalize_command_text(command: str) -> str:
    head = _command_head(command)
    if not head:
        return f"명령어 <옵션> <대상>"
    low = command.strip().lower()
    if low.startswith("ls"):
        return f"ls <옵션> <경로>"
    if low.startswith("find ") and " -name " in low:
        return f'find <경로> -name "<패턴>"'
    if low.startswith("cat "):
        return f"cat <파일경로>"
    if low.startswith("grep "):
        return f"grep <패턴> <파일경로>"
    if low.startswith("echo ") and "| nc " in low and " > " in low:
        return f'echo "<문자열>" | nc <host> <port> > <출력파일>'
    if low.startswith("echo ") and "| nc " in low:
        return f'echo "<문자열>" | nc <host> <port>'
    if low.startswith("nc "):
        return "nc <host> <port> < <file>"
    if low.startswith("mount"):
        return "mount <소스경로> <마운트경로>"
    if low.startswith("ssh"):
        return "우리가 권한을 얻어서 뭘 하려 했는지 떠올려봐."
    if low.startswith("sshnuke "):
        return "sshnuke <host> --rootpw <password>"
    if low.startswith("sshnuke_"):
        return "sshnuke <host> --rootpw <password>"
    if low.startswith("execute "):
        return "execute <qasm_path>"
    if low.startswith("systemctl "):
        return "systemctl <action> <unit>"
    if low.startswith("nmap "):
        return f"nmap <옵션> <host>"
    if low.startswith("tar "):
        return f"tar <옵션> <압축파일> <대상들...>"
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
        return "명령어"
    if action == "click":
        return "클릭"
    if action == "system":
        return "시스템 동작"
    return "유효한 동작"

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


def _normalize_command_usage_context(context: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = dict(context or {})
    asked = _safe_str(normalized.get("asked_command_head"))
    normalized["asked_command_head"] = asked

    resolved = normalized.get("resolved_candidates")
    if isinstance(resolved, str):
        parsed = _parse_json_loose(resolved)
        if isinstance(parsed, dict):
            resolved = parsed.get("resolved_candidates")
        elif isinstance(parsed, list):
            resolved = parsed

    candidates: list[dict[str, Any]] = []
    if isinstance(resolved, list):
        for item in resolved:
            if not isinstance(item, dict):
                continue
            command_head = _safe_str(item.get("command_head"))
            if not command_head:
                continue
            rule = _safe_str(item.get("rule"))
            example_medium = _safe_str(item.get("example_medium"))
            example_strong = _safe_str(item.get("example_strong"))
            safe_example = _to_safe_command_example(
                rule=rule,
                command_head=command_head,
                example_strong=example_strong,
                example_medium=example_medium,
            )
            candidates.append(
                {
                    "command_head": command_head,
                    "rule": rule,
                    "example_strong": safe_example,
                    "example_medium": example_medium,
                    "score": item.get("score"),
                    "from_node_match": bool(item.get("from_node_match")),
                    "transition_id": item.get("transition_id"),
                }
            )

    normalized["resolved_candidates"] = candidates
    normalized["selected_candidate"] = candidates[0] if candidates else None
    if not normalized.get("asked_command_head") and candidates:
        normalized["asked_command_head"] = _safe_str(candidates[0].get("command_head"))
    return normalized


def _parse_json_loose(value: str) -> Any:
    text = (value or "").strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        left = text.find("{")
        right = text.rfind("}")
        if left != -1 and right > left:
            try:
                return json.loads(text[left : right + 1])
            except json.JSONDecodeError:
                return None
    return None


def _to_safe_command_example(
    *,
    rule: str | None,
    command_head: str,
    example_strong: str | None,
    example_medium: str | None,
) -> str | None:
    normalized_rule = (rule or "").strip().upper()
    if normalized_rule == "RELAY_REQUEST_TO_FILE" and command_head.lower() == "echo":
        return 'echo "<메시지>" | nc <host> <port> > <output_file>'
    if normalized_rule == "RELAY_REQUEST" and command_head.lower() == "echo":
        return 'echo "<요청문>" | nc <host> <port>'
    if example_medium:
        return example_medium
    if example_strong:
        return _generalize_command_text(example_strong)
    return f"{command_head} <대상>"


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


def _build_command_from_accepted_forms(config: dict[str, Any]) -> str | None:
    forms = _as_list(config.get("acceptedForms"))
    if not forms:
        return None

    for raw_form in forms:
        form = _as_dict(raw_form)
        if not form:
            continue

        command = _safe_str(form.get("command"))
        if not command:
            continue

        args: list[str] = []
        args.extend(_as_text_list(form.get("args")))
        args.extend(_as_text_list(form.get("requiredArgs")))

        any_order = _as_text_list(form.get("argsAnyOrder"))
        if not any_order:
            any_order = _as_text_list(form.get("requiredArgsAnyOrder"))
        if any_order:
            # Backend matcher accepts any order for these args.
            # Keep all required args in hint generation for parity.
            args.extend(any_order)

        resolved_path = _normalize_hint_path(_safe_str(form.get("resolvedPath")))
        if resolved_path:
            args.append(resolved_path)

        built = _join_command([command, *args])
        if built:
            return built

    return None


def _build_discover_open_port_command(config: dict[str, Any]) -> str:
    target_port = _safe_str(config.get("targetPort")) or "<port>"
    methods = [_as_dict(v) for v in _as_list(config.get("acceptedMethods"))]
    methods = [m for m in methods if m]
    if not methods:
        return f"nc -zv localhost {target_port}"

    method = methods[0]
    command = _safe_str(method.get("command")) or "nc"
    required = _extract_required_args(method)

    if command == "nmap":
        target = _first_text(method.get("acceptedTargets")) or "localhost"
        return _join_command([command, *required, target])

    if command == "nc":
        host = _first_text(method.get("acceptedHosts")) or "localhost"
        port = _first_text(method.get("acceptedPorts")) or target_port
        return _join_command([command, *required, host, str(port)])

    return _join_command([command, *required])


def _build_connect_relay_command(config: dict[str, Any]) -> str:
    command = _first_text(config.get("acceptedCommands")) or "nc"
    host = _first_text(config.get("hostAliases")) or "localhost"
    port = _safe_str(config.get("port")) or "<port>"
    base = _join_command([command, host, port])
    if bool(config.get("stdinRequired")):
        return f"{base} < <input>"
    return base


def _build_relay_request_command(config: dict[str, Any], output_required: bool) -> str:
    host = _first_text(config.get("hostAliases")) or "localhost"
    port = _safe_str(config.get("port")) or "<port>"
    request = _safe_str(config.get("request")) or "<REQUEST>"
    base = f'echo "{request}" | nc {host} {port}'
    if not output_required:
        return base

    output_file = _normalize_hint_path(_safe_str(config.get("outputFile")))
    if not output_file:
        output_file = "./relay_output.txt"
    return f"{base} > {output_file}"


def _build_validate_core_group_dat_command(config: dict[str, Any]) -> str:
    target_file = _normalize_hint_path(_safe_str(config.get("targetFile"))) or "./core_group.dat"
    source_file = "<source_file>"
    content_keys = [v.upper() for v in _as_text_list(config.get("filterSourceContentKeys"))]
    if "CH3_MY_PEOPLE_LIST" in content_keys:
        source_file = "./my_people.list"

    reject_statuses = _as_text_list(config.get("rejectStatuses"))
    if reject_statuses:
        pattern = "|".join(re.escape(v) for v in reject_statuses)
        return f'cat {source_file} | grep -Ev "{pattern}" > {target_file}'
    return f"cat {source_file} > {target_file}"


def _build_gpg_output_exists_command(config: dict[str, Any]) -> str:
    input_file = _normalize_hint_path(_safe_str(config.get("inputFile"))) or "./input.dat"
    output_file = _normalize_hint_path(_safe_str(config.get("expectedOutput"))) or f"{input_file}.gpg"
    return f"gpg -c -o {output_file} {input_file}"


def _build_file_equivalence_command(config: dict[str, Any]) -> str:
    source_file = _normalize_hint_path(_safe_str(config.get("equivalentTo"))) or "<source>"
    target_file = _normalize_hint_path(_safe_str(config.get("targetFile"))) or "<target>"
    command = _first_text(config.get("acceptedCommands")) or "cp"
    if command == "cat":
        return f"cat {source_file} > {target_file}"
    return _join_command([command, source_file, target_file])


def _build_confirmation_stream_to_script_command(config: dict[str, Any]) -> str:
    script_path = _normalize_hint_path(_safe_str(config.get("scriptPath"))) or "./script.sh"
    token = _first_text(config.get("acceptedConfirmationTokens")) or "y"
    return f"yes {token} | sh {script_path}"


def _build_discover_file_command(config: dict[str, Any]) -> str:
    target_file = _normalize_hint_path(_safe_str(config.get("targetFile"))) or "./target.file"
    parent_dir = _path_parent(target_file)
    file_name = _path_name(target_file)
    return f'find {parent_dir} -name "{file_name}"'


def _build_create_file_equivalent_command(config: dict[str, Any]) -> str:
    source_file = _normalize_hint_path(_safe_str(config.get("sourceFile"))) or "<source>"
    target_file = _normalize_hint_path(_safe_str(config.get("targetFile"))) or "<target>"
    command = _first_text(config.get("acceptedCommands")) or "cp"
    if command == "cat":
        return f"cat {source_file} > {target_file}"
    return _join_command([command, source_file, target_file])


def _build_file_composition_command(config: dict[str, Any]) -> str:
    target_file = _normalize_hint_path(_safe_str(config.get("targetFile"))) or "./output.dat"
    sources = [_normalize_hint_path(_safe_str(v)) for v in _as_list(config.get("orderedSources"))]
    sources = [v for v in sources if v]
    if not sources:
        return f"cat <parts...> > {target_file}"
    return f"cat {' '.join(sources)} > {target_file}"


def _build_hash_file_check_command(config: dict[str, Any]) -> str:
    target_file = _normalize_hint_path(_safe_str(config.get("targetFile"))) or "./target.file"
    accepted_commands = _as_list(config.get("acceptedCommands"))
    for item in accepted_commands:
        command_config = _as_dict(item)
        command = _safe_str(command_config.get("command"))
        if not command:
            continue
        required_args = _as_text_list(command_config.get("requiredArgs"))
        return _join_command([command, *required_args, target_file])
    return f"sha256sum {target_file}"


def _extract_required_args(config: dict[str, Any]) -> list[str]:
    required_args = _as_text_list(config.get("requiredArgs"))
    required_any_order = _as_text_list(config.get("requiredArgsAnyOrder"))
    return [*required_args, *required_any_order]


def _as_text_list(value: Any) -> list[str]:
    out: list[str] = []
    for item in _as_list(value):
        text = _safe_str(item)
        if text:
            out.append(text)
    return out


def _first_text(value: Any) -> str | None:
    values = _as_text_list(value)
    return values[0] if values else None


def _join_command(parts: list[str | None]) -> str:
    return " ".join(str(p) for p in parts if p is not None and str(p).strip())


def _path_parent(path: str) -> str:
    normalized = path.rstrip("/")
    if "/" not in normalized:
        return "."
    parent = normalized.rsplit("/", 1)[0]
    return parent or "/"


def _path_name(path: str) -> str:
    normalized = path.rstrip("/")
    if not normalized:
        return "<file>"
    if "/" not in normalized:
        return normalized
    return normalized.rsplit("/", 1)[1] or "<file>"


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

