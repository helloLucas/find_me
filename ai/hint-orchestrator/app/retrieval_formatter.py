from __future__ import annotations


def _normalize(value: str | None) -> str:
    if value is None:
        return "-"
    stripped = value.strip()
    return stripped if stripped else "-"


def _join_csv(values: list[str]) -> str:
    normalized = [v.strip() for v in values if v and v.strip()]
    if not normalized:
        return "-"
    return ", ".join(normalized)


def render_query_text(
    chapter_id: str,
    from_node_id: str,
    action_type: str | None,
    current_input: str | None,
    fail_count_after_action: int,
    expected_action_type: str | None,
    expected_input_hint: str | None,
    recent_actions: list[dict],
    extra_context: list[str],
    es_signal: dict | None,
) -> str:
    lines: list[str] = [
        "query_scope: lucas_hint_runtime",
        f"chapter_id: {_normalize(chapter_id)}",
        f"from_node_id: {_normalize(from_node_id)}",
        f"action_type: {_normalize(action_type)}",
        f"current_input: {_normalize(current_input)}",
        f"fail_count_after_action: {fail_count_after_action}",
        f"expected_action_type: {_normalize(expected_action_type)}",
        f"expected_input_hint: {_normalize(expected_input_hint)}",
    ]

    lines.append("recent_actions:")
    if recent_actions:
        for idx, action in enumerate(recent_actions, start=1):
            lines.append(
                f"{idx}) action_type={_normalize(action.get('action_type'))}; "
                f"input_value_norm={_normalize(action.get('input_value_norm'))}; "
                f"result={_normalize(action.get('result'))}; "
                f"from_node_id={_normalize(action.get('from_node_id'))}"
            )
    else:
        lines.append("-")

    lines.append("es_signals:")
    if es_signal:
        lines.extend(
            [
                f"node_fail_rate: {es_signal.get('node_fail_rate', '-')}",
                f"node_avg_fail_count: {es_signal.get('node_avg_fail_count', '-')}",
                f"hint_request_rate: {es_signal.get('hint_request_rate', '-')}",
                f"repeated_wrong_inputs: {_join_csv(es_signal.get('repeated_wrong_inputs', []) or [])}",
                f"top_wrong_inputs: {_join_csv(es_signal.get('top_wrong_inputs', []) or [])}",
                f"success_path_actions: {_join_csv(es_signal.get('success_path_actions', []) or [])}",
            ]
        )
    else:
        lines.append("-")

    lines.append("extra_context:")
    if extra_context:
        for item in extra_context:
            lines.append(f"- {item.strip()}")
    else:
        lines.append("-")
    return "\n".join(lines)

