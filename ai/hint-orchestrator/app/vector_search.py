from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.config import Settings


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
        search_top_k: int,
        min_similarity: float,
        evidence_limit: int,
    ) -> tuple[str, list[VectorCandidate], bool]:
        strict = self._search_strict(query_vector, chapter_code, from_node_code, action_type, search_top_k)
        if self._has_enough_similarity(strict, min_similarity):
            selected = self._select_evidence(strict, evidence_limit, min_similarity)
            low_confidence = not any(item.similarity >= min_similarity for item in selected)
            return "strict", selected, low_confidence

        action_removed = self._search_action_removed(query_vector, chapter_code, from_node_code, search_top_k)
        if self._has_enough_similarity(action_removed, min_similarity):
            selected = self._select_evidence(action_removed, evidence_limit, min_similarity)
            low_confidence = not any(item.similarity >= min_similarity for item in selected)
            return "fallback_action_removed", selected, low_confidence

        chapter_only = self._search_chapter_only(query_vector, chapter_code, search_top_k)
        selected = self._select_evidence(chapter_only, evidence_limit, min_similarity)
        low_confidence = True
        return "fallback_chapter_only", selected, low_confidence

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

            if metadata.get("transition_id") is None and transition_id_num is not None:
                metadata["transition_id"] = transition_id_num
            if metadata.get("expected_input") is None and transition_expected_input is not None:
                metadata["expected_input"] = transition_expected_input
            if metadata.get("action_type") is None and transition_action_type is not None:
                metadata["action_type"] = transition_action_type
            if metadata.get("validator_config") is None and transition_validator_config is not None:
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
        self, candidates: list[VectorCandidate], evidence_limit: int, min_similarity: float
    ) -> list[VectorCandidate]:
        if not candidates:
            return []
        enough = [c for c in candidates if c.similarity >= min_similarity]
        base = enough if enough else candidates

        # Keep priority_rank as a soft preference, not a hard gate.
        # This increases flexibility so semantically closer alternatives can surface.
        def rank_penalty(rank: int) -> float:
            if rank <= 1:
                return 0.0
            if rank == 2:
                return 0.015
            if rank == 3:
                return 0.03
            return 0.05

        sorted_items = sorted(
            base,
            key=lambda x: (
                x.cosine_distance + rank_penalty(x.priority_rank),
                -x.priority,
                x.priority_rank,
                x.id,
            ),
        )
        selected: list[VectorCandidate] = []
        seen_keys: set[tuple[str | None, str | None]] = set()
        for item in sorted_items:
            action = item.metadata.get("action_type")
            action_key = str(action).strip().lower() if action is not None else None
            expected_input = item.metadata.get("expected_input")
            if expected_input is None:
                expected_input = item.content
            expected_key = str(expected_input).strip().lower() if expected_input is not None else None
            dedupe_key = (action_key, expected_key)
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
        return selected
