-- Chapter 2 seed_transitions.sql

-- Run after seed_nodes_chapter2.sql.

BEGIN;


DELETE FROM story_transitions t
USING story_nodes n, chapters c
WHERE t.from_node_id = n.id
  AND n.chapter_id = c.id
  AND c.code = 'CHAPTER_02';

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'ls',
    'server_rule',
    $json${
  "rule": "NORMALIZED_COMMAND",
  "command": "ls",
  "args": []
}$json$::jsonb,
    $json${
  "setFlags": {
    "chapter2_file_list_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_FILE_LIST'
WHERE from_node.code = 'CH2_SERVER_HOME'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/world_map.map',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/world_map.map",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "world_map_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_WORLD_MAP_VIEW'
WHERE from_node.code = 'CH2_FILE_LIST'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/observer_status.log',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/observer_status.log",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "observer_status_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_OBSERVER_STATUS_VIEW'
WHERE from_node.code = 'CH2_FILE_LIST'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
WHERE from_node.code = 'CH2_FILE_LIST'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredExecutable": false
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_exec_attempted": true
  },
  "recentResult": "FAIL_PERMISSION_DENIED"
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
WHERE from_node.code = 'CH2_FILE_LIST'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/world_map.map',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/world_map.map",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "world_map_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_WORLD_MAP_VIEW'
WHERE from_node.code = 'CH2_OBSERVER_STATUS_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/observer_status.log',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/observer_status.log",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "observer_status_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_OBSERVER_STATUS_VIEW'
WHERE from_node.code = 'CH2_OBSERVER_STATUS_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
WHERE from_node.code = 'CH2_OBSERVER_STATUS_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredExecutable": false
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_exec_attempted": true
  },
  "recentResult": "FAIL_PERMISSION_DENIED"
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
WHERE from_node.code = 'CH2_OBSERVER_STATUS_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/world_map.map',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/world_map.map",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "world_map_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_WORLD_MAP_VIEW'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/observer_status.log',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/observer_status.log",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "observer_status_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_OBSERVER_STATUS_VIEW'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredExecutable": false
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_exec_attempted": true
  },
  "recentResult": "FAIL_PERMISSION_DENIED"
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/world_map.map',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/world_map.map",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "world_map_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_WORLD_MAP_VIEW'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/observer_status.log',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/observer_status.log",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "observer_status_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_OBSERVER_STATUS_VIEW'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_VIEW'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/lucas_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/lucas_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredExecutable": false
}$json$::jsonb,
    $json${
  "setFlags": {
    "lucas_fragment_exec_attempted": true
  },
  "recentResult": "FAIL_PERMISSION_DENIED"
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
WHERE from_node.code = 'CH2_LUCAS_FRAGMENT_EXEC_FAILED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'system',
    'auto',
    'server_rule',
    $json${
  "rule": "AUTO_SYSTEM"
}$json$::jsonb,
    $json${
  "setFlags": {
    "gc_scan_started": true
  },
  "setScanPercent": 1,
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_GC_SCAN_ALERT'
WHERE from_node.code = 'CH2_WORLD_MAP_VIEW'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_01.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_01.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredExecutable": true,
  "requiredFlags": [
    "gc_scan_started"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "laplace_mission_started": true
  },
  "setScanPercent": 18,
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LAPLACE_MISSION_READY'
WHERE from_node.code = 'CH2_GC_SCAN_ALERT'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'find . -name "*.tmp"',
    'server_rule',
    $json${
  "rule": "NORMALIZED_COMMAND",
  "command": "find",
  "args": [
    ".",
    "-name",
    "*.tmp"
  ],
  "requiredFlags": [
    "laplace_mission_started"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "tmp_files_found": true
  },
  "setScanPercent": 42,
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_TMP_SEARCH_RESULT'
WHERE from_node.code = 'CH2_LAPLACE_MISSION_READY'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'tar_with_protected_core',
    'server_rule',
    $json${
  "rule": "PARSED_TAR_COMMAND",
  "outputFile": "decoy.tar",
  "requiredFiles": [
    "/home/guest/sys/temp/Memory_Dump_082.tmp",
    "/home/guest/cache/User_Behavior_88.tmp",
    "/home/guest/tmp/System_Temp_File.tmp"
  ],
  "detectedFiles": [
    "/home/guest/root/hidden/L_fragment_core.tmp"
  ],
  "protectedFileIncluded": true,
  "requiredFlags": [
    "tmp_files_found"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "protected_core_access_attempted": true
  },
  "setScanPercent": 57,
  "recentResult": "FAIL_PROTECTED_CORE"
}$json$::jsonb,
    110
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_PROTECTED_CORE_DENIED'
WHERE from_node.code = 'CH2_TMP_SEARCH_RESULT'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'tar_normal_decoy',
    'server_rule',
    $json${
  "rule": "PARSED_TAR_COMMAND",
  "outputFile": "decoy.tar",
  "requiredFiles": [
    "/home/guest/sys/temp/Memory_Dump_082.tmp",
    "/home/guest/cache/User_Behavior_88.tmp",
    "/home/guest/tmp/System_Temp_File.tmp"
  ],
  "forbiddenFiles": [
    "/home/guest/root/hidden/L_fragment_core.tmp"
  ],
  "requiredFlags": [
    "tmp_files_found"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "decoy_created": true
  },
  "setScanPercent": 58,
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/decoy.tar",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "tar_normal_decoy",
        "contentKey": "DECOY_TAR"
      }
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_DECOY_CREATED'
WHERE from_node.code = 'CH2_TMP_SEARCH_RESULT'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'tar_with_protected_core',
    'server_rule',
    $json${
  "rule": "PARSED_TAR_COMMAND",
  "outputFile": "decoy.tar",
  "requiredFiles": [
    "/home/guest/sys/temp/Memory_Dump_082.tmp",
    "/home/guest/cache/User_Behavior_88.tmp",
    "/home/guest/tmp/System_Temp_File.tmp"
  ],
  "detectedFiles": [
    "/home/guest/root/hidden/L_fragment_core.tmp"
  ],
  "protectedFileIncluded": true,
  "requiredFlags": [
    "tmp_files_found"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "protected_core_access_attempted": true
  },
  "setScanPercent": 57,
  "recentResult": "FAIL_PROTECTED_CORE"
}$json$::jsonb,
    110
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_PROTECTED_CORE_DENIED'
WHERE from_node.code = 'CH2_PROTECTED_CORE_DENIED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'tar_normal_decoy',
    'server_rule',
    $json${
  "rule": "PARSED_TAR_COMMAND",
  "outputFile": "decoy.tar",
  "requiredFiles": [
    "/home/guest/sys/temp/Memory_Dump_082.tmp",
    "/home/guest/cache/User_Behavior_88.tmp",
    "/home/guest/tmp/System_Temp_File.tmp"
  ],
  "forbiddenFiles": [
    "/home/guest/root/hidden/L_fragment_core.tmp"
  ],
  "requiredFlags": [
    "tmp_files_found"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "decoy_created": true
  },
  "setScanPercent": 58,
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/decoy.tar",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "tar_normal_decoy",
        "contentKey": "DECOY_TAR"
      }
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_DECOY_CREATED'
WHERE from_node.code = 'CH2_PROTECTED_CORE_DENIED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'nc_send_decoy',
    'server_rule',
    $json${
  "rule": "NC_SEND_FILE",
  "host": "127.0.0.1",
  "port": 8080,
  "timeoutSeconds": 3,
  "stdinFile": "/home/guest/decoy.tar",
  "requiredFlags": [
    "decoy_created"
  ],
  "requiredCreatedFiles": [
    "/home/guest/decoy.tar"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "decoy_sent": true
  },
  "setScanPercent": 63,
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_DECOY_SENT'
WHERE from_node.code = 'CH2_DECOY_CREATED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'clean_trace',
    'server_rule',
    $json${
  "rule": "CHAINED_COMMAND",
  "operator": "&&",
  "commands": [
    {
      "command": "rm",
      "resolvedPath": "/home/guest/decoy.tar"
    },
    {
      "command": "history",
      "args": [
        "-c"
      ]
    }
  ],
  "requiredFlags": [
    "decoy_sent"
  ],
  "requiredCreatedFiles": [
    "/home/guest/decoy.tar"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "trace_cleaned": true,
    "decoy_created": false
  },
  "setScanPercent": 0,
  "vfsOverlay": {
    "removedPaths": [
      "/home/guest/decoy.tar"
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_TRACE_CLEANED'
WHERE from_node.code = 'CH2_DECOY_SENT'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'click',
    'view_recovered_document',
    'exact',
    $json${
  "trim": true,
  "caseInsensitive": false,
  "normalizeWhitespace": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "recovered_document_viewed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_RECOVERED_DOCUMENT'
WHERE from_node.code = 'CH2_TRACE_CLEANED'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'click',
    'complete_chapter',
    'exact',
    $json${
  "trim": true,
  "caseInsensitive": false,
  "normalizeWhitespace": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "chapter2_completed": true
  },
  "setScanPercent": 0,
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_COMPLETE'
WHERE from_node.code = 'CH2_RECOVERED_DOCUMENT'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

INSERT INTO story_transitions (
    from_node_id,
    to_node_id,
    action_type,
    expected_input,
    validator_type,
    validator_config,
    effect_bundle,
    priority
)
SELECT
    from_node.id,
    to_node.id,
    'click',
    'retry_from_checkpoint',
    'exact',
    $json${
  "trim": true,
  "caseInsensitive": false,
  "normalizeWhitespace": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "decoy_created": false,
    "decoy_sent": false,
    "trace_cleaned": false
  },
  "setScanPercent": 18,
  "recentResult": "RETRY_FROM_CHECKPOINT"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH2_LAPLACE_MISSION_READY'
WHERE from_node.code = 'CH2_FAIL_GC_TRACE_COMPLETE'
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;


COMMIT;
