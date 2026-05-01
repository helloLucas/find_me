from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import psycopg


@dataclass
class SeedConfig:
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    embedding_service_url: str
    sql_path: Path
    batch_size: int
    timeout_seconds: float
    output_dimensionality: int | None
    skip_transition_sql: bool
    dry_run: bool


def _repo_root() -> Path:
    # .../<repo>/ai/embedding-service/scripts/seed_transition_embeddings.py
    return Path(__file__).resolve().parents[3]


def _default_sql_path() -> Path:
    repo_root = _repo_root()
    candidates = [
        repo_root / "backend" / "src" / "main" / "resources" / "embed" / "embed_lucas_knowledge_from_transitions.sql",
        # Backward-compatibility for older repository layouts.
        repo_root / "backend" / "src" / "main" / "resources" / "seed_lucas_knowledge_from_transitions.sql",
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Seed lucas_knowledge from story_transitions and store embeddings into "
            "lucas_knowledge.embedding via embedding-service."
        )
    )

    parser.add_argument("--db-host", default=os.getenv("PGHOST", "localhost"))
    parser.add_argument("--db-port", type=int, default=int(os.getenv("PGPORT", "5432")))
    parser.add_argument("--db-name", default=os.getenv("PGDATABASE", "lucas_db"))
    parser.add_argument("--db-user", default=os.getenv("PGUSER", "lucas_admin"))
    parser.add_argument("--db-password", default=os.getenv("PGPASSWORD", "lucas1234!"))

    parser.add_argument(
        "--embedding-service-url",
        default=os.getenv("EMBEDDING_SERVICE_URL", "http://localhost:8101"),
    )
    parser.add_argument("--batch-size", type=int, default=int(os.getenv("SEED_BATCH_SIZE", "32")))
    parser.add_argument("--timeout-seconds", type=float, default=float(os.getenv("SEED_TIMEOUT_SECONDS", "30")))
    parser.add_argument(
        "--output-dimensionality",
        type=int,
        default=(
            int(os.getenv("SEED_OUTPUT_DIMENSIONALITY"))
            if os.getenv("SEED_OUTPUT_DIMENSIONALITY")
            else None
        ),
    )
    parser.add_argument("--sql-path", default=str(_default_sql_path()))

    parser.add_argument("--skip-transition-sql", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def _build_config(args: argparse.Namespace) -> SeedConfig:
    sql_path = Path(args.sql_path).resolve()
    if not args.skip_transition_sql and not sql_path.exists():
        raise FileNotFoundError(f"Transition seed SQL not found: {sql_path}")

    if args.batch_size < 1:
        raise ValueError("--batch-size must be >= 1")
    if args.timeout_seconds <= 0:
        raise ValueError("--timeout-seconds must be > 0")
    if args.output_dimensionality is not None and args.output_dimensionality < 1:
        raise ValueError("--output-dimensionality must be >= 1")

    return SeedConfig(
        db_host=args.db_host,
        db_port=args.db_port,
        db_name=args.db_name,
        db_user=args.db_user,
        db_password=args.db_password,
        embedding_service_url=args.embedding_service_url.rstrip("/"),
        sql_path=sql_path,
        batch_size=args.batch_size,
        timeout_seconds=args.timeout_seconds,
        output_dimensionality=args.output_dimensionality,
        skip_transition_sql=args.skip_transition_sql,
        dry_run=args.dry_run,
    )


def _conninfo(cfg: SeedConfig) -> str:
    return (
        f"host={cfg.db_host} "
        f"port={cfg.db_port} "
        f"dbname={cfg.db_name} "
        f"user={cfg.db_user} "
        f"password={cfg.db_password}"
    )


def _run_transition_seed_sql(cfg: SeedConfig) -> None:
    sql = cfg.sql_path.read_text(encoding="utf-8")
    statements = _split_sql_statements(sql)
    if not statements:
        raise RuntimeError(f"No executable SQL statements found: {cfg.sql_path}")

    with psycopg.connect(_conninfo(cfg), autocommit=True) as conn:
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)


def _split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    in_single_quote = False
    index = 0

    while index < len(sql):
        ch = sql[index]

        if ch == "'":
            if in_single_quote and index + 1 < len(sql) and sql[index + 1] == "'":
                current.append(ch)
                current.append(sql[index + 1])
                index += 2
                continue
            in_single_quote = not in_single_quote
            current.append(ch)
            index += 1
            continue

        if ch == ";" and not in_single_quote:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            index += 1
            continue

        current.append(ch)
        index += 1

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)

    return statements


