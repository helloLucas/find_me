-- Chapter 2 seed_nodes.sql

-- Generated from Chapter 2 finalized technical decisions.

BEGIN;


INSERT INTO chapters (code, title, sort_order)
VALUES ('week02', 'Chapter 2 - Null Point Server', 2)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order;

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_SERVER_HOME',
    'console',
    $json${
  "scene": {
    "id": "CH2_SERVER_HOME",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SSH] connection established.",
      "[SESSION] lucas-server safe shell opened.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "접속 성공이야!",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "여긴 내 개인 서버, 시스템의 눈을 피할 수 있는 유일한 대피소지.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "설명만으로는 못 믿겠지. 직접 봐. 이 서버에 남아 있는 파일들이 지금 바깥에서 무슨 일이 벌어지는지 보여줄 거야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_FILE_LIST',
    'console',
    $json${
  "scene": {
    "id": "CH2_FILE_LIST",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "world_map.map",
      "observer_status.log",
      "lucas_fragment_01.sh",
      "laplace_fragment_01.sh",
      "trash/",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "먼저 지도를 봐. 네가 왜 여기까지 끌려왔는지 이해하게 될 거야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_OBSERVER_STATUS_VIEW',
    'console',
    $json${
  "scene": {
    "id": "CH2_OBSERVER_STATUS_VIEW",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[OBSERVER STATUS LOG]",
      "Observer ID        : UNKNOWN",
      "Observer Class     : Abnormal",
      "Session Link       : ACTIVE",
      "Detection Risk     : RISING",
      "GC Interest Level  : LOW -> MEDIUM",
      "Privilege Level    : guest",
      "",
      "Notes:",
      "- External world stability linked to observer focus",
      "- Unauthorized inspection detected",
      "- Cleanup priority under review",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네가 기사 페이지를 뜯어본 순간부터 놈들이 널 추적 중이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "지금은 아직 완전히 들키진 않았지만… 오래 못 버텨.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_LUCAS_FRAGMENT_VIEW',
    'console',
    $json${
  "scene": {
    "id": "CH2_LUCAS_FRAGMENT_VIEW",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "#!/bin/sh",
      "# lucas_fragment_01.sh",
      "# observer relay attempt :: partial",
      "",
      "echo \"[TRACE FOUND]\"",
      "echo \"[MEMORY STATE: FRAGMENTED]\"",
      "echo \"[RELAY STATE: OPEN_PENDING]\"",
      "echo \"[STATUS] 외부 입력 없이는 진행 불가\"",
      "",
      "# human-triggered execution only",
      "# self-init denied",
      "# waiting for observer action",
      "",
      "echo \"나는 신호를 보낼 수는 있지만,\"",
      "echo \"문을 여는 건 이 바깥의 입력뿐이다.\"",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_LUCAS_FRAGMENT_EXEC_FAILED',
    'console',
    $json${
  "scene": {
    "id": "CH2_LUCAS_FRAGMENT_EXEC_FAILED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[FAILED] 이 파편은 독립적으로 실행되지 않습니다.",
      "[TRACE] 외부 관측자 입력이 필요한 상태입니다.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그건 내가 남긴 흔적일 뿐이야. 지금 실행해야 할 건 라플라스 파편이야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_WORLD_MAP_VIEW',
    'console',
    $json${
  "scene": {
    "id": "CH2_WORLD_MAP_VIEW",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 1,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SESSION MAP UPDATE]",
      "",
      "             [Harbor]   [Null]   [Deleted]",
      "        [Market]   [Null]   [Power Grid]",
      "   [Old Town] [Deleted] [PLAYER_ZONE] [River] [Null]",
      "        [School]   [Housing]   [Deleted]",
      "             [Terminal] [Null]   [Outlands]",
      "",
      "Boundary Stability: 6%",
      "External Region Integrity: collapsing...",
      "",
      "[SESSION MAP : NULL POINT / YEAR 2088]",
      "",
      "             [Deleted] [Deleted] [Deleted]",
      "        [Deleted] [Null]    [Null]    [Deleted]",
      "   [Deleted] [Null]   [PLAYER_ZONE]   [Null] [Deleted]",
      "        [Deleted] [Null]    [Null]    [Deleted]",
      "             [Deleted] [Deleted] [Deleted]",
      "",
      "Active Observer Region: PLAYER_ZONE",
      "Boundary Stability: 12%",
      "External Region Integrity: collapsing..."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "저게 지금 바깥의 상태야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네가 보고 있는 구역만 간신히 유지되고 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "저 삭제 선에 닿으면 너와 네 친구, 그리고 부모님까지도 존재 자체가 증발할거야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'none',
    NULL,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_GC_SCAN_ALERT',
    'console',
    $json${
  "scene": {
    "id": "CH2_GC_SCAN_ALERT",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 1,
    "scanPercent": 1,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM_ALERT] 비정상적인 프로세스 점유 감지",
      "[SYSTEM_ALERT] 가비지 컬렉터 스캔 시작... 0.1% 완료",
      "[SYSTEM] GC Scanning... [|---------] 01%",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "속도가 생각보다 빨라! 내가 시스템 보안 노드를 교란하는 동안, 너는 내 파편 파일(laplace_fragment_01.sh)을 실행해서 가짜 데이터 패킷을 생성해줘!",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "놈들의 스캔 레이더를 흐려야 해!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_LAPLACE_MISSION_READY',
    'console',
    $json${
  "scene": {
    "id": "CH2_LAPLACE_MISSION_READY",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 1,
    "scanPercent": 18,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LAPLACE FRAGMENT 01 :: DECOY PACKET]",
      "Mission: Generate a fake data mass and redirect GC scan path.",
      "Status: ACTIVE",
      "",
      "Hint:",
      "- Collect disposable temporary data.",
      "- Avoid protected core fragments.",
      "",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아, 일단 주변의 무의미한 데이터들을 다 긁어모아. 그래야 큰 덩어리를 만들 수 있어.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_TMP_SEARCH_RESULT',
    'console',
    $json${
  "scene": {
    "id": "CH2_TMP_SEARCH_RESULT",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 1,
    "scanPercent": 42,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "./sys/temp/Memory_Dump_082.tmp",
      "./cache/User_Behavior_88.tmp",
      "./tmp/System_Temp_File.tmp",
      "./root/hidden/L_fragment_core.tmp",
      "",
      "[ANALYZING] 가용 데이터 노드 검색 완료...",
      "-------------------------------------------",
      "INDEX | FILE_PATH                       | SIZE",
      "  1   | ./sys/temp/Memory_Dump_082.tmp  | 1.2MB",
      "  2   | ./cache/User_Behavior_88.tmp    | 0.8MB",
      "  3   | ./tmp/System_Temp_File.tmp      | 4.5MB",
      "-------------------------------------------",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "저기 있는 임시 파일들을 합쳐서 거대한 가짜 패킷을 만들어야 해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "보호된 코어 조각은 건드리지 마. 지금 필요한 건 미끼야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_PROTECTED_CORE_DENIED',
    'console',
    $json${
  "scene": {
    "id": "CH2_PROTECTED_CORE_DENIED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 2,
    "scanPercent": 57,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "./sys/temp/Memory_Dump_082.tmp",
      "./cache/User_Behavior_88.tmp",
      "./tmp/System_Temp_File.tmp",
      "tar: ./root/hidden/L_fragment_core.tmp: Cannot open: Permission denied",
      "tar: Exiting with failure status due to previous errors",
      "",
      "[ERROR] 보호된 코어 조각에 접근할 수 없습니다.",
      "[GC SCAN] 관심도 상승... 57%",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "멈춰! 그건 root 영역이야!",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "지금 필요한 건 놈들을 속일 미끼지, 진짜 코어를 건드리는 게 아니야!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_DECOY_CREATED',
    'console',
    $json${
  "scene": {
    "id": "CH2_DECOY_CREATED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 2,
    "scanPercent": 58,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[WAITING] 데이터 결합 중... 30%... 70%... 완료.",
      "[OUTPUT] decoy.tar 생성 완료",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 이제 그 패킷을 감시망이 훑고 지나가는 포트로 흘려보내.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_DECOY_SENT',
    'console',
    $json${
  "scene": {
    "id": "CH2_DECOY_SENT",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 2,
    "scanPercent": 63,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[WARNING] 비정상적인 패킷 유입 감지.",
      "[ROUTE] 감시 프로세스가 gate_04 구역으로 이동합니다.",
      "[SYSTEM] GC Scanning... [||||||----] 63%",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "성공이야! 놈들이 가짜 패킷에 낚였어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "하지만 우리 흔적이 남으면 안 돼. 지금 당장 접속 로그를 지워줘!",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_TRACE_CLEANED',
    'console',
    $json${
  "scene": {
    "id": "CH2_TRACE_CLEANED",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[CLEAN] 접속 기록 삭제 완료.",
      "[SYSTEM] GC Scanning... [----------] 00%"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "하아... 죽는 줄 알았네. 역시 넌 내가 선택한 유일한 관측자답다.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이제 네가 봐야 할 게 있어. 내가 왜 여기까지 도망쳤는지 알게 될 거야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'click',
    $json${
  "allowedActions": [
    "click"
  ],
  "buttons": [
    {
      "label": "복구 문서 확인",
      "value": "view_recovered_document"
    }
  ]
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_RECOVERED_DOCUMENT',
    'console',
    $json${
  "scene": {
    "id": "CH2_RECOVERED_DOCUMENT",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": true
  },
  "content": {
    "documentId": "nexus_secret_document.png",
    "terminalOutput": [
      "[RECOVERED DOCUMENT FRAGMENT]",
      "NEXUS INTERNAL / REDACTED",
      "",
      "\"...대규모 세션 최적화를 위해 비활성 인구 데이터를 정리한다...\"",
      "\"...삭제는 실종이나 사고로 위장 가능...\"",
      "\"...관측자 개입 가능성 존재 시 우선 정리...\""
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "난 이 세계의 사람들이 이유 없이 사라지는 게 아니라, 시스템이 메모리 절약을 위해 그들을 죽이고 있다는 걸 증명하려다 이렇게 됐어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "넌 그들의 희생을 멈출 수 있는 마지막 희망이야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'none',
    $json${
  "allowedActions": [],
  "buttons": []
}$json$::jsonb,
    TRUE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_COMPLETE',
    'ending',
    $json${
  "scene": {
    "id": "CH2_COMPLETE",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[CHAPTER 2 COMPLETE]",
      "[STATUS] Null Point temporary stabilized."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "잠깐 숨을 돌릴 수 있게 됐어. 하지만 이건 시작일 뿐이야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'none',
    NULL,
    TRUE,
    TRUE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_FAIL_WRONG_ORDER',
    'console',
    $json${
  "scene": {
    "id": "CH2_FAIL_WRONG_ORDER",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 0,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[WAIT] 아직 이 명령을 실행할 조건이 맞춰지지 않았습니다.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "순서가 꼬였어. 지금 필요한 단계부터 다시 확인해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'command',
    $json${
  "allowedActions": [
    "command"
  ],
  "placeholder": "guest@lucas-server:~$",
  "validationHint": "terminal_command",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter2"
}$json$::jsonb,
    FALSE,
    FALSE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week02'
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
    'CH2_FAIL_GC_TRACE_COMPLETE',
    'ending',
    $json${
  "scene": {
    "id": "CH2_FAIL_GC_TRACE_COMPLETE",
    "mode": "terminal",
    "bgm": "server_hum",
    "glitchLevel": 3,
    "scanPercent": 100,
    "resetTerminal": true
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM] GC Scanning... [||||||||||] 100%",
      "[TRACE COMPLETE]",
      "[OBSERVER LOCATION CONFIRMED]",
      "[CLEANUP INITIATED]"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "...젠장. 늦었어.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true
  }
}$json$::jsonb,
    'click',
    $json${
  "allowedActions": [
    "click"
  ],
  "buttons": [
    {
      "label": "체크포인트부터 다시 시도",
      "value": "retry_from_checkpoint"
    }
  ]
}$json$::jsonb,
    FALSE,
    TRUE
FROM chapter_row
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();


COMMIT;
