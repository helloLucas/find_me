-- Runtime patch: Chapter 2 terminal UX tolerance update.
-- Run after patch_story_transitions_natural_key.sql has been applied.
-- Static VFS changes are in story/chapter02/vfs.json and require backend redeploy.

BEGIN;

UPDATE story_nodes
SET output_bundle = jsonb_set(
        output_bundle,
        '{content,terminalOutput}',
        '[
          "cache/",
          "laplace_fragment_01.sh",
          "lucas_fragment_01.sh",
          "observer_status.log",
          "root/",
          "sys/",
          "tmp/",
          "trash/",
          "world_map.map"
        ]'::jsonb,
        true
    ),
    updated_at = NOW()
WHERE code = 'CH2_FILE_LIST';

UPDATE story_nodes
SET output_bundle = jsonb_set(
        output_bundle,
        '{content,terminalOutput}',
        '[
          "[LAPLACE FRAGMENT 01 :: DECOY PACKET]",
          "Status: ACTIVE",
          "",
          "Residue pattern : *.tmp",
          "Archive target  : decoy.tar",
          "Restricted area : root/",
          ""
        ]'::jsonb,
        true
    ),
    updated_at = NOW()
WHERE code = 'CH2_LAPLACE_MISSION_READY';

UPDATE story_nodes
SET output_bundle = jsonb_set(
        output_bundle,
        '{messages}',
        '[
          {
            "speaker": "LUCAS",
            "channel": "bubble",
            "text": "좋아, 일단 주변의 무의미한 데이터들을 다 긁어모아. 그래야 큰 덩어리를 만들 수 있어.",
            "blocking": true
          },
          {
            "speaker": "LUCAS",
            "channel": "bubble",
            "text": "root 안쪽의 보호된 코어 조각은 섞지 마. 지금 필요한 건 미끼야.",
            "blocking": true
          }
        ]'::jsonb,
        true
    ),
    updated_at = NOW()
WHERE code = 'CH2_LAPLACE_MISSION_READY';

UPDATE story_nodes
SET output_bundle = jsonb_set(
        output_bundle,
        '{messages}',
        '[
          {
            "speaker": "LUCAS",
            "channel": "bubble",
            "text": "포장이 끝났네. 이제 저 미끼 파일을 시스템 내부 데이터 게이트로 보내서 감시자들의 눈을 속여보자.",
            "blocking": true
          },
          {
            "speaker": "LUCAS",
            "channel": "bubble",
            "text": "내부망 주소인 127.0.0.1의 8080번 포트로 연결을 열고 저 패킷을 전송해. 놈들이 가짜 데이터를 분석하느라 한참 동안 버벅댈 거야.",
            "blocking": true
          }
        ]'::jsonb,
        true
    ),
    updated_at = NOW()
