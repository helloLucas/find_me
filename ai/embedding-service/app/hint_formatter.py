from __future__ import annotations

from app.schemas import HintDocumentInput, HintQueryEmbedRequest, RecentActionInput


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


def render_document_text(document: HintDocumentInput) -> str:
    lines: list[str] = [
        "doc_scope: lucas_hint_knowledge",
        f"doc_id: {document.doc_id}",
        f"doc_type: {document.doc_type}",
        f"chapter_id: {_normalize(document.chapter_id)}",
        f"from_node_id: {_normalize(document.from_node_id)}",
        f"action_type: {_normalize(document.action_type)}",
        f"title: {_normalize(document.title)}",
        f"expected_input_norm: {_normalize(document.expected_input_norm)}",
        f"tags: {_join_csv(document.tags)}",
        "content:",
        document.content.strip(),
    ]
    return "\n".join(lines)


def _render_recent_action(index: int, action: RecentActionInput) -> str:
    return (
        f"{index}) action_type={_normalize(action.action_type)}; "
        f"input_value_norm={_normalize(action.input_value_norm)}; "
        f"result={_normalize(action.result)}; "
        f"from_node_id={_normalize(action.from_node_id)}"
    )


def render_query_text(query: HintQueryEmbedRequest) -> str:
    lines: list[str] = [
        "query_scope: lucas_hint_runtime",
        f"chapter_id: {_normalize(query.chapter_id)}",
        f"from_node_id: {_normalize(query.from_node_id)}",
        f"action_type: {_normalize(query.action_type)}",
        f"current_input: {_normalize(query.current_input)}",
        f"fail_count_after_action: {query.fail_count_after_action}",
        f"expected_action_type: {_normalize(query.expected_action_type)}",
        f"expected_input_hint: {_normalize(query.expected_input_hint)}",
    ]

    lines.append("recent_actions:")
    if query.recent_actions:
        for idx, action in enumerate(query.recent_actions, start=1):
            lines.append(_render_recent_action(idx, action))
    else:
        lines.append("-")

    lines.append("es_signals:")
    if query.es_signal:
        es = query.es_signal
        lines.extend(
            [
                f"node_fail_rate: {es.node_fail_rate if es.node_fail_rate is not None else '-'}",
                f"node_avg_fail_count: {es.node_avg_fail_count if es.node_avg_fail_count is not None else '-'}",
                f"hint_request_rate: {es.hint_request_rate if es.hint_request_rate is not None else '-'}",
                f"repeated_wrong_inputs: {_join_csv(es.repeated_wrong_inputs)}",
                f"top_wrong_inputs: {_join_csv(es.top_wrong_inputs)}",
                f"success_path_actions: {_join_csv(es.success_path_actions)}",
            ]
        )
    else:
        lines.append("-")

    lines.append("extra_context:")
    if query.extra_context:
        for item in query.extra_context:
            lines.append(f"- {item.strip()}")
    else:
        lines.append("-")

    return "\n".join(lines)

