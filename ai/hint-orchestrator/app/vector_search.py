from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.config import Settings
from app.prompt_builder import resolve_command_usage_examples_from_metadata


@dataclass
class VectorCandidate:
    id: int
    chapter: int | None
    puzzle_id: str | None
    content: str | None
    metadata: dict[str, Any]
    cosine_distance: float
    similarity: float
    priority: int
    priority_rank: int
    candidate_count: int


class VectorSearchRepository:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def search(
        self,
        query_vector: str,
        chapter_code: str,
        from_node_code: str,
        action_type: str | None,
        current_input: str | None,
        search_top_k: int,
        min_similarity: float,
        evidence_limit: int,
        hint_level: str,
        recent_actions: list[dict[str, Any]] | None = None,
    ) -> tuple[str, list[VectorCandidate], bool]:
        strict = self._search_strict(query_vector, chapter_code, from_node_code, action_type, search_top_k)
        if self._has_enough_similarity(strict, min_similarity):
            selected = self._select_evidence(
                strict,
                evidence_limit,
                min_similarity,
                hint_level=hint_level,
                recent_actions=recent_actions or [],
                from_node_code=from_node_code,
                current_input=current_input,
            )
            low_confidence = not any(item.similarity >= min_similarity for item in selected)
            return "strict", selected, low_confidence

        action_removed = self._search_action_removed(query_vector, chapter_code, from_node_code, search_top_k)
        if self._has_enough_similarity(action_removed, min_similarity):
            selected = self._select_evidence(
                action_removed,
                evidence_limit,
                min_similarity,
                hint_level=hint_level,
                recent_actions=recent_actions or [],
                from_node_code=from_node_code,
                current_input=current_input,
            )
            low_confidence = not any(item.similarity >= min_similarity for item in selected)
            return "fallback_action_removed", selected, low_confidence

        chapter_only = self._search_chapter_only(query_vector, chapter_code, search_top_k)
        selected = self._select_evidence(
            chapter_only,
            evidence_limit,
            min_similarity,
            hint_level=hint_level,
            recent_actions=recent_actions or [],
            from_node_code=from_node_code,
            current_input=current_input,
        )
        low_confidence = True
        return "fallback_chapter_only", selected, low_confidence

    def search_command_catalog(
        self,
        *,
        query_vector: str,
        chapter_code: str,
        search_top_k: int,
    ) -> list[VectorCandidate]:
        sql = self._base_sql(
            """
            AND lk.metadata->>'action_type' = 'command'
            """
        )
        return self._query(
            sql,
            {
                "query_vector": query_vector,
                "chapter_code": chapter_code,
                "search_top_k": search_top_k,
            },
        )

    def search_command_catalog_static(
        self,
        *,
        chapter_code: str,
        search_top_k: int,
    ) -> list[VectorCandidate]:
        sql = """
        SELECT
          lk.id,
          lk.chapter,
          lk.puzzle_id,
          lk.content,
          lk.metadata,
          1.0::float8 AS cosine_distance,
          0.0::float8 AS similarity,
          COALESCE((lk.metadata->>'priority')::int, 0) AS priority,
          COALESCE((lk.metadata->>'priority_rank')::int, 9999) AS priority_rank,
          COALESCE((lk.metadata->>'candidate_count')::int, 1) AS candidate_count,
          CASE
            WHEN (lk.metadata->>'transition_id') ~ '^[0-9]+$'
            THEN (lk.metadata->>'transition_id')::bigint
            ELSE NULL
          END AS transition_id_num,
          st.expected_input AS transition_expected_input,
          st.action_type AS transition_action_type,
          st.validator_config AS transition_validator_config
        FROM lucas_knowledge lk
        LEFT JOIN story_transitions st
          ON st.id = CASE
            WHEN (lk.metadata->>'transition_id') ~ '^[0-9]+$'
            THEN (lk.metadata->>'transition_id')::bigint
            ELSE NULL
          END
        WHERE lk.embedding IS NOT NULL
          AND lk.metadata->>'source' = %(source_filter)s
          AND lk.metadata->>'knowledge_kind' = %(knowledge_kind_filter)s
          AND lk.metadata->>'chapter_code' = %(chapter_code)s
          AND lk.metadata->>'action_type' = 'command'
        ORDER BY priority_rank ASC, priority DESC, id ASC
        LIMIT %(search_top_k)s
        """
        return self._query(
            sql,
            {
                "chapter_code": chapter_code,
                "search_top_k": search_top_k,
            },
        )

    def _conn(self):
        return psycopg.connect(
            host=self._settings.pg_host,
            port=self._settings.pg_port,
            dbname=self._settings.pg_db,
            user=self._settings.pg_user,
            password=self._settings.pg_password,
            autocommit=True,
        )

    def _search_strict(
        self,
        query_vector: str,
        chapter_code: str,
        from_node_code: str,
        action_type: str | None,
        search_top_k: int,
    ) -> list[VectorCandidate]:
        sql = self._base_sql(
            """
            AND lk.metadata->>'from_node_code' = %(from_node_code)s
            AND (
              CAST(%(action_type)s AS text) IS NULL
              OR CAST(%(action_type)s AS text) = ''
              OR lk.metadata->>'action_type' = %(action_type)s
            )
            """
        )
        return self._query(
            sql,
            {
                "query_vector": query_vector,
                "chapter_code": chapter_code,
                "from_node_code": from_node_code,
                "action_type": action_type,
                "search_top_k": search_top_k,
            },
        )

    def _search_action_removed(
        self, query_vector: str, chapter_code: str, from_node_code: str, search_top_k: int
    ) -> list[VectorCandidate]:
        sql = self._base_sql("AND lk.metadata->>'from_node_code' = %(from_node_code)s")
        return self._query(
            sql,
            {
                "query_vector": query_vector,
                "chapter_code": chapter_code,
                "from_node_code": from_node_code,
                "search_top_k": search_top_k,
            },
        )

    def _search_chapter_only(self, query_vector: str, chapter_code: str, search_top_k: int) -> list[VectorCandidate]:
        sql = self._base_sql("")
        return self._query(
            sql,
            {
                "query_vector": query_vector,
                "chapter_code": chapter_code,
                "search_top_k": search_top_k,
            },
        )

    def _base_sql(self, extra_where: str) -> str:
        return f"""
        WITH q AS (
          SELECT CAST(%(query_vector)s AS vector) AS v
        ),
        scored AS (
          SELECT
            lk.id,
            lk.chapter,
            lk.puzzle_id,
            lk.content,
            lk.metadata,
            (lk.embedding <=> q.v) AS cosine_distance,
            (1 - (lk.embedding <=> q.v)) AS similarity,
            COALESCE((lk.metadata->>'priority')::int, 0) AS priority,
            COALESCE((lk.metadata->>'priority_rank')::int, 9999) AS priority_rank,
            COALESCE((lk.metadata->>'candidate_count')::int, 1) AS candidate_count,
            CASE
              WHEN (lk.metadata->>'transition_id') ~ '^[0-9]+$'
              THEN (lk.metadata->>'transition_id')::bigint
              ELSE NULL
            END AS transition_id_num
          FROM lucas_knowledge lk
          CROSS JOIN q
          WHERE lk.embedding IS NOT NULL
            AND lk.metadata->>'source' = %(source_filter)s
            AND lk.metadata->>'knowledge_kind' = %(knowledge_kind_filter)s
            AND lk.metadata->>'chapter_code' = %(chapter_code)s
            {extra_where}
        )
        SELECT
          scored.*,
          st.expected_input AS transition_expected_input,
          st.action_type AS transition_action_type,
          st.validator_config AS transition_validator_config
        FROM scored
        LEFT JOIN story_transitions st
          ON st.id = scored.transition_id_num
        ORDER BY cosine_distance ASC, priority_rank ASC, priority DESC, id ASC
        LIMIT %(search_top_k)s
        """

    def _query(self, sql: str, params: dict[str, Any]) -> list[VectorCandidate]:
        params = {
            **params,
            "source_filter": self._settings.vector_source_filter,
            "knowledge_kind_filter": self._settings.vector_knowledge_kind_filter,
        }
        with self._conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        result: list[VectorCandidate] = []
        for row in rows:
            metadata = row.get("metadata") or {}
            if not isinstance(metadata, dict):
                metadata = {}

            transition_id_num = row.get("transition_id_num")
            transition_expected_input = row.get("transition_expected_input")
            transition_action_type = row.get("transition_action_type")
            transition_validator_config = row.get("transition_validator_config")

            if transition_id_num is not None:
                metadata["transition_id"] = transition_id_num
            if self._should_overwrite_expected_input(metadata, transition_expected_input):
                metadata["expected_input"] = transition_expected_input
            if transition_action_type is not None:
                metadata["action_type"] = transition_action_type
            if transition_validator_config is not None:
                metadata["validator_config"] = transition_validator_config

            result.append(
                VectorCandidate(
                    id=int(row["id"]),
                    chapter=row.get("chapter"),
                    puzzle_id=row.get("puzzle_id"),
                    content=row.get("content"),
                    metadata=metadata,
                    cosine_distance=float(row.get("cosine_distance") or 0.0),
                    similarity=float(row.get("similarity") or 0.0),
                    priority=int(row.get("priority") or 0),
                    priority_rank=int(row.get("priority_rank") or 9999),
                    candidate_count=int(row.get("candidate_count") or 1),
                )
            )
        return result

    def _has_enough_similarity(self, candidates: list[VectorCandidate], min_similarity: float) -> bool:
        return any(candidate.similarity >= min_similarity for candidate in candidates)

    def _select_evidence(
        self,
        candidates: list[VectorCandidate],
        evidence_limit: int,
        min_similarity: float,
        hint_level: str,
        recent_actions: list[dict[str, Any]],
        from_node_code: str,
        current_input: str | None,
    ) -> list[VectorCandidate]:
        if not candidates:
            return []
        enough = [c for c in candidates if c.similarity >= min_similarity]
        base = enough if enough else candidates
        trap_hit = self._has_trap_failure_signal(
            recent_actions,
            from_node_code=from_node_code,
        )
        if trap_hit:
            non_trap = [c for c in base if not self._is_trap_candidate(c)]
            if non_trap:
                base = non_trap

        success_expected_keys, reached_to_nodes = self._recent_success_context(
            recent_actions,
            from_node_code=from_node_code,
        )
        current_command_head = self._command_head(current_input)
        sorted_items = sorted(
            base,
            key=lambda x: self._evidence_sort_key(
                x,
                current_command_head,
                reached_to_nodes=reached_to_nodes,
            ),
        )
        selected: list[VectorCandidate] = []
        seen_keys: set[tuple[str | None, str | None, int | None]] = set()
        for item in sorted_items:
            action = item.metadata.get("action_type")
            action_key = str(action).strip().lower() if action is not None else None
            expected_input = self._candidate_expected_pattern(item)
            if expected_input is None:
                expected_input = item.metadata.get("expected_input")
            if expected_input is None:
                expected_input = item.content
            expected_key = str(expected_input).strip().lower() if expected_input is not None else None
            if expected_key and expected_key in success_expected_keys:
                continue
            transition_id_raw = item.metadata.get("transition_id")
            transition_id: int | None
            try:
                transition_id = int(transition_id_raw) if transition_id_raw is not None else None
            except Exception:
                transition_id = None
            dedupe_key = (action_key, expected_key, transition_id)
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)
            selected.append(item)
            if len(selected) >= evidence_limit:
                return selected

        if len(selected) < evidence_limit:
            for item in sorted_items:
                if item in selected:
                    continue
                selected.append(item)
                if len(selected) >= evidence_limit:
                    break
        target_count = self._target_count_by_hint_level(hint_level, evidence_limit)
        return selected[:target_count]

    def _should_overwrite_expected_input(
        self,
        metadata: dict[str, Any],
        transition_expected_input: Any,
    ) -> bool:
        if transition_expected_input is None:
            return False

        current_expected = metadata.get("expected_input")
        if self._looks_like_literal_command(current_expected):
            # CH4 variant rows keep their literal command as source of truth.
            return False

        # For key-based rows (CH1~CH3 legacy), keep runtime alignment with story_transitions.
        return True

    def _looks_like_literal_command(self, value: Any) -> bool:
        if value is None:
            return False
        text = str(value).strip()
        if not text:
            return False
        if re.fullmatch(r"[A-Z][A-Z0-9_]*", text):
            return False
        if " " in text:
            return True
        if text.startswith("./") or text.startswith("/"):
            return True
        return any(ch in text for ch in ('"', "'", ".", "/", "-", "<", ">", "|", "&", "="))

    def _evidence_sort_key(
        self,
        candidate: VectorCandidate,
        current_command_head: str | None,
        *,
        reached_to_nodes: set[str],
    ) -> tuple[Any, ...]:
        metadata = candidate.metadata or {}
        action = str(metadata.get("action_type") or "").strip().lower()
        to_node_code = str(metadata.get("to_node_code") or "").strip().upper()
        reached_penalty = 1 if to_node_code and to_node_code in reached_to_nodes else 0
        if action != "command":
            return (
                1,
                reached_penalty,
                candidate.cosine_distance,
                candidate.priority_rank,
                -candidate.priority,
                candidate.id,
            )

        candidate_command_head = self._candidate_command_head(candidate)
        head_match_rank = (
            0
            if current_command_head and candidate_command_head and current_command_head == candidate_command_head
            else 1
        )
        return (
            0,
            head_match_rank,
            reached_penalty,
            candidate.priority_rank,
            candidate.cosine_distance,
            -candidate.priority,
            candidate.id,
        )

    def _candidate_command_head(self, candidate: VectorCandidate) -> str | None:
        resolved = self._resolved_command_examples(candidate)
        command_head = self._command_head(resolved.get("command_head"))
        if command_head:
            return command_head

        metadata = candidate.metadata or {}
        config = metadata.get("validator_config")
        if not isinstance(config, dict):
            config = {}

        rule = str(config.get("rule") or "").strip().upper()
        if rule in {"NORMALIZED_COMMAND", "VIRTUAL_FS_COMMAND"}:
            command = self._command_head(config.get("command"))
            if command:
                return command

        if rule == "NORMALIZED_COMMAND":
            forms = config.get("acceptedForms")
            if isinstance(forms, list):
                for form in forms:
                    if not isinstance(form, dict):
                        continue
                    command = self._command_head(form.get("command"))
                    if command:
                        return command

        expected_input = metadata.get("expected_input")
        return self._command_head(expected_input)

    def _candidate_expected_pattern(self, candidate: VectorCandidate) -> str | None:
        resolved = self._resolved_command_examples(candidate)
        medium = resolved.get("example_medium")
        if medium:
            return str(medium)
        strong = resolved.get("example_strong")
        if strong:
            return str(strong)
        return None

    def _resolved_command_examples(self, candidate: VectorCandidate) -> dict[str, Any]:
        metadata = candidate.metadata or {}
        action = str(metadata.get("action_type") or "").strip().lower() or "command"
        return resolve_command_usage_examples_from_metadata(metadata, action_type=action)

    def _command_head(self, text: Any) -> str | None:
        if text is None:
            return None
        value = str(text).strip().lower()
        if not value:
            return None
        token = value.split()[0]
        if re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", token):
            return token
        return None

    def _target_count_by_hint_level(self, hint_level: str, evidence_limit: int) -> int:
        level = (hint_level or "").upper()
        if level in {"LOW_CONFIDENCE", "LIGHT"}:
            return min(max(1, self._settings.retrieve_evidence_limit_light), evidence_limit)
        if level == "MEDIUM":
            return 1
        return min(max(1, self._settings.retrieve_evidence_limit_strong), evidence_limit)

    def _has_trap_failure_signal(
        self,
        recent_actions: list[dict[str, Any]],
        *,
        from_node_code: str,
    ) -> bool:
        node_scope = (from_node_code or "").strip().upper()
        for action in recent_actions:
            action_node = str(action.get("from_node_id") or "").strip().upper()
            if node_scope and action_node != node_scope:
                continue
            result = str(action.get("result") or "").upper()
            if result.startswith("FAIL"):
                return True
        return False

    def _recent_success_context(
        self,
        recent_actions: list[dict[str, Any]],
        *,
        from_node_code: str,
    ) -> tuple[set[str], set[str]]:
        node_scope = (from_node_code or "").strip().upper()
        success_expected_keys: set[str] = set()
        reached_to_nodes: set[str] = set()
        for action in recent_actions:
            action_node = str(action.get("from_node_id") or "").strip().upper()
            if node_scope and action_node != node_scope:
                continue
            result = str(action.get("result") or "").strip().upper()
            if not result.startswith("SUCCESS"):
                continue

            input_candidates = [
                action.get("input_value_norm"),
                action.get("input_value"),
                action.get("current_input"),
                action.get("expected_input"),
            ]
            for raw in input_candidates:
                if raw is None:
                    continue
                key = str(raw).strip().lower()
                if key:
                    success_expected_keys.add(key)
                    break

            to_node_candidates = [
                action.get("to_node_code"),
                action.get("to_node_id"),
            ]
            for raw_to_node in to_node_candidates:
                if raw_to_node is None:
                    continue
                node = str(raw_to_node).strip().upper()
                if node:
                    reached_to_nodes.add(node)
                    break
        return success_expected_keys, reached_to_nodes

    def _is_trap_candidate(self, candidate: VectorCandidate) -> bool:
        metadata = candidate.metadata or {}
        expected = str(metadata.get("expected_input") or "").lower()
        content = str(candidate.content or "").lower()
        branch_type = str(metadata.get("branch_type") or "").lower()
        to_node_code = str(metadata.get("to_node_code") or "").upper()

        if "protected_core" in expected or "protected_core" in content:
            return True
        if branch_type.startswith("trap"):
            return True
        return "_FAIL_" in to_node_code
