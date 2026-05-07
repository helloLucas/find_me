-- seed_transitions_ch3_corrected.sql
-- 용도: Chapter 3 수정본 전이 전체를 삽입/갱신합니다.
-- 실행 순서: seed_nodes_ch3_corrected.sql 실행 후 이 파일을 실행하십시오.
-- 핵심 수정: CH3_FRIEND_CALL -> CH3_SERVER_AFTER_DECOY 전이를 추가하고, 기존 첫 터미널 전이는 CH3_SERVER_AFTER_DECOY -> CH3_HOME_RECHECK로 유지합니다.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM chapters WHERE code = 'week03') THEN
        RAISE EXCEPTION 'chapter week03 does not exist. Run seed_nodes_ch3_corrected.sql first.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM story_nodes n
        JOIN chapters c ON c.id = n.chapter_id
        WHERE c.code = 'week03'
          AND n.code = 'CH3_FRIEND_CALL'
    ) THEN
        RAISE EXCEPTION 'CH3_FRIEND_CALL does not exist. Run seed_nodes_ch3_corrected.sql first.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM story_nodes n
        JOIN chapters c ON c.id = n.chapter_id
        WHERE c.code = 'week03'
          AND n.code = 'CH3_SERVER_AFTER_DECOY'
    ) THEN
        RAISE EXCEPTION 'CH3_SERVER_AFTER_DECOY does not exist. Run seed_nodes_ch3_corrected.sql first.';
    END IF;
END $$;

-- 3. Chapter 3 전이 전체 재구성
DELETE FROM story_transitions t
USING story_nodes from_node, story_nodes to_node, chapters c_from, chapters c_to
WHERE t.from_node_id = from_node.id
  AND t.to_node_id = to_node.id
  AND from_node.chapter_id = c_from.id
  AND to_node.chapter_id = c_to.id
  AND (c_from.code = 'week03' OR c_to.code = 'week03');


