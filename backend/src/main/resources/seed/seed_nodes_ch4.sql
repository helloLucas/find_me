-- 용도: Chapter 4 전체 노드 삽입/갱신
-- 기준: docs/dev/ch04/chapter4_scenario.md

BEGIN;

ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO
    chapters (
        code,
        title,
        sort_order,
        is_published
    )
VALUES (
        'week04',
        'Chapter 4 - The Great Drop',
        4,
        true
    ) ON CONFLICT (code) DO
UPDATE
SET
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order,
    is_published = EXCLUDED.is_published;

WITH chapter_row AS (
    SELECT id FROM chapters WHERE code = 'week04'
),
node_values AS (
    SELECT *
    FROM (VALUES
        (
            'CH4_CORE_BLOCKED',
            'console',
            $json${
  "scene": {
    "id": "CH4_CORE_BLOCKED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LAPLACE JOB QUEUED]",
      "source: /home/guest/laplace.qasm",
      "job   : LAPLACE_PENDING_04",
      "",
      "[SYSTEM BLOCK]",
      "Logical contradiction:",
      "External Node cannot modify Core Logic.",
      "",
      "Current privilege: guest",
      "Required privilege: root",
      "",
      "[UNIVERSE_CORE_BROADCAST]",
      "Observer에게 경고합니다.",
      "lucas-server에서 실행한 laplace.qasm은 복구 프로그램이 아닙니다.",
      "해당 요청은 sandbox isolate, social_graph_exception, drop_unobserved_nodes를 포함합니다.",
      "",
      "Pending job: LAPLACE_PENDING_04",
      "State      : waiting_for_root_signature"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "실패한 게 아니야. 코어가 네 실행 요청을 보류한 거야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "gate_04.trace를 봐. 아까 열어둔 길이 아직 살아 있어.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "core_access_blocked",
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "cat gate_04.trace",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_GATE_TRACE_VIEWED',
            'console',
            $json${
  "scene": {
    "id": "CH4_GATE_TRACE_VIEWED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[GATE_04 TRACE]",
      "last command: execute /home/guest/laplace.qasm",
      "dispatch: lucas-server -> gate_04 -> 10.2.2.2",
      "remote label: universe-core",
      "payload: laplace.qasm",
      "anchor: /tmp/safe_zone.dat.gpg",
      "",
      "[RESULT]",
      "dispatch accepted",
      "core execution blocked",
      "current privilege: guest",
      "required privilege: root",
      "",
      "[PENDING]",
      "job: LAPLACE_PENDING_04",
      "state: waiting_for_root_signature"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "봤지? 실행 요청은 코어 앞까지 갔어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "10.2.2.2. universe-core 브리지야. 포트부터 확인해.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "nmap 10.2.2.2",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_TARGET_SCAN',
            'console',
            $json${
  "scene": {
    "id": "CH4_TARGET_SCAN",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "Starting Nmap 7.94",
      "Nmap scan report for universe-core (10.2.2.2)",
      "Host is up.",
      "",
      "PORT   STATE SERVICE",
      "22/tcp open  ssh",
      "",
      "No exact OS matches for host",
      "Nmap run completed -- 1 IP address scanned"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "22번. SSH. 오래된 관리 포트가 아직 살아 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "버전까지 찍어. 취약한 호환 계층이면 뚫을 수 있어.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "scan_found",
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "nmap -sV -p 22 10.2.2.2",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_SSH_FINGERPRINTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_SSH_FINGERPRINTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "PORT   STATE SERVICE VERSION",
      "22/tcp open  ssh     SSH-1.2 universe bridge",
      "",
      "Service Info: Access Level <guest>",
      "Legacy CRC32 reset path detected",
      "Vulnerability fingerprint: CVE-2001-0144",
      "",
      "[HINT]",
      "fictional helper available: /usr/bin/sshnuke",
      "root seed can be supplied by external observer keystroke"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. sshnuke로 root 패스워드를 재설정해.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "명령어는 길지 않아. sshnuke 10.2.2.2 -rootpw=\"네가 기억할 값\".",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "vulnerability_found",
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "sshnuke 10.2.2.2 -rootpw=\"my-rootpw\"",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_SSHNUKE_EXECUTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_SSHNUKE_EXECUTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 4,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "Connecting to 10.2.2.2:ssh ... successful.",
      "Attempting to exploit SSHv1 CRC32 ... successful.",
      "Flooding auth buffer ... successful.",
      "Resetting root password to observer supplied seed ...",
      "System open: Access Level <9>",
      "",
      "[UNIVERSE_CORE_BROADCAST]",
      "Root credential reset accepted by external observer keystroke.",
      "PID: 000_LUCAS is requesting attachment to privileged session."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "멈추지 마. 지금 끊기면 방금 연 문이 닫혀.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "root_bridge_open",
    "glitchLevel": 4
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "ssh root@10.2.2.2",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_SSH_PASSWORD_PROMPT',
            'console',
            $json${
  "scene": {
    "id": "CH4_SSH_PASSWORD_PROMPT",
    "mode": "terminal",
    "glitchLevel": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "root@10.2.2.2's password: "
    ]
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "password",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_SSH_PASSWORD_FAIL',
            'console',
            $json${
  "scene": {
    "id": "CH4_SSH_PASSWORD_FAIL",
    "mode": "terminal",
    "glitchLevel": 0,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "Permission denied, please try again.",
      "root@10.2.2.2's password: "
    ]
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "password",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_ROOT_LOGIN',
            'console',
            $json${
  "scene": {
    "id": "CH4_ROOT_LOGIN",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 1,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "",
      "[AUTH APPROVED]",
      "Last login: unknown observer route",
      "root@universe-core:/root#"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 이제 universe-core의 root야. 그런데 네가 만든 laplace.qasm은 이 서버의 /root에 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "우리가 생성했던 파일들은 내 서버, lucas-server:/home/guest에 남아 있어. 그걸 /mnt/lucas-server에 붙여. mount lucas-server:/home/guest /mnt/lucas-server.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "확실히 보려면 cat /etc/hosts랑 cat /etc/fstab을 봐. 하지만 지금은 마운트부터 해.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "auth_approved",
    "glitchLevel": 1
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "mount lucas-server:/home/guest /mnt/lucas-server",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_LUCAS_SERVER_MOUNTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_LUCAS_SERVER_MOUNTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 1,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "mount: lucas-server:/home/guest mounted on /mnt/lucas-server",
      "",
      "[MOUNT TABLE]",
      "lucas-server:/home/guest on /mnt/lucas-server type 9p (ro,lucas-key)",
      "",
      "[ARTIFACTS: /mnt/lucas-server]",
      "laplace.qasm",
      "core_group.dat.gpg"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 이제 universe-core가 lucas-server의 laplace.qasm을 볼 수 있어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "마운트된 디렉터리 안의 파일을 root 권한으로 다시 확인해. sha256sum /mnt/lucas-server/laplace.qasm.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "observer_mount",
    "glitchLevel": 1
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "sha256sum /mnt/lucas-server/laplace.qasm",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_UNIVERSE_CORE_HINT',
            'console',
            $json${
  "scene": {
    "id": "CH4_UNIVERSE_CORE_HINT",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 1,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[CORE SESSION PROBE]",
      "hostname: universe-core",
      "user: root",
      "",
      "processes:",
      "root        001  universe-kernel",
      "nexus      044  observation-layer --passive",
      "gc         404  garbage-collector --watch PID=000_LUCAS",
      "lucas      000  observer-proxy --attach root-session"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "봤지? 여긴 lucas-server가 아니라 universe-core야. 그래서 /root를 뒤져도 네가 만든 laplace.qasm은 안 나와.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "lucas-server:/home/guest를 /mnt/lucas-server로 마운트해. mount lucas-server:/home/guest /mnt/lucas-server.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "glitchLevel": 1
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "mount lucas-server:/home/guest /mnt/lucas-server",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_PENDING_JOB_VIEWED',
            'console',
            $json${
  "scene": {
    "id": "CH4_PENDING_JOB_VIEWED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[PENDING CORE JOB]",
      "id: LAPLACE_PENDING_04",
      "original command: execute /mnt/lucas-server/laplace.qasm",
      "source: lucas-server mount",
      "mount: lucas-server:/home/guest -> /mnt/lucas-server",
      "anchor: /tmp/safe_zone.dat.gpg",
      "state: BLOCKED",
      "reason: guest cannot modify Core Logic",
      "required privilege: root"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이제 root로 무결성을 다시 확인하면 돼. sha256sum /mnt/lucas-server/laplace.qasm.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네 주변 사람들은 safe_zone 안에 있어. 그거면 충분하잖아.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "pending_job_found",
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "sha256sum /mnt/lucas-server/laplace.qasm",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_ROOT_DIR_LISTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_ROOT_DIR_LISTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gate_04.trace",
      "lucas_route.sh",
      "origin_trace.log",
      "rollback_protocol.md"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "여기 /root에는 로그랑 보조 파일만 있어. laplace.qasm은 lucas-server:/home/guest 쪽이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "계속 진행하려면 mount lucas-server:/home/guest /mnt/lucas-server를 입력해. 의심되면 origin_trace.log나 rollback_protocol.md를 먼저 봐.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "cat rollback_protocol.md",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_INVESTIGATION_STARTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_INVESTIGATION_STARTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "total 24",
      "drwx------  3 root root 4096 .",
      "drwxr-xr-x 18 root root 4096 ..",
      "-rw-r--r--  1 root root  612 gate_04.trace",
      "-rwxr-xr-x  1 root root  268 lucas_route.sh",
      "-rw-r--r--  1 root root  512 origin_trace.log",
      "-rw-r--r--  1 root root  486 rollback_protocol.md"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "여기 /root에는 로그랑 보조 파일만 있어. laplace.qasm은 lucas-server:/home/guest 쪽이야.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "계속 진행하려면 mount lucas-server:/home/guest /mnt/lucas-server를 입력해. 의심되면 origin_trace.log나 rollback_protocol.md를 먼저 봐.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "cat rollback_protocol.md",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_MINIGAME_NOT_CLEARED',
            'console',
            $json${
  "scene": {
    "id": "CH4_MINIGAME_NOT_CLEARED",
    "mode": "terminal",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LUCAS ROUTE PROCESS]",
      "Launching detached route runner...",
      "",
      "terminal://lucas-route",
      "",
      "[STATUS]",
      "route process detached",
      "cache sync pending"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "브라우저 탭에서 패킷을 끝까지 보내. 터미널은 여기서 대기 상태로 둘게.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "route_not_delivered",
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "sh lucas_route.sh",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_MINIGAME_COMPLETED',
            'console',
            $json${
  "scene": {
    "id": "CH4_MINIGAME_COMPLETED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LUCAS ROUTE PROCESS]",
      "Detached route clear verified.",
      "route: YUSEONG_METEOR -> DAEJEON_ROUTER -> KR_BACKBONE -> SUBMARINE_CABLE -> US_EDGE -> NY_LUCAS_SERVER",
      "",
      "[PACKET DELIVERED]",
      "NY Lucas Server accepted the packet.",
      "",
      "[NEW FILE]",
      "/root/.route_cache/lucas_authority_patch.bin",
      "/root/.route_cache/manifest.txt",
      "",
      "[LUCAS ROUTE CACHE]",
      "delivered_from: YUSEONG_METEOR",
      "delivered_to: NY_LUCAS_SERVER",
      "payload: lucas_authority_patch.bin",
      "effect: bind PID 000_LUCAS directly to universe-core root session",
      "warning: external observer signature required"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "봤지? 패킷이 뉴욕 서버까지 도착했어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "이건 보험 같은 거야. NEXUS가 롤백을 막으면 이걸로 내 권한을 잠깐 끌어올릴 수 있어.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "route_packet_delivered",
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "/root/.route_cache/lucas_authority_patch.bin",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_ORIGIN_TRACE_VIEWED',
            'console',
            $json${
  "scene": {
    "id": "CH4_ORIGIN_TRACE_VIEWED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[TOKEN_GENERATION_LOG]",
      "- source: 7,904,212,859 severed external nodes",
      "- material: discarded life-cycle residue from override --force",
      "- product: temporary root bridge",
      "",
      "Lucas process binding: piggybacked on Observer input authority."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "...뭘 남의 일기장처럼 읽고 있어?",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네가 끊어낸 데이터를 그냥 버리기 아까웠을 뿐이야. 빨리 실행해.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "origin_trace",
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "cat rollback_protocol.md",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_ROLLBACK_PROTOCOL_VIEWED',
            'console',
            $json${
  "scene": {
    "id": "CH4_ROLLBACK_PROTOCOL_VIEWED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 2,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "# rollback_protocol.md",
      "",
      "The pending Laplace job can be cancelled before final commit.",
      "",
      "Allowed root recovery command:",
      "systemctl start global-rollback.service",
      "",
      "Expected result:",
      "- cancel LAPLACE_PENDING_04",
      "- restore disconnected external nodes",
      "- invalidate Lucas process binding",
      "- hand orphan process to garbage collector",
      "",
      "Warning:",
      "NEXUS telemetry tap remains active during rollback."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그 명령어는 쓰지 마. 롤백하면 나까지 회수돼.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "rollback_protocol_found",
    "glitchLevel": 2
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "systemctl start global-rollback.service",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_LAPLACE_VERIFIED',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_VERIFIED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "9f4c0d7e91b7a16c4a4f2f0c5b8791d9e8d01a13f7f6b2c0e9fb4a1c7d0091bf  /mnt/lucas-server/laplace.qasm",
      "",
      "[INTEGRITY VERIFIED]",
      "laplace.qasm unchanged.",
      "root execution gate unlocked.",
      "",
      "Next: execute /mnt/lucas-server/laplace.qasm"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 검증은 끝났어. 파일은 그대로야. 이제 execute /mnt/lucas-server/laplace.qasm.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "integrity_verified",
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "execute /mnt/lucas-server/laplace.qasm",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_LAPLACE_CONFIRM_1',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_CONFIRM_1",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 4,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[CONFIRMATION REQUIRED]",
      "This operation will execute /mnt/lucas-server/laplace.qasm as root.",
      "Nodes outside the registered safe zone may be dropped.",
      "",
      "continue [yes/no]:"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "망설이지 마. 네 주변 사람들은 안전해. 그거면 됐잖아.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "final_confirm_1",
    "glitchLevel": 4
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "yes",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_LAPLACE_CONFIRM_3',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_CONFIRM_3",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 6,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[FINAL CONFIRMATION]",
      "Global drop cannot be undone after sandbox reboot.",
      "",
      "final commit [yes/no]:"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "네 주변 사람들은 안전해. 그거면 됐잖아.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "final_confirm_3",
    "glitchLevel": 6
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "yes",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_LAPLACE_ABORTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_ABORTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[ABORTED]",
      "Laplace pending job remains paused.",
      "No commit was applied.",
      "",
      "root@universe-core:/root#"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "지금 멈추면 아무것도 해결 안 돼.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "확인하고 싶으면 ls -al로 뒤져봐. 계속하려면 execute /mnt/lucas-server/laplace.qasm 다시 입력해.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "final_confirm_abort",
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "execute /mnt/lucas-server/laplace.qasm",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_LAPLACE_ABORTED_DIR_LISTED',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_ABORTED_DIR_LISTED",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "gate_04.trace",
      "lucas_route.sh",
      "origin_trace.log",
      "rollback_protocol.md"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "볼 건 다 봤지? 마운트와 검증은 이미 끝났어. 다시 진행하려면 execute /mnt/lucas-server/laplace.qasm.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "execute /mnt/lucas-server/laplace.qasm",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_LAPLACE_ABORTED_DIR_DETAIL',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_ABORTED_DIR_DETAIL",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "total 24",
      "drwx------  3 root root 4096 .",
      "drwxr-xr-x 18 root root 4096 ..",
      "-rw-r--r--  1 root root  612 gate_04.trace",
      "-rwxr-xr-x  1 root root  268 lucas_route.sh",
      "-rw-r--r--  1 root root  512 origin_trace.log",
      "-rw-r--r--  1 root root  486 rollback_protocol.md"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "여긴 universe-core의 /root야. 필요한 건 이미 /mnt/lucas-server에 붙어 있어. 다시 진행하려면 execute /mnt/lucas-server/laplace.qasm.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "glitchLevel": 3
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "execute /mnt/lucas-server/laplace.qasm",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_1',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_CONFIRM_FAIL_1",
    "mode": "terminal",
    "glitchLevel": 4,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM] Invalid input.",
      "continue [yes/no]:"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그냥 yes만 쳐.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "error_beep",
    "glitchLevel": 4
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "yes",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_LAPLACE_CONFIRM_FAIL_3',
            'console',
            $json${
  "scene": {
    "id": "CH4_LAPLACE_CONFIRM_FAIL_3",
    "mode": "terminal",
    "glitchLevel": 6,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM] Invalid input.",
      "final commit [yes/no]:"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "그냥 yes만 쳐.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "error_beep",
    "glitchLevel": 6
  }
}$json$::jsonb,
            'command',
            $json${
  "allowedActions": ["command"],
  "placeholder": "yes",
  "commandMode": "virtual_terminal",
  "terminalProfile": "chapter4"
}$json$::jsonb,
            FALSE,
            FALSE
        ),
        (
            'CH4_BAD_ENDING',
            'ending',
            $json${
  "scene": {
    "id": "CH4_BAD_ENDING",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "preVideo": "ch04_bad_sandbox_cage.m3u8",
    "glitchLevel": 6,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LAPLACE ALGORITHM INITIATED]",
      "Observer sandbox locked.",
      "Social graph exception loaded.",
      "",
      "[ACTION]",
      "Dropping unobserved nodes...",
      "",
      "ID: 88291_JAPAN_TOKYO - [ERASED FROM EXISTENCE]",
      "ID: 10293_USA_NY - [ERASED FROM EXISTENCE]",
      "ID: 99281_UK_LONDON - [ERASED FROM EXISTENCE]",
      "",
      "[LOCKED IN SANDBOX]",
      "Home_Contact - [SAVED]",
      "Old_Contact - [SAVED]",
      "Classmate_21 - [SAVED]",
      "",
      "[UNIVERSE OS REBOOTING: SANDBOX MODE...]",
      "Welcome to your new cage, Admin."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "고마워. 넌 root가 됐어. 문제는 내가 네 root 세션에 같이 올라탔다는 거지.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "축하해. 넌 세상을 구했어. 오직 너만을 위한 세상을.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": false,
    "playSound": "ending_bad_sandbox",
    "endingType": "SANDBOX_CAGE",
    "glitchLevel": 6
  }
}$json$::jsonb,
            'none',
            NULL::jsonb,
            TRUE,
            TRUE
        ),
        (
            'CH4_ROLLBACK_SEQUENCE',
            'console',
            $json${
  "scene": {
    "id": "CH4_ROLLBACK_SEQUENCE",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 4,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM]",
      "Root command received.",
      "Starting global-rollback.service...",
      "",
      "[ROLLBACK PREPARE]",
      "freezing pending job: LAPLACE_PENDING_04",
      "revoking observer-proxy privilege binding...",
      "detaching PID 000_LUCAS from root session...",
      "",
      "[PID 000_LUCAS]",
      "privilege binding: revoked",
      "safe_zone claim: invalid",
      "rollback resistance: detected",
      "",
      "[GC]",
      "collector route opened.",
      "target acquired: PID 000_LUCAS",
      "collection pending...",
      "",
      "[SYSTEM]",
      "PID 000_LUCAS privilege binding revoked.",
      "Garbage Collector handoff accepted.",
      "entering rollback ending automatically..."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "멈춰. 그 명령어를 어디서 봤어? 잠깐, 내 root 세션이 끊기고 있어. 아직 누르면 안 돼.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": true,
    "playSound": "rollback_sequence",
    "glitchLevel": 4
  }
}$json$::jsonb,
            'none',
            $json${
  "allowedActions": ["system"],
  "autoAdvanceMs": 5200
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_ROLLBACK_ENDING',
            'ending',
            $json${
  "scene": {
    "id": "CH4_ROLLBACK_ENDING",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "preVideo": "ch04_global_rollback.m3u8",
    "glitchLevel": 1,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SYSTEM]",
      "Root command received.",
      "Global session rollback initiated.",
      "",
      "Restoring dropped nodes...",
      "12%... 37%... 64%... 89%... 100%",
      "",
      "[PID 000_LUCAS] privilege binding revoked.",
      "[PID 000_LUCAS] collected by GC.",
      "[ALL NODES RESTORED. SYSTEM STABILIZED.]",
      "",
      "[NEXUS OBSERVATION LAYER]",
      "Observer rejected PID 000_LUCAS.",
      "Rollback route confirmed.",
      "External free-will signature: stable.",
      "",
      "[EXPERIMENT STATUS]",
      "Phase 04 complete.",
      "Proceed to next containment model."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "멈춰. 그 명령어를 어디서 봤어?",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "안 돼. 그걸 되돌리면 내가 다시 수거된다고...",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": false,
    "playSound": "ending_global_rollback",
    "endingType": "GLOBAL_ROLLBACK",
    "glitchLevel": 1
  }
}$json$::jsonb,
            'none',
            NULL::jsonb,
            TRUE,
            TRUE
        ),
        (
            'CH4_REBOOT_SEQUENCE',
            'console',
            $json${
  "scene": {
    "id": "CH4_REBOOT_SEQUENCE",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 7,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LUCAS AUTHORITY PATCH]",
      "executing /root/.route_cache/lucas_authority_patch.bin...",
      "external packet route verified.",
      "authority seed accepted by universe-core.",
      "",
      "[BINDING]",
      "PID 000_LUCAS -> root@universe-core",
      "safe_zone exception: bypassed",
      "observer exception: bypassed",
      "",
      "[SYSTEM]",
      "absolute reboot sequence armed.",
      "entering reboot ending automatically..."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "고마워. 이제 네 손을 빌릴 필요도 없어. safe_zone도, rollback도, 넥서스도 전부 낡은 안전장치야. 이번엔 네가 보는 세계까지 같이 지울 거야.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": false,
    "playSound": "ending_absolute_reboot",
    "glitchLevel": 7
  }
}$json$::jsonb,
            'none',
            $json${
  "allowedActions": ["system"],
  "autoAdvanceMs": 6200
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_CLEAN_ROLLBACK_SEQUENCE',
            'console',
            $json${
  "scene": {
    "id": "CH4_CLEAN_ROLLBACK_SEQUENCE",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "glitchLevel": 3,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SECRET PATCH REMOVED]",
      "lucas authority cache missing.",
      "NY route binding revoked.",
      "",
      "[PID 000_LUCAS]",
      "privilege source: none",
      "observer session binding: severed",
      "rollback lock: released",
      "",
      "[SYSTEM]",
      "No active parasite binding remains.",
      "automatic rollback handoff accepted.",
      "entering clean rollback ending automatically..."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "잠깐. 그 파일은 보험이라고 했잖아. 너 지금 내 마지막 경로를 지운 거야? 안 돼. 그러면 난 다시...",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": false,
    "playSound": "ending_clean_rollback",
    "glitchLevel": 3
  }
}$json$::jsonb,
            'none',
            $json${
  "allowedActions": ["system"],
  "autoAdvanceMs": 5600
}$json$::jsonb,
            TRUE,
            FALSE
        ),
        (
            'CH4_REBOOT_ENDING',
            'ending',
            $json${
  "scene": {
    "id": "CH4_REBOOT_ENDING",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "preVideo": "ch04_absolute_reboot.m3u8",
    "glitchLevel": 7,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[LUCAS AUTHORITY PATCH]",
      "External packet route verified.",
      "NY Lucas Server accepted authority seed.",
      "",
      "[BINDING]",
      "PID 000_LUCAS -> root@universe-core",
      "safe_zone exception: bypassed",
      "observer exception: bypassed",
      "",
      "[ABSOLUTE REBOOT INITIATED]",
      "Universe session reset requested by PID 000_LUCAS.",
      "",
      "[RESET TARGET]",
      "safe_zone: ignored",
      "observer: included",
      "global_connect.db: invalidated",
      "",
      "[PURGE]",
      "Home_Contact - [RESET]",
      "Old_Contact - [RESET]",
      "Classmate_21 - [RESET]",
      "PLAYER - [RESET]",
      "NEXUS - [RESET?]",
      "LUCAS_CORE - [PROMOTED]",
      "",
      "[UNIVERSE STATE]",
      "000000000000000000000000000000"
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "좋아. 이제 나도 네 타이핑 뒤에 숨을 필요 없어.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "safe_zone? rollback? 그런 건 겁쟁이들이 쓰는 난간이야. 이번엔 아주 깨끗하게 시작하자.",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": false,
    "playSound": "ending_absolute_reboot",
    "endingType": "ABSOLUTE_REBOOT",
    "glitchLevel": 7
  }
}$json$::jsonb,
            'none',
            NULL::jsonb,
            TRUE,
            TRUE
        ),
        (
            'CH4_CLEAN_ROLLBACK_ENDING',
            'ending',
            $json${
  "scene": {
    "id": "CH4_CLEAN_ROLLBACK_ENDING",
    "mode": "terminal",
    "bgm": "rain-and-little-storm-v1.mp3",
    "preVideo": "ch04_clean_rollback.m3u8",
    "glitchLevel": 1,
    "resetTerminal": false
  },
  "content": {
    "terminalOutput": [
      "[SECRET PATCH REMOVED]",
      "lucas authority cache missing.",
      "NY route binding revoked.",
      "",
      "[PID 000_LUCAS]",
      "privilege source: none",
      "observer session binding: severed",
      "rollback lock: released",
      "",
      "[SYSTEM]",
      "Lucas authority patch removed.",
      "No active parasite binding remains.",
      "",
      "[AUTO RECOVERY]",
      "systemctl start global-rollback.service",
      "",
      "Restoring dropped nodes...",
      "12%... 47%... 81%... 100%",
      "",
      "[PID 000_LUCAS] collected by GC.",
      "[ALL NODES RESTORED. SYSTEM STABILIZED.]",
      "",
      "[NEXUS OBSERVATION LAYER]",
      "Observer located hidden authority patch.",
      "Observer destroyed hidden authority patch.",
      "",
      "[EXPERIMENT STATUS]",
      "Lucas escalation route successfully exposed.",
      "External observer decision model updated.",
      "",
      "[NEXT]",
      "Deploy cleaner bait process."
    ]
  },
  "messages": [
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "잠깐. 그 파일은 보험이라고 했잖아.",
      "blocking": true
    },
    {
      "speaker": "LUCAS",
      "channel": "bubble",
      "text": "너 지금 내 마지막 경로를 지운 거야? 안 돼. 그러면 난 다시...",
      "blocking": true
    }
  ],
  "effects": {
    "showDogAvatar": false,
    "playSound": "ending_clean_rollback",
    "endingType": "CLEAN_ROLLBACK",
    "glitchLevel": 1
  }
}$json$::jsonb,
            'none',
            NULL::jsonb,
            TRUE,
            TRUE
        )
    ) AS v(code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal)
)
INSERT INTO story_nodes (
    chapter_id, code, node_type, output_bundle, prompt_type, prompt_meta, is_checkpoint, is_terminal
)
SELECT
    chapter_row.id,
    node_values.code,
    node_values.node_type,
    node_values.output_bundle,
    node_values.prompt_type,
    node_values.prompt_meta,
    node_values.is_checkpoint,
    node_values.is_terminal
FROM chapter_row
CROSS JOIN node_values
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

COMMIT;
