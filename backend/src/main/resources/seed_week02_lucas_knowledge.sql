-- story_transitions를 읽어서 lucas_knowledge에 새로운 챕터 데이터 삽입

BEGIN;

WITH transition_candidates AS (
  SELECT
    t.id AS transition_id,
    t.from_node_id,
    c.sort_order AS chapter_no,
    c.code AS chapter_code,
    from_node.code AS from_node_code,
    to_node.code AS to_node_code,
    t.action_type,
    t.expected_input,
    t.validator_type,
    t.validator_config,
    t.priority
  FROM story_transitions t
         JOIN story_nodes from_node ON from_node.id = t.from_node_id
         JOIN story_nodes to_node ON to_node.id = t.to_node_id
         JOIN chapters c ON c.id = from_node.chapter_id
  WHERE t.from_node_id <> t.to_node_id
    AND to_node.code NOT LIKE '%_FAIL_%'
),
     ranked_candidates AS (
       SELECT
         tc.*,
         ROW_NUMBER() OVER (
            PARTITION BY tc.from_node_id
            ORDER BY tc.priority DESC, tc.transition_id
        ) AS priority_rank,
         COUNT(*) OVER (PARTITION BY tc.from_node_id) AS candidate_count
       FROM transition_candidates tc
     )
INSERT INTO lucas_knowledge (chapter, puzzle_id, content, metadata)
SELECT
  rc.chapter_no AS chapter,
  rc.from_node_code AS puzzle_id,
  CONCAT(
    'chapter_code=', rc.chapter_code,
    '; from_node_code=', rc.from_node_code,
    '; to_node_code=', rc.to_node_code,
    '; action_type=', rc.action_type,
    '; expected_input=', COALESCE(rc.expected_input, '(null)')
  ) AS content,
  jsonb_build_object(
    'source', 'story_transitions',
    'knowledge_kind', 'next_node_answer',
    'transition_id', rc.transition_id,
    'chapter_code', rc.chapter_code,
    'from_node_code', rc.from_node_code,
    'to_node_code', rc.to_node_code,
    'action_type', rc.action_type,
    'expected_input', rc.expected_input,
    'validator_type', rc.validator_type,
    'validator_config', COALESCE(rc.validator_config, '{}'::jsonb),
    'priority', rc.priority,
    'priority_rank', rc.priority_rank,
    'candidate_count', rc.candidate_count,
    'is_multi_path', (rc.candidate_count > 1)
  ) AS metadata
FROM ranked_candidates rc
WHERE NOT EXISTS (
  SELECT 1
  FROM lucas_knowledge lk
  WHERE lk.metadata->>'source' = 'story_transitions'
      AND lk.metadata->>'knowledge_kind' = 'next_node_answer'
      AND (lk.metadata->>'transition_id')::bigint = rc.transition_id
);

COMMIT;
