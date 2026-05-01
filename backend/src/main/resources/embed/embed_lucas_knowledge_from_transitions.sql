-- 용도: story_transitions 기반으로 lucas_knowledge(source=story_transitions)를 재생성/적재하는 스크립트.

-- lucas_knowledge 에 있는 모든 데이터 지우고 새롭게 생성
-- (기존에 들어가있던 노드에 변화가 생겼을 시)

BEGIN;

DELETE FROM lucas_knowledge
WHERE metadata->>'source' = 'story_transitions'
  AND metadata->>'knowledge_kind' = 'next_node_answer';

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
ORDER BY
    rc.chapter_no,
    rc.from_node_code,
    rc.priority DESC,
    rc.transition_id;

-- Validation 1: inserted row count
SELECT COUNT(*) AS inserted_answer_count
FROM lucas_knowledge
WHERE metadata->>'source' = 'story_transitions'
  AND metadata->>'knowledge_kind' = 'next_node_answer';

-- Validation 2: rows per node
SELECT
    metadata->>'chapter_code' AS chapter_code,
    metadata->>'from_node_code' AS from_node_code,
    COUNT(*) AS answer_count
FROM lucas_knowledge
WHERE metadata->>'source' = 'story_transitions'
  AND metadata->>'knowledge_kind' = 'next_node_answer'
GROUP BY 1, 2
ORDER BY 1, 2;

-- Validation 3: multi-path nodes
SELECT
    metadata->>'chapter_code' AS chapter_code,
    metadata->>'from_node_code' AS from_node_code,
    MAX((metadata->>'candidate_count')::int) AS candidate_count
FROM lucas_knowledge
WHERE metadata->>'source' = 'story_transitions'
  AND metadata->>'knowledge_kind' = 'next_node_answer'
GROUP BY 1, 2
HAVING MAX((metadata->>'candidate_count')::int) > 1
ORDER BY 1, 2;

COMMIT;