def _fetch_embedding_column_type(conn: psycopg.Connection) -> str:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT format_type(a.atttypid, a.atttypmod) AS full_type
            FROM pg_catalog.pg_attribute a
            JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relname = 'lucas_knowledge'
              AND a.attname = 'embedding'
              AND a.attnum > 0
              AND NOT a.attisdropped
            """
        )
        row = cur.fetchone()
        if row is None or row[0] is None:
            raise RuntimeError("Cannot resolve lucas_knowledge.embedding type")
        return str(row[0])


def _parse_vector_dim(full_type: str) -> int | None:
    match = re.search(r"vector\((\d+)\)", full_type)
    if not match:
        return None
    return int(match.group(1))


def _load_seed_rows(conn: psycopg.Connection) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, chapter, puzzle_id, content, metadata
            FROM lucas_knowledge
            WHERE metadata->>'source' = 'story_transitions'
              AND metadata->>'knowledge_kind' = 'next_node_answer'
            ORDER BY id
            """
        )
        rows = cur.fetchall()

    result: list[dict[str, Any]] = []
    for row in rows:
        metadata = row[4]
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        if metadata is None:
            metadata = {}

        chapter_code = str(metadata.get("chapter_code") or "")
        if not chapter_code:
            chapter_no = row[1]
            chapter_code = f"chapter_{chapter_no}" if chapter_no is not None else "chapter_unknown"

        from_node_code = str(metadata.get("from_node_code") or row[2] or "")
        if not from_node_code:
            from_node_code = "node_unknown"

        expected_input = metadata.get("expected_input")
        doc = {
            "knowledge_id": int(row[0]),
            "doc": {
                "doc_id": f"lk_{row[0]}",
                "doc_type": "transition_rule",
                "chapter_id": chapter_code,
                "from_node_id": from_node_code,
                "action_type": metadata.get("action_type"),
                "title": "next_node_answer",
                "expected_input_norm": expected_input,
                "content": str(row[3] or ""),
                "tags": ["story_transitions", "next_node_answer", chapter_code, from_node_code],
                "metadata": {
                    **metadata,
                    "lucas_knowledge_id": int(row[0]),
                },
            },
        }
        result.append(doc)
    return result


def _chunked(items: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [items[idx : idx + size] for idx in range(0, len(items), size)]


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.10g}" for value in values) + "]"


def _call_embedding_api(
    cfg: SeedConfig,
    batch_docs: list[dict[str, Any]],
    client: httpx.Client,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"documents": [d["doc"] for d in batch_docs]}
    if cfg.output_dimensionality is not None:
        payload["output_dimensionality"] = cfg.output_dimensionality
    response = client.post("/v1/hint/embed-documents", json=payload)
    response.raise_for_status()
    return response.json()


def _apply_embedding_updates(
    conn: psycopg.Connection,
    updates: list[tuple[str, int]],
) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            "UPDATE lucas_knowledge SET embedding = %s::vector WHERE id = %s",
            updates,
        )


def run(cfg: SeedConfig) -> None:
    print("[1/5] embedding-service health check")
    with httpx.Client(base_url=cfg.embedding_service_url, timeout=cfg.timeout_seconds) as client:
        health_res = client.get("/health")
        health_res.raise_for_status()
        print(f"  - health: {health_res.json()}")

        if not cfg.skip_transition_sql:
            print("[2/5] run transition->knowledge SQL")
            _run_transition_seed_sql(cfg)
            print(f"  - applied SQL: {cfg.sql_path}")
        else:
            print("[2/5] skip transition->knowledge SQL")

        print("[3/5] load seed rows from lucas_knowledge")
        with psycopg.connect(_conninfo(cfg)) as conn:
            full_type = _fetch_embedding_column_type(conn)
            expected_dim = _parse_vector_dim(full_type)
            seed_rows = _load_seed_rows(conn)

            print(f"  - embedding column type: {full_type}")
            print(f"  - seed row count: {len(seed_rows)}")
            if cfg.output_dimensionality is not None:
                print(f"  - requested output_dimensionality: {cfg.output_dimensionality}")

            if not seed_rows:
                print("  - nothing to embed; stop.")
                return

            print("[4/5] request embeddings in batches")
            updates: list[tuple[str, int]] = []
            total = len(seed_rows)
            batches = _chunked(seed_rows, cfg.batch_size)
            detected_dim: int | None = None

            for index, batch in enumerate(batches, start=1):
                body = _call_embedding_api(cfg, batch, client)
                items = body.get("items") or []
                if len(items) != len(batch):
                    raise RuntimeError(
                        f"Batch response size mismatch: request={len(batch)} response={len(items)}"
                    )

                for item in items:
                    meta = item.get("metadata") or {}
                    knowledge_id = meta.get("lucas_knowledge_id")
                    embedding = item.get("embedding") or []

                    if knowledge_id is None:
                        raise RuntimeError("Response item missing metadata.lucas_knowledge_id")

                    current_dim = len(embedding)
                    if current_dim == 0:
                        raise RuntimeError(f"Empty embedding for lucas_knowledge.id={knowledge_id}")

                    if detected_dim is None:
                        detected_dim = current_dim
                        if expected_dim is not None and expected_dim != detected_dim:
                            raise RuntimeError(
                                "Embedding dimension mismatch: "
                                f"column={expected_dim}, model={detected_dim}. "
                                "Fix the column dimension first. Example: "
                                f"ALTER TABLE lucas_knowledge ALTER COLUMN embedding TYPE vector({detected_dim});"
                            )
                    elif detected_dim != current_dim:
                        raise RuntimeError(
                            f"Inconsistent embedding dimension in same run: "
                            f"first={detected_dim}, current={current_dim}"
                        )

                    updates.append((_vector_literal(embedding), int(knowledge_id)))

                done = min(index * cfg.batch_size, total)
                print(f"  - batch {index}/{len(batches)} done ({done}/{total})")

            print("[5/5] write vectors to PostgreSQL")
            if cfg.dry_run:
                print("  - dry-run enabled: skip UPDATE")
                return

            _apply_embedding_updates(conn, updates)
            conn.commit()
            print(f"  - updated rows: {len(updates)}")
            print("  - seeding completed")


def main() -> int:
    try:
        args = _parse_args()
        cfg = _build_config(args)
        run(cfg)
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
