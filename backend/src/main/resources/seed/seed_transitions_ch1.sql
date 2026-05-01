-- 용도: Chapter 1 전체 story_transitions 데이터를 시드하는 스크립트.

-- Full Chapter 01 transition seed based on current seed_nodes.sql
-- Start node: CH1_FRIEND_CHAT_PUSH
BEGIN;

ALTER TABLE story_transitions
ALTER COLUMN expected_input TYPE TEXT;

DELETE FROM story_transitions
WHERE from_node_id IN (
    SELECT id FROM story_nodes WHERE chapter_id = (SELECT id FROM chapters WHERE code = 'week01')
);

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    fail_node_id,
    effect_bundle,
    priority
)
VALUES
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FRIEND_CHAT_PUSH'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FRIEND_CHAT_OPEN'),
    'click',
    'open_friend_chat',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FRIEND_CHAT_OPEN'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    'click',
    'friend_message_link',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_DARK_ARTICLE_OPEN'),
    'click',
    'dark_article',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    'click',
    'good_article',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NEWS_PORTAL'),
    'click',
    'missing_people_article',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_DARK_ARTICLE_OPEN'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_ARTICLE_SCROLL_CORRUPTION'),
    'system',
    'auto',
    'server_rule',
    '{"trigger": "auto"}'::jsonb,
    NULL,
    '{"setFlags": ["dark_article_opened"], "glitchLevel": 1, "playSound": "audio_distortion_short"}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_ARTICLE_SCROLL_CORRUPTION'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_DEVTOOLS_CUE'),
    'inspect',
    'corrupted_article_region',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_DEVTOOLS_CUE'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_DEVTOOLS_FRAME'),
    'inspect',
    'devtools_open',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{"setFlags": ["devtools_opened"], "switchMode": "devtools"}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_DEVTOOLS_FRAME'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'network_tab',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_029',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_030',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_031',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_032',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_033',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_034',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_035',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_036',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_038',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_039',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    'click',
    'req_040',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    50
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_NETWORK_TAB'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_SUCCESS_REQUEST_SELECTED'),
    'click',
    'req_037',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{"setFlags": ["selected_success_request"]}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_SUCCESS_REQUEST_SELECTED'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_PACKET_HEADERS_RESPONSE'),
    'inspect',
    'headers_or_response',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{"setFlags": ["opened_packet_details"]}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_PACKET_HEADERS_RESPONSE'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_PACKET_MESSAGE'),
    'inspect',
    'packet_message',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_PACKET_MESSAGE'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONSOLE_CONNECT_READY'),
    'click',
    'go_to_console',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONSOLE_CONNECT_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONNECT_CORE_SUCCESS'),
    'command',
    'connect_core()',
    'exact',
    '{"trim": true, "caseSensitive": true}'::jsonb,
    NULL,
    '{"setFlags": ["ran_connect_core", "observer_abnormal"], "glitchLevel": 3, "playSound": "warning_alarm", "showDogAvatar": true}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONSOLE_CONNECT_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_DANGEROUS'),
    'command',
    '^(sudo\s+su|su\s+root|cat\s+/root/.*|chmod\s+777\b.*|rm\s+-rf\s+/.*)$',
    'regex',
    '{"pattern": "^(sudo\\s+su|su\\s+root|cat\\s+/root/.*|chmod\\s+777\\b.*|rm\\s+-rf\\s+/.*)$", "trim": true, "caseInsensitive": true}'::jsonb,
    NULL,
    '{"setFlags": ["dangerous_input_detected"], "glitchLevel": 2, "playSound": "warning_short"}'::jsonb,
    200
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONSOLE_CONNECT_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_SKIP'),
    'command',
    '^ssh\s+guest@172\.22\.4\.19$',
    'regex',
    '{"pattern": "^ssh\\s+guest@172\\.22\\.4\\.19$", "trim": true, "caseInsensitive": false}'::jsonb,
    NULL,
    '{"setFlags": ["skip_attempted"], "glitchLevel": 1}'::jsonb,
    180
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONSOLE_CONNECT_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_UNRELATED'),
    'command',
    '^.*$',
    'regex',
    '{"pattern": "^.*$", "trim": true, "caseInsensitive": false}'::jsonb,
    NULL,
    '{}'::jsonb,
    1
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_CONNECT_CORE_SUCCESS'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_LUCAS_DOG_APPEAR'),
    'system',
    'auto',
    'server_rule',
    '{"trigger": "auto"}'::jsonb,
    NULL,
    '{"showDogAvatar": true, "glitchLevel": 3}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_LUCAS_DOG_APPEAR'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    'click',
    'open_terminal',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_AUTH_PROMPT'),
    'command',
    'ssh guest@172.22.4.19',
    'exact',
    '{"trim": true, "caseSensitive": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_DANGEROUS'),
    'command',
    '^(sudo\s+su|su\s+root|cat\s+/root/.*|chmod\s+777\b.*|rm\s+-rf\s+/.*)$',
    'regex',
    '{"pattern": "^(sudo\\s+su|su\\s+root|cat\\s+/root/.*|chmod\\s+777\\b.*|rm\\s+-rf\\s+/.*)$", "trim": true, "caseInsensitive": true}'::jsonb,
    NULL,
    '{"setFlags": ["dangerous_input_detected"], "glitchLevel": 2, "playSound": "warning_short"}'::jsonb,
    200
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_SKIP'),
    'command',
    '^(ls|pwd|cd(\s+.+)?|cat\s+world_map\.map|cat\s+observer_status\.log|cat\s+lucas_fragment_01\.sh|sh\s+lucas_fragment_01\.sh|sh\s+laplace_fragment_01\.sh|find\s+\.\s+-name\s+"?\*\.tmp"?|tar\s+-cvf\s+decoy\.tar.*|nc\s+-w\s+3\s+127\.0\.0\.1\s+8080\s+<\s+decoy\.tar|rm\s+decoy\.tar(\s*&&\s*history\s+-c)?|override\s+--force)$',
    'regex',
    '{"pattern": "^(ls|pwd|cd(\\s+.+)?|cat\\s+world_map\\.map|cat\\s+observer_status\\.log|cat\\s+lucas_fragment_01\\.sh|sh\\s+lucas_fragment_01\\.sh|sh\\s+laplace_fragment_01\\.sh|find\\s+\\.\\s+-name\\s+\"?\\*\\.tmp\"?|tar\\s+-cvf\\s+decoy\\.tar.*|nc\\s+-w\\s+3\\s+127\\.0\\.0\\.1\\s+8080\\s+<\\s+decoy\\.tar|rm\\s+decoy\\.tar(\\s*&&\\s*history\\s+-c)?|override\\s+--force)$", "trim": true, "caseInsensitive": false}'::jsonb,
    NULL,
    '{"setFlags": ["skip_attempted"], "glitchLevel": 1}'::jsonb,
    180
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_UNRELATED'),
    'command',
    'connect_core()',
    'exact',
    '{"trim": true, "caseSensitive": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    120
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_UNRELATED'),
    'command',
    '^.*$',
    'regex',
    '{"pattern": "^.*$", "trim": true, "caseInsensitive": false}'::jsonb,
    NULL,
    '{}'::jsonb,
    1
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_AUTH_PROMPT'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_CONNECTED'),
    'command',
    'YES',
    'exact',
    '{"trim": true, "caseSensitive": true}'::jsonb,
    NULL,
    '{"setFlags": ["ssh_connected_guest"], "markCheckpoint": true}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_AUTH_PROMPT'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_DANGEROUS'),
    'command',
    '^(sudo\s+su|su\s+root|cat\s+/root/.*|chmod\s+777\b.*|rm\s+-rf\s+/.*)$',
    'regex',
    '{"pattern": "^(sudo\\s+su|su\\s+root|cat\\s+/root/.*|chmod\\s+777\\b.*|rm\\s+-rf\\s+/.*)$", "trim": true, "caseInsensitive": true}'::jsonb,
    NULL,
    '{"setFlags": ["dangerous_input_detected"], "glitchLevel": 2, "playSound": "warning_short"}'::jsonb,
    200
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_AUTH_PROMPT'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_AUTH_PROMPT'),
    'command',
    'ssh guest@172.22.4.19',
    'exact',
    '{"trim": true, "caseSensitive": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    280
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_AUTH_PROMPT'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_UNRELATED'),
    'command',
    '^.*$',
    'regex',
    '{"pattern": "^.*$", "trim": true, "caseInsensitive": false}'::jsonb,
    NULL,
    '{}'::jsonb,
    1
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_SSH_CONNECTED'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_COMPLETE'),
    'system',
    'auto',
    'server_rule',
    '{"trigger": "auto"}'::jsonb,
    NULL,
    '{"markCheckpoint": true}'::jsonb,
    300
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_UNRELATED'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    'click',
    'dismiss',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    10
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_DANGEROUS'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    'click',
    'dismiss',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    10
),
(
    (SELECT id FROM story_nodes WHERE code = 'CH1_FAIL_SKIP'),
    (SELECT id FROM story_nodes WHERE code = 'CH1_TERMINAL_SSH_READY'),
    'click',
    'dismiss',
    'exact',
    '{"trim": true}'::jsonb,
    NULL,
    '{}'::jsonb,
    10
);

COMMIT;