-- 3-1. 도입 통화 -> 서버 진입
INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'click',
    'continue',
    'exact',
    $json${
  "acceptedValues": ["continue"]
}$json$::jsonb,
    $json${
  "setFlags": {
    "friend_deleted_event_seen": true
  },
  "snapshotPatch": {
    "flags.friend_deleted_event_seen": true,
    "nodeCode": "CH3_SERVER_AFTER_DECOY"
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SERVER_AFTER_DECOY'
WHERE from_node.code = 'CH3_FRIEND_CALL';


-- 3-2. 기존 Chapter 3 전이 전체
INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'list_home_with_hidden',
    'server_rule',
    $json${
  "rule": "NORMALIZED_COMMAND",
  "acceptedForms": [
    {
      "command": "ls",
      "argsAnyOrder": [
        "-al"
      ]
    },
    {
      "command": "ls",
      "argsAnyOrder": [
        "-la"
      ]
    }
  ],
  "cwd": "/home/guest"
}$json$::jsonb,
    $json${
  "setFlags": {
    "home_rechecked": true
  },
  "snapshotPatch": {
    "flags.home_rechecked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_HOME_RECHECK'
WHERE from_node.code = 'CH3_SERVER_AFTER_DECOY';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/.bash_history',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/.bash_history",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "allowHomeAlias": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "home_rechecked": true,
    "bash_history_checked": true
  },
  "snapshotPatch": {
    "flags.home_rechecked": true,
    "flags.bash_history_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_HISTORY_VIEW'
WHERE from_node.code = 'CH3_HOME_RECHECK';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'discover_open_port_9091',
    'server_rule',
    $json${
  "rule": "DISCOVER_OPEN_PORT",
  "targetPort": 9091,
  "acceptedMethods": [
    {
      "method": "NMAP_SERVICE_SCAN",
      "command": "nmap",
      "requiredArgs": [
        "-sV"
      ],
      "acceptedTargets": [
        "127.0.0.1",
        "localhost"
      ]
    },
    {
      "method": "SS_LISTEN_SCAN",
      "command": "ss",
      "requiredArgsAnyOrder": [
        "-ltn"
      ]
    },
    {
      "method": "NETSTAT_LISTEN_SCAN",
      "command": "netstat",
      "requiredArgsAnyOrder": [
        "-ltn"
      ]
    },
    {
      "method": "NC_ZERO_IO_SCAN",
      "command": "nc",
      "requiredArgsAnyOrder": [
        "-zv"
      ],
      "acceptedHosts": [
        "127.0.0.1",
        "localhost"
      ],
      "acceptedPorts": [
        9091
      ]
    }
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "port_9091_discovered": true
  },
  "snapshotPatch": {
    "flags.port_9091_discovered": true,
    "relay.discovered": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PORT_DISCOVERED'
WHERE from_node.code = 'CH3_HISTORY_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'connect_relay_empty',
    'server_rule',
    $json${
  "rule": "CONNECT_RELAY",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "acceptedCommands": [
    "nc"
  ],
  "timeoutOptional": true,
  "stdinRequired": false,
  "requiredFlags": [
    "port_9091_discovered"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_contacted": true
  },
  "snapshotPatch": {
    "flags.relay_contacted": true,
    "relay.contacted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_EMPTY_RESPONSE'
WHERE from_node.code = 'CH3_PORT_DISCOVERED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_RELAY_EMPTY_RESPONSE';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_VIEWED'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_PEOPLE_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "PEOPLE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/my_people.list",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "people_viewed": true,
    "people_dumped": true
  },
  "snapshotPatch": {
    "flags.people_viewed": true,
    "relay.requests.PEOPLE": true,
    "flags.people_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/my_people.list",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_people",
        "contentKey": "CH3_MY_PEOPLE_LIST"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_PEOPLE_DUMPED'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_VIEWED'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_MONITOR_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "MONITOR",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/nexus_monitor.log",
  "allowAnyOutputFile": true,
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "monitor_viewed": true,
    "monitor_dumped": true
  },
  "snapshotPatch": {
    "flags.monitor_viewed": true,
    "relay.requests.MONITOR": true,
    "flags.monitor_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/nexus_monitor.log",
        "pathFromOutputFile": true,
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_monitor",
        "contentKey": "CH3_NEXUS_MONITOR_LOG"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_MONITOR_DUMPED'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true
  }
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_VIEWED'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_FRAGMENT_to_file',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST_TO_FILE",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "FRAGMENT",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "acceptedOutputForms": [
    "REDIRECT_OVERWRITE",
    "TEE"
  ],
  "outputFile": "/home/guest/laplace_fragment_02.sh",
  "allowRelativeOutputFile": true,
  "allowOverwrite": true
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "fragment02_viewed": true,
    "fragment02_dumped": true
  },
  "snapshotPatch": {
    "flags.fragment02_viewed": true,
    "relay.requests.FRAGMENT": true,
    "flags.fragment02_dumped": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_02.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "relay_fragment",
        "contentKey": "LAPLACE_FRAGMENT_02"
      }
    ]
  }
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_02_DUMPED'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_ROUTE_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "ROUTE",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_route_checked": true
  },
  "snapshotPatch": {
    "flags.relay_route_checked": true,
    "relay.requests.ROUTE": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_ROUTE_VIEW'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_POLICY_view',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "POLICY",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "requiredFlags": [
    "relay_contacted"
  ],
  "outputRequired": false
}$json$::jsonb,
    $json${
  "recentResult": "SUCCESS_MOVE",
  "setFlags": {
    "relay_policy_checked": true
  },
  "snapshotPatch": {
    "flags.relay_policy_checked": true,
    "relay.requests.POLICY": true
  }
}$json$::jsonb,
    80
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_POLICY_DENIED'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'relay_request_STATUS',
    'server_rule',
    $json${
  "rule": "RELAY_REQUEST",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "request": "STATUS",
  "acceptedInputForms": [
    "PIPE_ECHO",
    "PIPE_PRINTF",
    "INPUT_REDIRECT",
    "HERE_STRING",
    "HERE_DOC",
    "INTERACTIVE"
  ],
  "outputRequired": false,
  "requiredFlags": [
    "relay_contacted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "relay_status_checked": true
  },
  "snapshotPatch": {
    "flags.relay_status_checked": true,
    "relay.requests.STATUS": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    70
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_STATUS_VIEW'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_RELAY_STATUS_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_PEOPLE_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_PEOPLE_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_MONITOR_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_MONITOR_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_FRAGMENT_02_VIEWED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_FRAGMENT_02_DUMPED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_ROUTE_VIEW';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sh /home/guest/laplace_fragment_02.sh',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/laplace_fragment_02.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredReadable": true,
  "requiredFlags": [
    "fragment02_dumped"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "social_isolation_ready": true
  },
  "snapshotPatch": {
    "flags.social_isolation_ready": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SOCIAL_ISOLATION_READY'
WHERE from_node.code = 'CH3_POLICY_DENIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'validate_core_group_dat_success',
    'server_rule',
    $json${
  "rule": "VALIDATE_CORE_GROUP_DAT",
  "targetFile": "/home/guest/core_group.dat",
  "canonicalAllowedLines": [
    "Home_Contact ACTIVE",
    "Old_Contact ACTIVE",
    "Classmate_21 ACTIVE"
  ],
  "rejectStatuses": [
    "DELETED",
    "UNKNOWN"
  ],
  "allowOrderDifferent": true,
  "allowManualWrite": true,
  "allowDuplicateLines": false,
  "allowMissingActiveNode": false,
  "requiredFlags": [
    "social_isolation_ready"
  ],
  "requiredKnowledge": {
    "people": [
      "people_viewed",
      "people_dumped"
    ],
    "monitor": [
      "monitor_viewed",
      "monitor_dumped"
    ]
  }
}$json$::jsonb,
    $json${
  "setFlags": {
    "core_group_created": true,
    "core_group_validated": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/core_group.dat",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "user_filtered_nodes",
        "contentKey": "CH3_CORE_GROUP_DAT"
      }
    ]
  },
  "snapshotPatch": {
    "flags.core_group_created": true,
    "flags.core_group_validated": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_CORE_GROUP_VALIDATED'
WHERE from_node.code = 'CH3_SOCIAL_ISOLATION_READY';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'validate_core_group_dat_fail',
    'server_rule',
    $json${
  "rule": "VALIDATE_CORE_GROUP_DAT",
  "targetFile": "/home/guest/core_group.dat",
  "canonicalAllowedLines": [
    "Home_Contact ACTIVE",
    "Old_Contact ACTIVE",
    "Classmate_21 ACTIVE"
  ],
  "rejectStatuses": [
    "DELETED",
    "UNKNOWN"
  ],
  "allowOrderDifferent": true,
  "allowManualWrite": true,
  "allowDuplicateLines": false,
  "allowMissingActiveNode": false,
  "requiredFlags": [
    "social_isolation_ready"
  ],
  "requiredKnowledge": {
    "people": [
      "people_viewed",
      "people_dumped"
    ],
    "monitor": [
      "monitor_viewed",
      "monitor_dumped"
    ]
  },
  "expectFailure": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "core_group_created": true
  },
  "snapshotPatch": {
    "flags.core_group_created": true,
    "lastValidationError": "UNSAFE_NODE_INCLUDED"
  },
  "recentResult": "FAIL_VALIDATION_RETRYABLE"
}$json$::jsonb,
    110
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_CORE_GROUP_INVALID'
WHERE from_node.code = 'CH3_SOCIAL_ISOLATION_READY';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'validate_core_group_dat_success',
    'server_rule',
    $json${
  "rule": "VALIDATE_CORE_GROUP_DAT",
  "targetFile": "/home/guest/core_group.dat",
  "canonicalAllowedLines": [
    "Home_Contact ACTIVE",
    "Old_Contact ACTIVE",
    "Classmate_21 ACTIVE"
  ],
  "rejectStatuses": [
    "DELETED",
    "UNKNOWN"
  ],
  "allowOrderDifferent": true,
  "allowManualWrite": true,
  "allowDuplicateLines": false,
  "allowMissingActiveNode": false,
  "requiredFlags": [
    "social_isolation_ready"
  ],
  "requiredKnowledge": {
    "people": [
      "people_viewed",
      "people_dumped"
    ],
    "monitor": [
      "monitor_viewed",
      "monitor_dumped"
    ]
  }
}$json$::jsonb,
    $json${
  "setFlags": {
    "core_group_created": true,
    "core_group_validated": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/core_group.dat",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "user_filtered_nodes",
        "contentKey": "CH3_CORE_GROUP_DAT"
      }
    ]
  },
  "snapshotPatch": {
    "flags.core_group_created": true,
    "flags.core_group_validated": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_CORE_GROUP_VALIDATED'
WHERE from_node.code = 'CH3_CORE_GROUP_INVALID';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'validate_core_group_dat_fail',
    'server_rule',
    $json${
  "rule": "VALIDATE_CORE_GROUP_DAT",
  "targetFile": "/home/guest/core_group.dat",
  "canonicalAllowedLines": [
    "Home_Contact ACTIVE",
    "Old_Contact ACTIVE",
    "Classmate_21 ACTIVE"
  ],
  "rejectStatuses": [
    "DELETED",
    "UNKNOWN"
  ],
  "allowOrderDifferent": true,
  "allowManualWrite": true,
  "allowDuplicateLines": false,
  "allowMissingActiveNode": false,
  "requiredFlags": [
    "social_isolation_ready"
  ],
  "requiredKnowledge": {
    "people": [
      "people_viewed",
      "people_dumped"
    ],
    "monitor": [
      "monitor_viewed",
      "monitor_dumped"
    ]
  },
  "expectFailure": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "core_group_created": true
  },
  "snapshotPatch": {
    "flags.core_group_created": true,
    "lastValidationError": "UNSAFE_NODE_INCLUDED"
  },
  "recentResult": "FAIL_VALIDATION_RETRYABLE"
}$json$::jsonb,
    110
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_CORE_GROUP_INVALID'
WHERE from_node.code = 'CH3_CORE_GROUP_INVALID';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'encrypt_core_group',
    'server_rule',
    $json${
  "rule": "GPG_OUTPUT_EXISTS",
  "inputFile": "/home/guest/core_group.dat",
  "expectedOutput": "/home/guest/core_group.dat.gpg",
  "acceptedOptions": [
    "-c",
    "--symmetric",
    "-o",
    "--output"
  ],
  "requiredFlags": [
    "core_group_validated"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "core_group_encrypted": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/core_group.dat.gpg",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "gpg_symmetric",
        "contentKey": "CH3_CORE_GROUP_GPG"
      }
    ]
  },
  "snapshotPatch": {
    "flags.core_group_encrypted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_CORE_GROUP_ENCRYPTED'
WHERE from_node.code = 'CH3_CORE_GROUP_VALIDATED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'register_safe_zone',
    'server_rule',
    $json${
  "rule": "FILE_EQUIVALENCE",
  "targetFile": "/tmp/safe_zone.dat.gpg",
  "equivalentTo": "/home/guest/core_group.dat.gpg",
  "acceptedCommands": [
    "mv",
    "cp",
    "cat"
  ],
  "requiredFlags": [
    "core_group_encrypted"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "safe_zone_registered": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/tmp/safe_zone.dat.gpg",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "safe_zone_file",
        "contentKey": "CH3_SAFE_ZONE_GPG"
      }
    ]
  },
  "snapshotPatch": {
    "flags.safe_zone_registered": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_SAFE_ZONE_REGISTERED'
WHERE from_node.code = 'CH3_CORE_GROUP_ENCRYPTED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'sever_external_nodes_attempt',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "sh",
  "resolvedPath": "/home/guest/sever_external_nodes.sh",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredFlags": [
    "safe_zone_registered"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "external_sever_attempted": true
  },
  "snapshotPatch": {
    "flags.external_sever_attempted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_EXTERNAL_SEVER_CONFIRM'
WHERE from_node.code = 'CH3_SAFE_ZONE_REGISTERED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'confirmation_stream_to_script',
    'server_rule',
    $json${
  "rule": "CONFIRMATION_STREAM_TO_SCRIPT",
  "scriptPath": "/home/guest/sever_external_nodes.sh",
  "acceptedConfirmationTokens": [
    "y",
    "yes"
  ],
  "minimumConfirmations": 3,
  "acceptedForms": [
    "YES_PIPE",
    "YES_WITH_TOKEN_PIPE",
    "PRINTF_PIPE",
    "WHILE_ECHO_PIPE"
  ],
  "requiredFlags": [
    "external_sever_attempted",
    "safe_zone_registered"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "ghost_mode_enabled": true
  },
  "snapshotPatch": {
    "flags.ghost_mode_enabled": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_GHOST_MODE_ENABLED'
WHERE from_node.code = 'CH3_EXTERNAL_SEVER_CONFIRM';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'discover_fragment_03',
    'server_rule',
    $json${
  "rule": "DISCOVER_FILE",
  "targetFile": "/usr/bin/local/laplace_fragment_03.sh",
  "acceptedCommands": [
    "ls",
    "find"
  ],
  "acceptedForms": [
    "CD_THEN_LS",
    "LS_DIRECTORY",
    "LS_EXACT_FILE",
    "FIND_NAME"
  ],
  "requiredFlags": [
    "ghost_mode_enabled"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "fragment03_found": true
  },
  "snapshotPatch": {
    "flags.fragment03_found": true,
    "terminal.cwd": "/usr/bin/local"
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_03_FOUND'
WHERE from_node.code = 'CH3_GHOST_MODE_ENABLED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'copy_fragment_03_home',
    'server_rule',
    $json${
  "rule": "CREATE_FILE_EQUIVALENT",
  "sourceFile": "/usr/bin/local/laplace_fragment_03.sh",
  "targetFile": "/home/guest/laplace_fragment_03.sh",
  "acceptedCommands": [
    "cp",
    "cat"
  ],
  "allowRelativeSource": true,
  "allowHomeDestination": true,
  "requiredFlags": [
    "fragment03_found"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "fragment03_copied": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace_fragment_03.sh",
        "type": "file",
        "readable": true,
        "executable": true,
        "protected": false,
        "virtual": true,
        "createdBy": "copy_fragment03",
        "contentKey": "LAPLACE_FRAGMENT_03"
      }
    ]
  },
  "snapshotPatch": {
    "flags.fragment03_copied": true,
    "terminal.cwd": "/home/guest"
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_FRAGMENT_03_COPIED'
WHERE from_node.code = 'CH3_FRAGMENT_03_FOUND';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'create_laplace_qasm',
    'server_rule',
    $json${
  "rule": "FILE_COMPOSITION",
  "targetFile": "/home/guest/laplace.qasm",
  "orderedSources": [
    "/home/guest/laplace_fragment_01.sh",
    "/home/guest/laplace_fragment_02.sh",
    "/home/guest/laplace_fragment_03.sh"
  ],
  "acceptedForms": [
    "CAT_WILDCARD_REDIRECT",
    "CAT_EXPLICIT_REDIRECT",
    "CAT_APPEND_SEQUENCE"
  ],
  "allowWildcard": true,
  "allowAppendSequence": true,
  "requiredFlags": [
    "fragment03_copied"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "laplace_qasm_created": true
  },
  "vfsOverlay": {
    "createdNodes": [
      {
        "path": "/home/guest/laplace.qasm",
        "type": "file",
        "readable": true,
        "executable": false,
        "protected": false,
        "virtual": true,
        "createdBy": "file_composition",
        "contentKey": "LAPLACE_QASM"
      }
    ]
  },
  "snapshotPatch": {
    "flags.laplace_qasm_created": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_LAPLACE_QASM_CREATED'
WHERE from_node.code = 'CH3_FRAGMENT_03_COPIED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'check_laplace_qasm',
    'server_rule',
    $json${
  "rule": "HASH_FILE_CHECK",
  "targetFile": "/home/guest/laplace.qasm",
  "acceptedCommands": [
    {
      "command": "sha256sum"
    },
    {
      "command": "shasum",
      "requiredArgs": [
        "-a",
        "256"
      ]
    }
  ],
  "requiredFlags": [
    "laplace_qasm_created"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "core_access_blocked": true
  },
  "snapshotPatch": {
    "flags.core_access_blocked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_CORE_ACCESS_BLOCKED'
WHERE from_node.code = 'CH3_LAPLACE_QASM_CREATED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'click',
    'complete_chapter',
    'exact',
    $json${
  "rule": "EXACT_VALUE",
  "value": "complete_chapter"
}$json$::jsonb,
    $json${
  "setFlags": {
    "chapter3_completed": true
  },
  "markCheckpoint": true,
  "snapshotPatch": {
    "flags.chapter3_completed": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    100
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_COMPLETE'
WHERE from_node.code = 'CH3_CORE_ACCESS_BLOCKED';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'cat /home/guest/.bash_history',
    'server_rule',
    $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "cat",
  "resolvedPath": "/home/guest/.bash_history",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "allowHomeAlias": true,
  "requiredReadable": true
}$json$::jsonb,
    $json${
  "setFlags": {
    "home_rechecked": true,
    "bash_history_checked": true
  },
  "snapshotPatch": {
    "flags.home_rechecked": true,
    "flags.bash_history_checked": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_HISTORY_VIEW'
WHERE from_node.code = 'CH3_SERVER_AFTER_DECOY';

INSERT INTO story_transitions (
    from_node_id, to_node_id, action_type, expected_input, validator_type, validator_config, effect_bundle, priority
)
SELECT
    from_node.id,
    to_node.id,
    'command',
    'connect_relay_empty',
    'server_rule',
    $json${
  "rule": "CONNECT_RELAY",
  "hostAliases": [
    "127.0.0.1",
    "localhost"
  ],
  "port": 9091,
  "acceptedCommands": [
    "nc"
  ],
  "timeoutOptional": true,
  "stdinRequired": false,
  "requiredFlags": [
    "bash_history_checked"
  ]
}$json$::jsonb,
    $json${
  "setFlags": {
    "port_9091_discovered": true,
    "relay_contacted": true
  },
  "snapshotPatch": {
    "flags.port_9091_discovered": true,
    "flags.relay_contacted": true,
    "relay.discovered": true,
    "relay.contacted": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
    90
FROM story_nodes from_node
JOIN story_nodes to_node ON to_node.code = 'CH3_RELAY_EMPTY_RESPONSE'
WHERE from_node.code = 'CH3_HISTORY_VIEW';

COMMIT;
