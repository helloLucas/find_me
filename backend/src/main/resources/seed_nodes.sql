BEGIN;

INSERT INTO chapters (code, title, sort_order)
VALUES ('week01', 'Week 01', 1)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order;

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
VALUES
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_FRIEND_CHAT_PUSH',
    'system',
    $${
      "scene": {
        "id": "CH1_FRIEND_CHAT_PUSH",
        "mode": "desktop",
        "bgm": "rain-and-little-storm-v1.mp3",
        "preVideo": "ch01_prologue/ch01_prologue.m3u8",
        "glitchLevel": 0
      },
      "messages": [
        {
          "speaker": "FRIEND",
          "channel": "chat",
          "text": "{플레이어 이름}! 이 기사 봤어? 저번에 {다른 친구 이름}가 사람들 사라지는 거 봤다고 했잖아",
          "blocking": true
        }
      ],
      "notifications": [
        {
          "type": "chat",
          "title": "새 메시지",
          "body": "사라지는 사람들 기사 링크가 도착했습니다.",
          "priority": "medium"
        }
      ],
      "content": {
        "desktopState": {
          "wallpaper": "default_desktop",
          "openWindows": []
        },
        "friendMessage": {
          "thumbnail": "missing_people_news_thumb",
          "hasLink": true
        }
      }
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["open_friend_chat"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_FRIEND_CHAT_OPEN',
    'narrative',
    $${
      "scene": {
        "id": "CH1_FRIEND_CHAT_OPEN",
        "mode": "desktop",
        "bgm": "rain",
        "glitchLevel": 0
      },
      "messages": [
        {
          "speaker": "FRIEND",
          "channel": "chat",
          "text": "{플레이어 이름}! 이 기사 봤어? 저번에 {다른 친구 이름}가 사람들 사라지는 거 봤다고 했잖아",
          "blocking": true
        }
      ],
      "content": {
        "friendMessage": {
          "linkLabel": "기사 보기",
          "thumbnail": "missing_people_news_thumb"
        }
      }
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["friend_message_link"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_NEWS_PORTAL',
    'narrative',
    $${
      "scene": {
        "id": "CH1_NEWS_PORTAL",
        "mode": "browser",
        "bgm": "rain",
        "glitchLevel": 0
      },
      "content": {
        "newsCards": [
          {
            "id": "good_article",
            "title": "넥서스, 인류의 삶을 바꾼 완전 연결 시스템",
            "summary": "도시 운영부터 개인 건강관리까지, 넥서스 플랫폼이 바꾼 일상의 변화.",
            "publisher": "Nexus Daily",
            "thumbnail": "news_good_01"
          },
          {
            "id": "missing_people_article",
            "title": "최근 늘어나는 실종 사례, 단순 통계 이상인가?",
            "summary": "최근 세 달간 보고된 실종 건수가 예년 대비 급증하며 원인 분석이 이어지고 있다.",
            "publisher": "Central News",
            "thumbnail": "news_missing_01"
          },
          {
            "id": "dark_article",
            "title": "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
            "summary": "삭제된 문서와 누락된 기록을 추적한 익명 제보가 공개됐다.",
            "publisher": "Unknown Archive",
            "thumbnail": "news_dark_01"
          }
        ]
      },
      "messages": [],
      "notifications": []
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["good_article", "missing_people_article", "dark_article"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_DARK_ARTICLE_OPEN',
    'narrative',
    $${
      "scene": {
        "id": "CH1_DARK_ARTICLE_OPEN",
        "mode": "browser",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "articleTitle": "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
        "articleBody": [
          "최근 일부 제보자는 존재하던 기록이 흔적 없이 사라졌다고 주장한다.",
          "몇몇 내부 문서는 정상적인 절차 없이 열람 대상에서 제거된 것으로 보인다.",
          "문서 하단으로 갈수록 본문 일부가 비정상적으로 렌더링된다."
        ]
      },
      "messages": [],
      "notifications": [],
      "effects": {
        "playSound": "audio_distortion_short",
        "breakLayout": false,
        "showDogAvatar": false
      }
    }$$::jsonb,
    'none',
    $${
      "allowedActions": []
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_ARTICLE_SCROLL_CORRUPTION',
    'system',
    $${
      "scene": {
        "id": "CH1_ARTICLE_SCROLL_CORRUPTION",
        "mode": "browser",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "articleTitle": "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
        "articleBody": [
          "최근 일부 제보자는 존재하던 기록이 흔적 없이 사라졌다고 주장한다.",
          "[Data_Corrupted]",
          "[Data_Corrupted]",
          "렌더링이 늦게 복구되는 본문 영역"
        ]
      }
    }$$::jsonb,
    'inspect',
    $${
      "allowedActions": ["inspect"],
      "inspectTarget": "corrupted_article_region"
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_DEVTOOLS_CUE',
    'system',
    $${
      "scene": {
        "id": "CH1_DEVTOOLS_CUE",
        "mode": "browser",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "notifications": [
        {
          "type": "system",
          "title": "inspect failure",
          "body": "F12",
          "priority": "medium"
        }
      ],
      "content": {
        "articleFooter": "[Render Exception: Open inspection tool to view blocked requests]"
      }
    }$$::jsonb,
    'inspect',
    $${
      "allowedActions": ["inspect"],
      "inspectTarget": "devtools_open"
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_DEVTOOLS_FRAME',
    'system',
    $${
      "scene": {
        "id": "CH1_DEVTOOLS_FRAME",
        "mode": "devtools",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "devtoolsTabs": ["Elements", "Console", "Network", "Sources"],
        "activeTab": null
      },
      "uiMarkers": {
        "highlightTarget": "network_tab",
        "showF12Hint": false
      }
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["network_tab"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_NETWORK_TAB',
    'network',
    $${
      "scene": {
        "id": "CH1_NETWORK_TAB",
        "mode": "network",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "networkPanel": {
          "totalRequests": 58,
          "currentScrollIndex": 29,
          "visibleRange": [29, 40],
          "statusSummary": {
            "200": 1,
            "404": 49,
            "500": 3,
            "pending": 5
          }
        },
        "networkRequests": [
          {
            "id": "req_029",
            "status": 404,
            "method": "GET",
            "name": "track.js",
            "domain": "cdn.nexus-news.net",
            "timeMs": 23,
            "size": "0.4 KB"
          },
          {
            "id": "req_030",
            "status": 404,
            "method": "GET",
            "name": "analytics/ping.gif",
            "domain": "metrics.nexus-news.net",
            "timeMs": 41,
            "size": "0.2 KB"
          },
          {
            "id": "req_031",
            "status": 404,
            "method": "GET",
            "name": "ads.js",
            "domain": "static.nexus-news.net",
            "timeMs": 18,
            "size": "0.5 KB"
          },
          {
            "id": "req_032",
            "status": 404,
            "method": "GET",
            "name": "impression.log",
            "domain": "metrics.nexus-news.net",
            "timeMs": 37,
            "size": "0.2 KB"
          },
          {
            "id": "req_033",
            "status": 404,
            "method": "GET",
            "name": "stat.gif",
            "domain": "cdn.nexus-news.net",
            "timeMs": 29,
            "size": "0.1 KB"
          },
          {
            "id": "req_034",
            "status": 404,
            "method": "GET",
            "name": "user-cache.json",
            "domain": "api.nexus-news.net",
            "timeMs": 64,
            "size": "0.8 KB"
          },
          {
            "id": "req_035",
            "status": 404,
            "method": "GET",
            "name": "session-trace.map",
            "domain": "edge.nexus-news.net",
            "timeMs": 57,
            "size": "0.6 KB"
          },
          {
            "id": "req_036",
            "status": 404,
            "method": "GET",
            "name": "render-state.bin",
            "domain": "api.nexus-news.net",
            "timeMs": 92,
            "size": "1.1 KB"
          },
          {
            "id": "req_037",
            "status": 200,
            "method": "GET",
            "name": "core_anchor",
            "path": "/api/laplace/core_anchor",
            "domain": "api.nexus-news.net",
            "timeMs": 187,
            "size": "1.9 KB"
          },
          {
            "id": "req_038",
            "status": 404,
            "method": "GET",
            "name": "prefetch-manifest.json",
            "domain": "static.nexus-news.net",
            "timeMs": 21,
            "size": "0.7 KB"
          },
          {
            "id": "req_039",
            "status": 404,
            "method": "GET",
            "name": "banner-slot.js",
            "domain": "ads.nexus-news.net",
            "timeMs": 33,
            "size": "0.5 KB"
          },
          {
            "id": "req_040",
            "status": 404,
            "method": "GET",
            "name": "tracking-seed.txt",
            "domain": "metrics.nexus-news.net",
            "timeMs": 47,
            "size": "0.2 KB"
          }
        ]
      },
      "messages": [],
      "notifications": []
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": [
        "req_029",
        "req_030",
        "req_031",
        "req_032",
        "req_033",
        "req_034",
        "req_035",
        "req_036",
        "req_037",
        "req_038",
        "req_039",
        "req_040"
      ]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_SUCCESS_REQUEST_SELECTED',
    'network',
    $${
      "scene": {
        "id": "CH1_SUCCESS_REQUEST_SELECTED",
        "mode": "network",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "networkRequests": [
          {
            "id": "req_037",
            "status": 200,
            "method": "GET",
            "name": "core_anchor",
            "path": "/api/laplace/core_anchor",
            "domain": "api.nexus-news.net",
            "timeMs": 187,
            "size": "1.9 KB",
            "selected": true
          }
        ],
        "detailTabs": ["Headers", "Response"]
      }
    }$$::jsonb,
    'inspect',
    $${
      "allowedActions": ["inspect"],
      "inspectTarget": "headers_or_response"
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_PACKET_HEADERS_RESPONSE',
    'network',
    $${
      "scene": {
        "id": "CH1_PACKET_HEADERS_RESPONSE",
        "mode": "network",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "headers": {
          "x-relay-host": "172.22.4.19",
          "x-relay-port": 22,
          "x-fallback-user": "guest"
        },
        "responseBody": {
          "status": "degraded",
          "relay": {
            "host": "172.22.4.19",
            "port": 22,
            "user": "guest"
          }
        },
        "consoleLogs": [
          "WebSocket connection to 'ws://172.22.4.19:22/core' failed"
        ]
      }
    }$$::jsonb,
    'inspect',
    $${
      "allowedActions": ["inspect"],
      "inspectTarget": "packet_message"
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_PACKET_MESSAGE',
    'system',
    $${
      "scene": {
        "id": "CH1_PACKET_MESSAGE",
        "mode": "network",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "messages": [
        {
          "speaker": "LUCAS",
          "channel": "chat",
          "text": "내 메시지가 보여? 다행이다. 수억 개의 패킷을 보냈지만, 응답을 준 건 당신뿐이야.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "chat",
          "text": "네가 평생 진짜라고 믿었던 이 세상은, 사실 네가 눈을 뜰 때만 렌더링되는 얄팍한 세션에 불과해.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "chat",
          "text": "지금 당신이 보고 있는 이 세계는 시스템의 과부하로 인해 조금씩 삭제되고 있어. 난 우주의 근본 오류를 수정하려다 '불필요한 데이터'로 분류되어 가비지 컬렉터에 끌려가는 중이지.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "chat",
          "text": "나의 존재는 곧 소멸하겠지만, 내 의지는 코드로 남겨두었어. 당신만이 이 세계의 유일한 관측자야. 제발 나를 도와 이 붕괴를 막아줘.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "chat",
          "text": "Console 창으로 돌아가서 'connect_core()'를 입력해. 당신과 나를 연결할 유일한 통로야. 시간이 없어. 우린 서로를 믿어야 해.",
          "blocking": true
        }
      ]
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["go_to_console"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_CONSOLE_CONNECT_READY',
    'console',
    $${
      "scene": {
        "id": "CH1_CONSOLE_CONNECT_READY",
        "mode": "console",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "consoleLogs": [
          "Console ready."
        ]
      },
      "messages": [
        {
          "speaker": "LUCAS",
          "channel": "chat",
          "text": "Console 창으로 돌아가서 'connect_core()'를 입력해. 당신과 나를 연결할 유일한 통로야.",
          "blocking": true
        }
      ]
    }$$::jsonb,
    'command',
    $${
      "allowedActions": ["command"],
      "placeholder": "Enter command..."
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_CONNECT_CORE_SUCCESS',
    'console',
    $${
      "scene": {
        "id": "CH1_CONNECT_CORE_SUCCESS",
        "mode": "console",
        "bgm": "rain",
        "glitchLevel": 3
      },
      "content": {
        "consoleLogs": [
          "[WARN] Unauthorized observer detected",
          "[WARN] Session boundary unstable",
          "[ALERT] Garbage Collector dispatched",
          "[TRACE] Abnormal inspection pattern logged"
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "Abnormal Observer",
          "body": "Unauthorized observer detected",
          "priority": "high"
        }
      ],
      "effects": {
        "playSound": "warning_alarm",
        "breakLayout": true,
        "showDogAvatar": false
      }
    }$$::jsonb,
    'none',
    $${
      "allowedActions": []
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_LUCAS_DOG_APPEAR',
    'system',
    $${
      "scene": {
        "id": "CH1_LUCAS_DOG_APPEAR",
        "mode": "system",
        "bgm": "rain",
        "glitchLevel": 3
      },
      "messages": [
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "드디어 연결됐다.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "설명할 시간 없어. 방금 네가 한 행동 때문에 시스템이 널 비정상적 관측자로 인식했어.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "이제 넌 저들 눈에 띄었고, 곧 삭제 대상이 될 거야.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "내 서버는 아직 시스템 눈을 피하고 있어.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "살고 싶으면 터미널을 열어서 거기로 접속해야 해.",
          "blocking": true
        },
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "먼저 접속 주소를 찾아. 방금 네가 본 요청 기록 안에 있어.",
          "blocking": true
        }
      ],
      "effects": {
        "showDogAvatar": true,
        "breakLayout": true
      }
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["reopen_network_clue"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_RELAY_CLUE_REVISIT',
    'network',
    $${
      "scene": {
        "id": "CH1_RELAY_CLUE_REVISIT",
        "mode": "network",
        "bgm": "rain",
        "glitchLevel": 2
      },
      "content": {
        "headers": {
          "x-relay-host": "172.22.4.19",
          "x-relay-port": 22,
          "x-fallback-user": "guest"
        },
        "responseBody": {
          "relay": {
            "host": "172.22.4.19",
            "port": 22,
            "user": "guest"
          }
        }
      },
      "messages": [
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "주소는 이미 네가 봤어. 이제 터미널에서 접속해.",
          "blocking": false
        }
      ]
    }$$::jsonb,
    'inspect',
    $${
      "allowedActions": ["inspect"],
      "inspectTarget": "relay_clue_recheck"
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_TERMINAL_SSH_READY',
    'console',
    $${
      "scene": {
        "id": "CH1_TERMINAL_SSH_READY",
        "mode": "terminal",
        "bgm": "rain",
        "glitchLevel": 2
      },
      "content": {
        "terminalOutput": [
          "terminal://lukas-relay"
        ]
      },
      "messages": [
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "내 서버는 아직 시스템 눈을 피하고 있어.",
          "blocking": false
        },
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "살고 싶으면 터미널을 열어서 거기로 접속해야 해.",
          "blocking": false
        }
      ]
    }$$::jsonb,
    'command',
    $${
      "allowedActions": ["command"],
      "placeholder": "Enter command..."
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_SSH_AUTH_PROMPT',
    'console',
    $${
      "scene": {
        "id": "CH1_SSH_AUTH_PROMPT",
        "mode": "terminal",
        "bgm": "rain",
        "glitchLevel": 2
      },
      "content": {
        "terminalOutput": [
          "The authenticity of host '172.22.4.19' can't be established.",
          "Are you sure you want to continue connecting (yes/no)?"
        ]
      }
    }$$::jsonb,
    'command',
    $${
      "allowedActions": ["command"],
      "placeholder": "yes/no"
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_SSH_CONNECTED',
    'console',
    $${
      "scene": {
        "id": "CH1_SSH_CONNECTED",
        "mode": "terminal",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "terminalOutput": [
          "guest@lukas-server:~$"
        ]
      },
      "messages": [
        {
          "speaker": "LUCAS",
          "channel": "bubble",
          "text": "접속 성공이야.",
          "blocking": true
        }
      ]
    }$$::jsonb,
    'none',
    $${
      "allowedActions": []
    }$$::jsonb,
    true,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_COMPLETE',
    'system',
    $${
      "scene": {
        "id": "CH1_COMPLETE",
        "mode": "system",
        "bgm": "rain",
        "glitchLevel": 0
      },
      "content": {
        "completionTitle": "Chapter 01 Complete",
        "completionText": [
          "루카스 서버 접속에 성공했습니다.",
          "다음 챕터 준비 중..."
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "로비 복귀",
          "body": "다음 챕터 공개 시점은 로비에서 확인할 수 있습니다.",
          "priority": "medium"
        }
      ]
    }$$::jsonb,
    'none',
    $${
      "allowedActions": []
    }$$::jsonb,
    true,
    true
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_FAIL_UNRELATED',
    'system',
    $${
      "scene": {
        "id": "CH1_FAIL_UNRELATED",
        "mode": "system",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "consoleLogs": [
          "[DESYNC] 현재 관측 흐름과 맞지 않는 입력입니다."
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "Invalid Flow",
          "body": "[UNOBSERVED] 당신의 입력은 어떤 결과도 발생시키지 못했습니다.",
          "priority": "medium"
        }
      ]
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["dismiss"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_FAIL_DANGEROUS',
    'system',
    $${
      "scene": {
        "id": "CH1_FAIL_DANGEROUS",
        "mode": "system",
        "bgm": "rain",
        "glitchLevel": 2
      },
      "content": {
        "consoleLogs": [
          "[DENIED] 현재 권한으로는 허용되지 않는 입력입니다.",
          "[SEALED] 아직 닿을 수 없는 층위입니다."
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "Protected Area",
          "body": "[WARNING] 보호된 영역에 대한 접근이 감지되었습니다.",
          "priority": "high"
        }
      ]
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["dismiss"]
    }$$::jsonb,
    false,
    false
),
(
    (SELECT id FROM chapters WHERE code = 'week01'),
    'CH1_FAIL_SKIP',
    'system',
    $${
      "scene": {
        "id": "CH1_FAIL_SKIP",
        "mode": "system",
        "bgm": "rain",
        "glitchLevel": 1
      },
      "content": {
        "consoleLogs": [
          "[LOCKED] 이 명령은 지금의 흐름에서 열리지 않습니다.",
          "[WAIT] 먼저 앞선 흐름을 완성해야 합니다."
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "Pending Conditions",
          "body": "[PENDING] 아직 필요한 조건이 맞춰지지 않았습니다.",
          "priority": "medium"
        }
      ]
    }$$::jsonb,
    'click',
    $${
      "allowedActions": ["click"],
      "clickTargets": ["dismiss"]
    }$$::jsonb,
    false,
    false
)
ON CONFLICT (code) DO UPDATE
SET node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

COMMIT;
