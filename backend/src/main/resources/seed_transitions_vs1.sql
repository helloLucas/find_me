-- Vertical Slice 1 scope:
-- CH1_FRIEND_CHAT_PUSH -> CH1_FRIEND_CHAT_OPEN -> CH1_NEWS_PORTAL -> CH1_DARK_ARTICLE_OPEN
-- Run patch_story_transitions_natural_key.sql before this seed on existing databases.
BEGIN;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    priority
)
VALUES
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FRIEND_CHAT_PUSH'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FRIEND_CHAT_OPEN'),
    'click',
    'open_friend_chat',
    'exact',
    '{}'::jsonb,
    10
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FRIEND_CHAT_OPEN'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    'click',
    'friend_message_link',
    'exact',
    '{}'::jsonb,
    10
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_DARK_ARTICLE_OPEN'),
    'click',
    'dark_article',
    'exact',
    '{}'::jsonb,
    10
)
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    priority = EXCLUDED.priority;

COMMIT;
