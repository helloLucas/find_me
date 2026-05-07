-- seed_nodes_ch3_corrected.sql
-- 용도: Chapter 3 수정본 노드 전체를 삽입/갱신합니다.
-- 실행 순서: 이 파일 실행 후 seed_transitions_ch3_corrected.sql을 실행하십시오.
-- 핵심 수정: CH3_FRIEND_CALL 도입 통화 노드를 별도로 추가하고, CH3_SERVER_AFTER_DECOY는 서버 알림/루카스 안내 노드로 분리합니다.

BEGIN;

ALTER TABLE chapters ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO chapters (code, title, sort_order, is_published)
VALUES ('week03', 'Chapter 3 - Social Isolation', 3, true)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order,
    is_published = EXCLUDED.is_published;


-- 1. Chapter 3 도입 통화 노드
WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FRIEND_CALL',
    'narrative',
    $json${
  "scene": {
    "id": "CH3_FRIEND_CALL",
    "mode": "call",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": []
  },
  "messages": [
    {
      "speaker": "FRIEND",
      "channel": "call",
      "text": "{플레이어 이름}... 너 지금 뉴스 보고 있어?",
      "blocking": true
    },
    {
      "speaker": "FRIEND",
      "channel": "call",
      "text": "여기 이상해. 사람들이 멈춘 것처럼 서 있다가... 하나씩 화면에서 지워지고 있어.",
      "blocking": true
    },
    {
      "speaker": "FRIEND",
      "channel": "call",
      "text": "방금 내 앞에 있던 사람이 사라졌는데, 아무도 그 사람을 기억 못 해.",
      "blocking": true
    },
    {
      "speaker": "FRIEND",
      "channel": "call",
      "text": "잠깐만... 나도 이름이 생각이 안 나.",
      "blocking": true
    },
    {
      "speaker": "FRIEND",
      "channel": "call",
      "text": "내가 누구한테 전화한 거였지?",
      "blocking": true
    },
    {
      "speaker": "SYSTEM",
      "channel": "terminal_notice",
      "text": "[Disconnected: Node_Deleted]",
      "blocking": true
    }
  ],
  "notifications": [
    {
      "type": "call",
      "title": "통화 종료",
      "body": "Disconnected: Node_Deleted",
      "priority": "critical"
    }
  ],
  "uiMarkers": {
    "showCallOverlay": true,
    "callStatus": "disconnected"
  },
  "effects": {
    "showDogAvatar": false,
    "playSound": "session_deleted",
    "glitchLevel": 2
  }
}$json$::jsonb,
    'click',
    $json${
  "allowedActions": ["click"],
  "buttons": [
    {
      "label": "계속",
      "value": "continue"
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


-- 2. Chapter 3 기존 노드 전체
WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_SERVER_AFTER_DECOY',
    'console',
    $json${
  "scene": {
    "id": "CH3_SERVER_AFTER_DECOY",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[NEXUS SESSION NOTICE]",
      "Remote contact lost.",
      "Node status changed: ACTIVE -> DELETED",
      "",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "방금 네 친구 세션이 끊겼어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "삭제 범위가 넓어지고 있어. 이제 네 주변 연결까지 직접 건드리기 시작한 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "조금 전 네가 보낸 decoy packet이 감시 경로를 잠깐 틀어놓긴 했어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그런데 그 뒤로 이상한 반응이 하나 잡혀.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "내 서버에 데이터가 생긴 건 아니야. 어딘가랑 잘못 이어진 흔적이 남은 것 같아.",
      "blocking": true
    }
  ],
  "notifications": [
    {
      "type": "system",
      "title": "Remote contact lost",
      "body": "Node status changed: ACTIVE -> DELETED",
      "priority": "critical"
    }
  ],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "session_deleted"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_HOME_RECHECK',
    'console',
    $json${
  "scene": {
    "id": "CH3_HOME_RECHECK",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "total 40",
      "drwxr-xr-x  6 guest guest 4096 Apr 14 23:16 .",
      "drwxr-xr-x  3 root  root  4096 Apr 14 22:58 ..",
      "-rw-------  1 guest guest  214 Apr 14 23:16 .bash_history",
      "-rw-r--r--  1 guest guest  319 Apr 14 23:15 gate_04.trace",
      "-rw-r--r--  1 guest guest  842 Apr 14 23:02 observer_status.log",
      "-rw-r--r--  1 guest guest  911 Apr 14 23:01 world_map.map",
      "-rw-r--r--  1 guest guest  512 Apr 14 23:04 lucas_fragment_01.sh",
      "-rwxr-xr-x  1 guest guest  612 Apr 14 23:05 laplace_fragment_01.sh",
      "-rwxr-xr-x  1 guest guest  734 Apr 14 23:16 sever_external_nodes.sh",
      "drwxr-xr-x  2 guest guest 4096 Apr 14 23:03 trash",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": ".bash_history가 바뀌었어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "내가 실행한 건 아니야. decoy가 들어간 뒤에 이 세션에서 뭔가 자동으로 움직였어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "기록부터 보자.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_HISTORY_VIEW',
    'console',
    $json${
  "scene": {
    "id": "CH3_HISTORY_VIEW",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "tar -cvf decoy.tar ./sys/temp/Memory_Dump_082.tmp ./cache/User_Behavior_88.tmp ./tmp/System_Temp_File.tmp",
      "nc -w 3 127.0.0.1 8080 < decoy.tar",
      "rm decoy.tar",
      "nmap -sV 127.0.0.1",
      "nc -w 3 127.0.0.1 9091",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "앞의 세 줄은 네가 조금 전에 실행한 기록이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그런데 뒤의 두 줄은 아니야. 누군가 포트를 훑어보고, 9091번에 접속했어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그 포트가 아직 열려 있는지 확인해봐.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_PORT_DISCOVERED',
    'console',
    $json${
  "scene": {
    "id": "CH3_PORT_DISCOVERED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "Starting Nmap 7.94",
      "Nmap scan report for localhost (127.0.0.1)",
      "Host is up.",
      "",
      "PORT     STATE SERVICE      VERSION",
      "22/tcp   open  ssh          OpenSSH 8.9",
      "8080/tcp open  http         local relay stub",
      "9091/tcp open  unknown",
      "",
      "1 service unrecognized despite returning data.",
      "Service detection performed.",
      "Nmap done: 1 IP address scanned.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "9091번... 아직 열려 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "서비스 이름도 제대로 안 잡히는데 응답은 하고 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이 서버에 원래 있던 포트는 아니야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "방금 우리가 던진 미끼에 뭐가 딸려온 것 같아.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "히스토리에 남은 것처럼 한번 접속해봐. 무슨 응답이 오는지 봐야 해.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_RELAY_EMPTY_RESPONSE',
    'console',
    $json${
  "scene": {
    "id": "CH3_RELAY_EMPTY_RESPONSE",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "NXR/0.3",
      "mode: ro",
      "origin: gate_04",
      "session: redirected",
      "window: unstable",
      "",
      "ERR empty request",
      "last accepted: STATUS",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "응답이 왔어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "쓰기 권한은 막혀 있는데, 읽는 건 되는 것 같아.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "gate_04... 네가 미끼를 보냈던 그 경로야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "방금은 아무 요청도 안 보내서 튕긴 거고, 마지막으로 받아들인 요청 이름만 남겼어.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_RELAY_STATUS_VIEW',
    'console',
    $json${
  "scene": {
    "id": "CH3_RELAY_STATUS_VIEW",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "NXR/0.3",
      "mode: ro",
      "origin: gate_04",
      "session: redirected",
      "window: unstable",
      "",
      "cache:",
      "- people.partial",
      "- monitor.tail",
      "- fragment.locked",
      "- route.stale",
      "- policy.denied",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "캐시 이름들이 남았어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "완전한 파일은 아니고, 방금 새어 나온 조각들 같아.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "people, monitor, fragment... 이름만 보면 뭐가 들어 있을지는 대충 보이네.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "조심해. 이 통로가 오래 열려 있을 것 같진 않아.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_PEOPLE_VIEWED',
    'console',
    $json${
  "scene": {
    "id": "CH3_PEOPLE_VIEWED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[MY PEOPLE / OBSERVER GH-0104]",
      "",
      "Home_Contact ACTIVE",
      "Old_Contact ACTIVE",
      "Friend_04 DELETED",
      "Classmate_21 ACTIVE",
      "Unknown_719 UNKNOWN",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네 주변 노드야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "넥서스는 사람을 이름으로 기억하지 않아. 상태값으로만 봐.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "Friend_04가... DELETED로 바뀌었어.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_PEOPLE_DUMPED',
    'console',
    $json${
  "scene": {
    "id": "CH3_PEOPLE_DUMPED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[MY PEOPLE / OBSERVER GH-0104]",
      "",
      "Home_Contact ACTIVE",
      "Old_Contact ACTIVE",
      "Friend_04 DELETED",
      "Classmate_21 ACTIVE",
      "Unknown_719 UNKNOWN",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네 주변 노드야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "넥서스는 사람을 이름으로 기억하지 않아. 상태값으로만 봐.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "Friend_04가... DELETED로 바뀌었어.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_MONITOR_VIEWED',
    'console',
    $json${
  "scene": {
    "id": "CH3_MONITOR_VIEWED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[NEXUS_MONITOR_LOG_DUMP_2088]",
      "[2088-04-14 23:08] [INFO] Global Session Memory at 98.4%. Triggering Auto-Optimization.",
      "[2088-04-14 23:09] [WARN] GC_Priority_Queue updated. Targeting Low-Activity Nodes.",
      "[2088-04-14 23:10] [EXEC] Node_Group(Seoul_Sector_4) : 4,021 Connections Severed. Status -> DELETED",
      "[2088-04-14 23:11] [CRITICAL] Observer(Player) anomaly detected. Allocating extra memory to local render.",
      "[2088-04-14 23:11] [EXEC] Reclaiming memory from surrounding nodes to sustain Observer render.",
      "[2088-04-14 23:11] [EXEC] Node(Friend_04) status changed: ACTIVE -> DELETED",
      "[2088-04-14 23:11] [EXEC] Node(Friend_04) deallocation approved.",
      "[2088-04-14 23:12] [WARN] DELETED nodes cannot be protected by guest permission.",
      "[2088-04-14 23:12] [WARN] UNKNOWN nodes may expose observer route.",
      "[2088-04-14 23:12] [INFO] Optimization complete. 1.2PB memory freed.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "...봤지?",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네 친구는 사고로 사라진 게 아니야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "시스템이 네 주변 공간을 유지하려고, 네 친구 쪽 메모리를 회수한 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그리고 지금 네 권한으로는 이미 삭제된 노드를 보호할 수 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "되돌리려면 더 높은 권한이 필요해. guest로는 안 돼.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "monitor_log_revealed"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_MONITOR_DUMPED',
    'console',
    $json${
  "scene": {
    "id": "CH3_MONITOR_DUMPED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[NEXUS_MONITOR_LOG_DUMP_2088]",
      "[2088-04-14 23:08] [INFO] Global Session Memory at 98.4%. Triggering Auto-Optimization.",
      "[2088-04-14 23:09] [WARN] GC_Priority_Queue updated. Targeting Low-Activity Nodes.",
      "[2088-04-14 23:10] [EXEC] Node_Group(Seoul_Sector_4) : 4,021 Connections Severed. Status -> DELETED",
      "[2088-04-14 23:11] [CRITICAL] Observer(Player) anomaly detected. Allocating extra memory to local render.",
      "[2088-04-14 23:11] [EXEC] Reclaiming memory from surrounding nodes to sustain Observer render.",
      "[2088-04-14 23:11] [EXEC] Node(Friend_04) status changed: ACTIVE -> DELETED",
      "[2088-04-14 23:11] [EXEC] Node(Friend_04) deallocation approved.",
      "[2088-04-14 23:12] [WARN] DELETED nodes cannot be protected by guest permission.",
      "[2088-04-14 23:12] [WARN] UNKNOWN nodes may expose observer route.",
      "[2088-04-14 23:12] [INFO] Optimization complete. 1.2PB memory freed.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "...봤지?",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네 친구는 사고로 사라진 게 아니야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "시스템이 네 주변 공간을 유지하려고, 네 친구 쪽 메모리를 회수한 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그리고 지금 네 권한으로는 이미 삭제된 노드를 보호할 수 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "되돌리려면 더 높은 권한이 필요해. guest로는 안 돼.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "monitor_log_revealed"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FRAGMENT_02_VIEWED',
    'console',
    $json${
  "scene": {
    "id": "CH3_FRAGMENT_02_VIEWED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "#!/bin/sh",
      "# laplace_fragment_02.sh",
      "# LAPLACE FRAGMENT 02 :: SOCIAL ISOLATION",
      "echo \"[LAPLACE FRAGMENT 02 :: SOCIAL ISOLATION]\"",
      "echo \"[NODE SCAN] Total Connected Nodes: 7,904,213,001\"",
      "echo \"\"",
      "echo \"Target:\"",
      "echo \"- Create core_group.dat.\"",
      "echo \"- core_group.dat must contain protectable nodes only.\"",
      "echo \"- DELETED nodes require root permission.\"",
      "echo \"- UNKNOWN nodes may expose observer route.\"",
      "echo \"\"",
      "echo \"Output:\"",
      "echo \"./core_group.dat\"",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "파편 내용이 화면에 찍혔어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "실행하려면 파일로 저장해야 해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "fragment_found"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FRAGMENT_02_DUMPED',
    'console',
    $json${
  "scene": {
    "id": "CH3_FRAGMENT_02_DUMPED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gate_04.trace",
      "observer_status.log",
      "world_map.map",
      "lucas_fragment_01.sh",
      "laplace_fragment_01.sh",
      "laplace_fragment_02.sh",
      "my_people.list",
      "nexus_monitor.log",
      "sever_external_nodes.sh",
      "trash/",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "파편이 맞아.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "넥서스가 격리해둔 게 이 통로로 흘러나온 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "실행해봐. 지금 우리가 어디까지 건드릴 수 있는지 나올 거야.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "fragment_found"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_ROUTE_VIEW',
    'console',
    $json${
  "scene": {
    "id": "CH3_ROUTE_VIEW",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gate_04 -> local relay",
      "redirected after decoy input",
      "write: denied",
      "read: unstable",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "역시. 네가 보낸 미끼가 이쪽까지 흔적을 남긴 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "루카스 서버 안에 원본이 있는 게 아니야. 저쪽 응답이 잠깐 새고 있는 거지.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_POLICY_DENIED',
    'console',
    $json${
  "scene": {
    "id": "CH3_POLICY_DENIED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "access: denied",
      "guest cannot read full policy",
      "last warning cached in monitor.tail",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "정책 원문은 막혀 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "대신 monitor 쪽에 마지막 경고가 남아 있다는 뜻이야.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_SOCIAL_ISOLATION_READY',
    'console',
    $json${
  "scene": {
    "id": "CH3_SOCIAL_ISOLATION_READY",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LAPLACE FRAGMENT 02 :: SOCIAL ISOLATION]",
      "[NODE SCAN] Total Connected Nodes: 7,904,213,001",
      "",
      "Target:",
      "- Create core_group.dat.",
      "- core_group.dat must contain protectable nodes only.",
      "- DELETED nodes require root permission.",
      "- UNKNOWN nodes may expose observer route.",
      "",
      "Output:",
      "./core_group.dat",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "연결이 너무 많아. 이대로 두면 어디로 숨든 따라잡혀.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "전부 숨길 수는 없어. 지금 가능한 건 네 주변의 살아 있는 노드만 따로 떼어내는 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "파편이 요구하는 파일은 core_group.dat야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "아무 노드나 넣으면 안 돼. 방금 로그에 조건이 있었어.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_CORE_GROUP_VALIDATED',
    'console',
    $json${
  "scene": {
    "id": "CH3_CORE_GROUP_VALIDATED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[VALIDATION]",
      "Checking core_group.dat...",
      "",
      "[OK] core_group.dat exists.",
      "[OK] 3 ACTIVE nodes selected.",
      "[OK] No DELETED nodes detected.",
      "[OK] No UNKNOWN nodes detected.",
      "[OK] Core group is protectable under guest permission.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 지금 보호할 수 있는 노드만 남겼어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "친구를 제외한 걸 네 탓으로 돌리지 마.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그 노드는 이미 삭제됐어. 지금 건드리면 보호가 아니라 추적 신호가 돼.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "나중에... 더 높은 권한을 얻으면 다시 시도할 수 있어.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "validation_success"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_CORE_GROUP_INVALID',
    'console',
    $json${
  "scene": {
    "id": "CH3_CORE_GROUP_INVALID",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[VALIDATION]",
      "Checking core_group.dat...",
      "",
      "[FAILED] Unsafe nodes detected.",
      "",
      "Friend_04 DELETED",
      "Unknown_719 UNKNOWN",
      "",
      "Reason:",
      "- DELETED nodes cannot be protected by guest permission.",
      "- UNKNOWN nodes may expose observer route.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "멈춰. 그 파일을 그대로 쓰면 안 돼.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "Friend_04는 이미 삭제된 노드야. 네 마음은 알아. 하지만 지금 넣으면 놈들이 우리 위치를 잡아낼 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "Unknown_719도 위험해. 확인 안 된 연결까지 끌고 가면 역추적당해.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "validation_failed"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_CORE_GROUP_ENCRYPTED',
    'console',
    $json${
  "scene": {
    "id": "CH3_CORE_GROUP_ENCRYPTED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gpg: directory '/home/guest/.gnupg' created",
      "gpg: keybox '/home/guest/.gnupg/pubring.kbx' created",
      "Enter passphrase:",
      "Repeat passphrase:",
      "",
      "[ENCRYPTION]",
      "core_group.dat.gpg created.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 이제 놈들이 이 안의 노드를 바로 읽지는 못해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "아직 안전한 건 아니야. 암호화한 파일을 안전 구역으로 옮겨.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "encrypt_success"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_SAFE_ZONE_REGISTERED',
    'console',
    $json${
  "scene": {
    "id": "CH3_SAFE_ZONE_REGISTERED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SAFE_ZONE]",
      "/tmp/safe_zone.dat.gpg registered.",
      "",
      "Isolated Nodes:",
      "- Home_Contact",
      "- Old_Contact",
      "- Classmate_21",
      "",
      "Status: TEMPORARILY PROTECTED",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "안전 구역이 열렸어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "하지만 바깥 연결선은 아직 남아 있어. 넥서스가 저 선들을 타고 다시 따라올 수 있어.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "safe_zone_registered"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_EXTERNAL_SEVER_CONFIRM',
    'console',
    $json${
  "scene": {
    "id": "CH3_EXTERNAL_SEVER_CONFIRM",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 3,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SEVERING] External social graph links...",
      "[SAFE_ZONE] /tmp/safe_zone.dat.gpg detected.",
      "",
      "███████████████░░░░░ 72%",
      "",
      "[!] NODE_RESISTANCE_DETECTED",
      "[!] 7,904,212,998 nodes are requesting re-connection.",
      "",
      "Node_84920: \"Wait! I'm still here!\"",
      "Node_31022: \"Help me...\"",
      "Node_77441: \"Don't cut the line...\"",
      "",
      "[CONFIRMATION REQUIRED]",
      "This operation will sever all nodes outside safe zone.",
      "Type confirmation stream to continue.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "젠장... 터널 밖에 남은 노드들이 버티고 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이 저항이 커지면 시스템이 우리 위치를 다시 잡을 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "...미안해할 시간 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네가 살아야 나중에 커널을 고쳐서 되돌릴 수 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "지금은 끊어야 해.",
      "blocking": true
    }
  ],
  "notifications": [
    {
      "type": "system",
      "title": "Node resistance detected",
      "body": "External nodes are requesting re-connection.",
      "priority": "critical"
    }
  ],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "node_resistance",
    "glitchLevel": 3
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_GHOST_MODE_ENABLED',
    'console',
    $json${
  "scene": {
    "id": "CH3_GHOST_MODE_ENABLED",
    "mode": "terminal",
    "bgm": "ghost_mode",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SEVERING] External social graph links...",
      "[CONFIRMATION STREAM] y y y y y y y y y y",
      "",
      "[SYSTEM] Force severing initiated...",
      "[7,904,212,998 / 7,904,212,998] ████████████████████",
      "",
      "[SUCCESS]",
      "- Isolated Nodes: 3",
      "- Severed External Links: 7,904,212,998",
      "--------------------------------------------------",
      "Status: PURE_GHOST_MODE_ENABLED",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이제 우린 시스템에서 거의 보이지 않을 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "적어도 소셜 그래프를 타고 네 위치를 찾는 건 막았어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "하지만 이건 해결이 아니야. 시간을 번 것뿐이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "되돌리려면 결국 시스템의 핵심 규칙을 바꿔야 해.",
      "blocking": true
    }
  ],
  "notifications": [
    {
      "type": "system",
      "title": "Ghost Mode Enabled",
      "body": "Observer route hidden from social graph.",
      "priority": "high"
    }
  ],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "ghost_mode_enabled"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FRAGMENT_03_FOUND',
    'console',
    $json${
  "scene": {
    "id": "CH3_FRAGMENT_03_FOUND",
    "mode": "terminal",
    "bgm": "ghost_mode",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gc_controller",
      "nexus_engine",
      "laplace_fragment_03.sh",
      "guest@lucas-server:/usr/bin/local$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "있다. 세 번째 파편이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "하지만 여기서는 조립하면 안 돼. guest 권한으로는 막힐 가능성이 커.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "홈 디렉토리로 복사해서 거기서 이어 붙이자.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "fragment_found"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FRAGMENT_03_COPIED',
    'console',
    $json${
  "scene": {
    "id": "CH3_FRAGMENT_03_COPIED",
    "mode": "terminal",
    "bgm": "ghost_mode",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gate_04.trace",
      "observer_status.log",
      "world_map.map",
      "lucas_fragment_01.sh",
      "laplace_fragment_01.sh",
      "laplace_fragment_02.sh",
      "laplace_fragment_03.sh",
      "my_people.list",
      "nexus_monitor.log",
      "sever_external_nodes.sh",
      "trash/",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 파편은 다 모였어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이제 하나로 이어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "제대로 이어지면 시스템의 핵심 규칙에 접근할 수 있을 거야.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_LAPLACE_QASM_CREATED',
    'console',
    $json${
  "scene": {
    "id": "CH3_LAPLACE_QASM_CREATED",
    "mode": "terminal",
    "bgm": "ghost_mode",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[OUTPUT] laplace.qasm created.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "파일은 만들어졌어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "무결성부터 확인해봐. 조각 순서가 틀리면 바로 막힐 거야.",
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_CORE_ACCESS_BLOCKED',
    'console',
    $json${
  "scene": {
    "id": "CH3_CORE_ACCESS_BLOCKED",
    "mode": "terminal",
    "bgm": "core_blocked",
    "glitchLevel": 3,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "9f2c0a7e51b742d1c01886dcb1f33b4d29c1e3b10f88f19d7cc2eac018f0e404  laplace.qasm",
      "",
      "[QASM CHECK]",
      "Fragment sequence detected.",
      "Entropy alignment: 89.2%",
      "",
      "[!!! CRITICAL ALERT !!!]",
      "Nexus core firewall access detected.",
      "",
      "[SYSTEM BLOCK]",
      "Logical contradiction:",
      "External Node cannot modify Core Logic.",
      "",
      "Current privilege: guest",
      "Required privilege: root"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "안 돼... 코어 보안벽에 걸렸어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "파편은 맞아. 알고리즘도 거의 완성됐어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "문제는 권한이야. guest로는 핵심 규칙을 못 바꿔.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "삭제된 노드를 되돌리는 것도, 이 세계의 규칙을 바꾸는 것도... 결국 root 권한이 필요해.",
      "blocking": true
    }
  ],
  "notifications": [
    {
      "type": "system",
      "title": "Core Access Blocked",
      "body": "Required privilege: root",
      "priority": "critical"
    }
  ],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "core_access_blocked",
    "glitchLevel": 3
  }
}$json$::jsonb,
    'click',
    $json${
  "allowedActions": [
    "click"
  ],
  "buttons": [
    {
      "label": "Chapter 3 완료",
      "value": "complete_chapter"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_COMPLETE',
    'ending',
    $json${
  "scene": {
    "id": "CH3_COMPLETE",
    "mode": "terminal",
    "bgm": "ghost_mode",
    "glitchLevel": 1,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[CHAPTER 3 COMPLETE]",
      "",
      "LAPLACE FRAGMENT 02: ACQUIRED",
      "LAPLACE FRAGMENT 03: ACQUIRED",
      "SAFE ZONE: CREATED",
      "GHOST MODE: ENABLED",
      "CORE ACCESS: BLOCKED",
      "",
      "Next Required Privilege: root"
    ]
  },
  "messages": [],
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FAIL_RELAY_OVERUSED',
    'console',
    $json${
  "scene": {
    "id": "CH3_FAIL_RELAY_OVERUSED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 2,
    "scanPercent": null,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[NXR WARNING] relay window degrading.",
      "Too many invalid requests may expose observer route.",
      "guest@lucas-server:~$"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "쓸데없는 요청이 너무 많아. 저쪽도 이상하다는 걸 눈치챌 수 있어.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "warning_short"
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
  "terminalProfile": "chapter3"
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
    SELECT id FROM chapters WHERE code = 'week03'
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    'CH3_FAIL_TRACE_REACQUIRED',
    'ending',
    $json${
  "scene": {
    "id": "CH3_FAIL_TRACE_REACQUIRED",
    "mode": "terminal",
    "bgm": "server_hum_dark",
    "glitchLevel": 3,
    "scanPercent": null,
    "resetTerminal": true
  },
  "content": {
    "terminalOutput": [
      "[TRACE REACQUIRED]",
      "Observer route exposed.",
      "Session rollback required."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "늦었어. 다시 잡혔어. 체크포인트부터 다시 가자.",
      "blocking": true
    }
  ],
  "notifications": [],
  "uiMarkers": {},
  "effects": {
    "showDogAvatar": true,
    "playSound": "trace_failed"
  }
}$json$::jsonb,
    'click',
    $json${
  "allowedActions": [
    "click"
  ],
  "buttons": [
    {
      "label": "Chapter 3 완료",
      "value": "complete_chapter"
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