WHERE code = 'CH2_DECOY_CREATED';

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
),
node_rows AS (
    SELECT *
    FROM (VALUES
        (
            'CH2_TRACE_FILE_REMOVED',
            'console',
            $json${
  "scene": {
    "id": "CH2_TRACE_FILE_REMOVED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 2,
    "scanPercent": 63,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": []
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "decoy.tar는 지워졌어. 이제 접속 기록도 비워야 해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
            $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
            false,
            false
        ),
        (
            'CH2_HISTORY_CLEARED',
            'console',
            $json${
  "scene": {
    "id": "CH2_HISTORY_CLEARED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 2,
    "scanPercent": 63,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": []
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "접속 기록은 비워졌어. decoy.tar도 남기면 안 돼.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
            $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
            false,
            false
        )
    ) AS rows(code, node_type, output_bundle, prompt_meta, is_checkpoint, is_terminal)
)
INSERT INTO story_nodes (
    chapter_id,
    code,
    node_type,
    output_bundle,
    prompt_type,
    prompt_meta,
    is_checkpoint,
    is_terminal
)
SELECT
    chapter_row.id,
    node_rows.code,
    node_rows.node_type,
    node_rows.output_bundle,
    'command',
    node_rows.prompt_meta,
    node_rows.is_checkpoint,
    node_rows.is_terminal
FROM chapter_row
CROSS JOIN node_rows
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH transition_rows AS (
    SELECT *
    FROM (VALUES
        (
            'CH2_LAPLACE_MISSION_READY',
            'CH2_TMP_SEARCH_RESULT',
            'command',
            'find . -name "*.tmp"',
            'server_rule',
            $json${
  "rule": "FIND_TMP_COMMAND",
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
        ),
        (
            'CH2_LAPLACE_MISSION_READY',
            'CH2_PROTECTED_CORE_DENIED',
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
    "laplace_mission_started"
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
        ),
        (
            'CH2_LAPLACE_MISSION_READY',
            'CH2_DECOY_CREATED',
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
    "laplace_mission_started"
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
        ),
        (
            'CH2_TMP_SEARCH_RESULT',
            'CH2_PROTECTED_CORE_DENIED',
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
    "laplace_mission_started"
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
        ),
        (
            'CH2_TMP_SEARCH_RESULT',
            'CH2_DECOY_CREATED',
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
    "laplace_mission_started"
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
        ),
        (
            'CH2_PROTECTED_CORE_DENIED',
            'CH2_PROTECTED_CORE_DENIED',
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
    "laplace_mission_started"
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
        ),
        (
            'CH2_PROTECTED_CORE_DENIED',
            'CH2_DECOY_CREATED',
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
    "laplace_mission_started"
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
        ),
        (
            'CH2_DECOY_SENT',
            'CH2_TRACE_CLEANED',
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
    "trace_file_removed": true,
    "history_cleared": true,
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
        ),
        (
            'CH2_DECOY_SENT',
            'CH2_TRACE_CLEANED',
            'command',
            'clean_trace_history_first',
            'server_rule',
            $json${
  "rule": "CHAINED_COMMAND",
  "operator": "&&",
  "commands": [
    {
      "command": "history",
      "args": [
        "-c"
      ]
    },
    {
      "command": "rm",
      "resolvedPath": "/home/guest/decoy.tar"
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
    "trace_file_removed": true,
    "history_cleared": true,
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
        ),
        (
            'CH2_DECOY_SENT',
            'CH2_TRACE_FILE_REMOVED',
            'command',
            'rm_decoy_partial',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "rm",
  "resolvedPath": "/home/guest/decoy.tar",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredFlags": [
    "decoy_sent"
  ],
  "requiredCreatedFiles": [
    "/home/guest/decoy.tar"
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "trace_file_removed": true,
    "decoy_created": false
  },
  "vfsOverlay": {
    "removedPaths": [
      "/home/guest/decoy.tar"
    ]
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH2_DECOY_SENT',
            'CH2_HISTORY_CLEARED',
            'command',
            'history_clear_partial',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "command": "history",
  "args": [
    "-c"
  ],
  "requiredFlags": [
    "decoy_sent"
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "history_cleared": true
  },
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            80
        ),
        (
            'CH2_TRACE_FILE_REMOVED',
            'CH2_TRACE_CLEANED',
            'command',
            'history_clear_after_rm',
            'server_rule',
            $json${
  "rule": "NORMALIZED_COMMAND",
  "command": "history",
  "args": [
    "-c"
  ],
  "requiredFlags": [
    "decoy_sent",
    "trace_file_removed"
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "history_cleared": true,
    "trace_cleaned": true
  },
  "setScanPercent": 0,
  "recentResult": "SUCCESS_MOVE"
}$json$::jsonb,
            100
        ),
        (
            'CH2_HISTORY_CLEARED',
            'CH2_TRACE_CLEANED',
            'command',
            'rm_decoy_after_history',
            'server_rule',
            $json${
  "rule": "VIRTUAL_FS_COMMAND",
  "command": "rm",
  "resolvedPath": "/home/guest/decoy.tar",
  "allowRelativePath": true,
  "allowAbsolutePath": true,
  "requiredFlags": [
    "decoy_sent",
    "history_cleared"
  ],
  "requiredCreatedFiles": [
    "/home/guest/decoy.tar"
  ]
}$json$::jsonb,
            $json${
  "setFlags": {
    "trace_file_removed": true,
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
        ),
        (
            'CH2_FAIL_GC_TRACE_COMPLETE',
            'CH2_LAPLACE_MISSION_READY',
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
    "trace_file_removed": false,
    "history_cleared": false,
    "trace_cleaned": false
  },
  "setScanPercent": 18,
  "recentResult": "RETRY_FROM_CHECKPOINT"
}$json$::jsonb,
            100
        )
    ) AS rows(
        from_code,
        to_code,
        action_type,
        expected_input,
        validator_type,
        validator_config,
        effect_bundle,
        priority
    )
)
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
    transition_rows.action_type,
    transition_rows.expected_input,
    transition_rows.validator_type,
    transition_rows.validator_config,
    transition_rows.effect_bundle,
    transition_rows.priority
FROM transition_rows
JOIN story_nodes from_node ON from_node.code = transition_rows.from_code
JOIN story_nodes to_node ON to_node.code = transition_rows.to_code
ON CONFLICT (from_node_id, action_type, expected_input, validator_type) DO UPDATE
SET to_node_id = EXCLUDED.to_node_id,
    validator_config = EXCLUDED.validator_config,
    fail_node_id = EXCLUDED.fail_node_id,
    effect_bundle = EXCLUDED.effect_bundle,
    priority = EXCLUDED.priority;

COMMIT;
