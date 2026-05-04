-- 용도: 챕터 1 메타데이터 및 기본 story_nodes를 시드하는 스크립트.

BEGIN;

INSERT INTO
    chapters (code, title, sort_order, is_published)
VALUES ('week01', 'Week 01', 1, true)
ON CONFLICT (code) DO
UPDATE
SET
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order,
    is_published = EXCLUDED.is_published;

INSERT INTO
    story_nodes (
        chapter_id,
        code,
        node_type,
        output_bundle,
        prompt_type,
        prompt_meta,
        is_checkpoint,
        is_terminal
    )
VALUES (
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_FRIEND_CHAT_OPEN',
        'narrative',
        $${
      "scene": {
        "id": "CH1_FRIEND_CHAT_OPEN",
        "mode": "desktop",
        "bgm": "rain-and-little-storm-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_NEWS_PORTAL',
        'narrative',
        $${
      "scene": {
        "id": "CH1_NEWS_PORTAL",
        "mode": "browser",
        "bgm": "rain-and-little-storm-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_DARK_ARTICLE_OPEN',
        'narrative',
        $${
      "scene": {
        "id": "CH1_DARK_ARTICLE_OPEN",
        "mode": "browser",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "content": {
        "articleTitle": "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
        "articleBody": [
          "최근 도시 외곽에서 접수된 실종 사건들을 취재하는 과정에서, 단순한 범죄나 행정 공백만으로는 설명하기 어려운 공통 증언이 확인되고 있다. 실종자 주변을 마지막으로 봤다는 시민들은 특정 인물이나 거리 풍경이 처음부터 선명하게 보이지 않았고, 시선을 두는 순간 뒤늦게 형태를 갖추는 듯한 이상한 경험을 했다고 주장했다. 일부 제보는 넥서스가 구축한 도시 통합 인프라 구역과 이러한 현상이 겹친다는 점에서 더 큰 의문을 낳고 있다.",
          "문제가 처음 수면 위로 올라온 것은 지난달 14일, 외곽 주거 구역 주민 여러 명이 같은 시간대 같은 골목을 두고 서로 다른 진술을 내놓으면서다. 한 주민은 골목 끝에서 누군가 걸어오는 모습을 분명히 봤다고 했지만, 다른 주민은 같은 시각 같은 방향을 바라봤을 때 그 자리가 비어 있었다고 말했다. 이후 본지가 유사 사례를 추가 확인한 결과, 서로 모르는 제보자들 사이에서도 '처음에는 비어 있거나 흐릿했지만 다시 보니 자연스럽게 채워져 있었다'는 취지의 진술이 반복됐다.",
          "증언의 공통점은 단순한 착시를 넘어선다. 제보자들은 멀리 있는 사람의 얼굴이나 옷차림이 가까워질 때까지 비정상적으로 흐릿하게 보였고, 고개를 돌렸다가 다시 바라보면 방금 전까지 없던 행인이나 차량이 자연스럽게 자리를 차지하고 있었다고 말했다. 일부는 상점 간판, 버스 정류장, 횡단보도 건너편 인파처럼 평소라면 한 번에 인식될 요소들이 유독 늦게 또렷해졌다고 주장했다.",
          "실종자 가족들의 증언은 더 구체적이다. 지난 겨울 동생을 잃었다는 한 시민은 본지에 '사람이 사라지기 전에 주변부터 이상해졌다'고 말했다. 그는 실종 전날 저녁, 동생이 귀가하던 길을 봤다는 이웃들의 말이 기묘할 정도로 엇갈렸다고 전했다. 같은 시간대 같은 구간을 본 사람들 가운데 누군가는 분명히 길을 걷는 모습을 봤다고 했고, 다른 누군가는 그 자리가 이상할 만큼 텅 비어 있었다고 말했다는 것이다.",
          "심야 시간대 외곽 상권에서 근무하는 자영업자들과 경비 인력도 비슷한 경험을 증언했다. 손님이 끊긴 뒤 바깥을 내다보면 멀리 있는 가로등 아래 인영이 사람처럼 보이다가도, 다시 볼 때는 전혀 다른 위치에 있거나 아예 사라져 있다는 것이다. 한 편의점 업주는 '사람이 움직였다기보다, 처음엔 대강 형태만 있다가 내가 다시 볼 때 그제야 사람처럼 맞춰지는 느낌이 들 때가 있다'고 말했다.",
          "특히 이런 제보는 사람이 적은 시간과 장소에 집중돼 있다. 번화가 중심부나 대형 상업 지구처럼 유동 인구가 많은 구역보다, 외곽 도로와 심야 버스 노선, 재개발이 멈춘 구역, 폐쇄된 공공시설 주변에서 유사 사례가 반복적으로 보고되고 있다. 넥서스의 생활 인프라망이 촘촘히 연결된 중심권은 비교적 안정적으로 보이지만, 시선이 드물게 머무는 공간일수록 배경이나 인물의 형태가 늦게 또렷해진다는 증언이 많았다.",
          "전문가들은 아직 원인을 단정하기는 어렵다고 말한다. 조도 차이, 피로 누적, 불안 심리, 반복되는 실종 보도에 따른 긴장감이 인지 오류를 키울 가능성은 충분하다는 설명이다. 다만 본지가 접촉한 한 지각심리 연구자는 '이번 제보의 특징은 단순히 잘못 봤다는 수준이 아니라, 처음엔 완성되지 않은 것처럼 보였다거나 시선을 둔 뒤에야 주변이 정리됐다는 표현이 유독 많다는 점'이라며 '일반적인 야간 착시 보고와는 결이 다르다'고 말했다.",
          "도시 인프라 전문가들 사이에서는 넥서스가 운영하는 통합 조명, 교통, 보안 네트워크와의 연관성을 점검해야 한다는 의견도 나온다. 넥서스는 이미 이 도시의 교통 관제, 공공 보안 연동, 상업 지구 데이터망 상당 부분에 영향력을 미치고 있다. 공식적으로 확인된 것은 없지만, 일부 제보자들은 넥서스 계열 시설 인근에서 유독 사람 수나 거리 배경이 '뒤늦게 맞춰지는 것 같다'는 느낌을 받았다고 주장했다.",
          "넥서스는 본지 질의에 대해 '자사가 제공하는 인프라 서비스와 시민들이 호소하는 시야 이상, 목격 불일치 현상 사이의 직접적 연관성은 확인된 바 없다'며 '현재까지 파악된 범위에서는 범죄, 시설 노후, 심야 환경 요인 등 다양한 가능성을 열어 두고 관계 기관과 협조 중'이라고 밝혔다. 다만 외곽 구역과 비혼잡 시간대에 제보가 집중되는 이유, 그리고 복수의 목격자가 같은 장소를 두고 상반된 진술을 내놓는 현상에 대해서는 별도의 설명을 내놓지 않았다.",
          "지역 커뮤니티에서는 이미 더 근본적인 의문도 제기되고 있다. 왜 사람이 적은 장소에서만 주변 풍경과 인물의 형태가 늦게 또렷해지는지, 왜 누군가는 분명 존재를 봤다고 하고 누군가는 같은 자리에서 공백만 봤다고 말하는지, 왜 가까이 가거나 오래 바라본 뒤에야 비로소 거리의 디테일이 채워지는 듯한 증언이 반복되는지에 대한 의문이다. 일부 시민들은 이제 실종 사건을 단순한 개별 사건이 아니라, 이 도시의 현실 자체가 예상과 다른 방식으로 유지되고 있을 가능성과 연결해 바라보기 시작했다.",
          "본지는 현재 외곽 실종 사건과 함께 제기된 시야 이상, 목격 인원 불일치, 심야 시간대 공간 인식 왜곡 제보의 발생 시점과 지역별 공통점을 추가로 확인하고 있다. 지금까지 확보된 증언만으로 특정 원인을 단정하기는 어렵지만, 복수의 제보가 비슷한 시간대와 유사한 환경에서 반복되고 있다는 점은 단순한 개인 착시나 일회성 불안으로만 치부하기 어렵다는 지적이 나온다.",
          "관계 당국과 넥서스는 아직 범죄, 시설 결함, 환경 이상 가운데 어느 가능성도 확정하지 않은 상태다. 다만 시민들이 공통적으로 제기하는 '주변 인물이나 풍경이 뒤늦게 또렷해지거나, 시선을 돌린 뒤 다시 볼 때 형태가 달라 보였다'는 증언에 대해서는 현재까지 납득할 만한 설명이 제시되지 않고 있다. 본지는 추가 제보와 현장 확인을 바탕으로 해당 현상이 실제로 특정 구역에 집중돼 나타나는지, 또 최근 실종 사건들과 어떤 관련이 있는지 계속 추적할 예정이다."
        ],
        "articleCorruption": {
          "paragraphIndexes": [10, 11],
          "intensity": "subtle"
        }
      },
      "messages": [],
      "notifications": [],
      "effects": {
        "playSound": "electric-noise-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_ARTICLE_SCROLL_CORRUPTION',
        'system',
        $${
      "scene": {
        "id": "CH1_ARTICLE_SCROLL_CORRUPTION",
        "mode": "browser",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "content": {
        "articleTitle": "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
        "articleBody": [
          "최근 도시 외곽에서 접수된 실종 사건들을 취재하는 과정에서, 단순한 범죄나 행정 공백만으로는 설명하기 어려운 공통 증언이 확인되고 있다. 실종자 주변을 마지막으로 봤다는 시민들은 특정 인물이나 거리 풍경이 처음부터 선명하게 보이지 않았고, 시선을 두는 순간 뒤늦게 형태를 갖추는 듯한 이상한 경험을 했다고 주장했다. 일부 제보는 넥서스가 구축한 도시 통합 인프라 구역과 이러한 현상이 겹친다는 점에서 더 큰 의문을 낳고 있다.",
          "문제가 처음 수면 위로 올라온 것은 지난달 14일, 외곽 주거 구역 주민 여러 명이 같은 시간대 같은 골목을 두고 서로 다른 진술을 내놓으면서다. 한 주민은 골목 끝에서 누군가 걸어오는 모습을 분명히 봤다고 했지만, 다른 주민은 같은 시각 같은 방향을 바라봤을 때 그 자리가 비어 있었다고 말했다. 이후 본지가 유사 사례를 추가 확인한 결과, 서로 모르는 제보자들 사이에서도 '처음에는 비어 있거나 흐릿했지만 다시 보니 자연스럽게 채워져 있었다'는 취지의 진술이 반복됐다.",
          "증언의 공통점은 단순한 착시를 넘어선다. 제보자들은 멀리 있는 사람의 얼굴이나 옷차림이 가까워질 때까지 비정상적으로 흐릿하게 보였고, 고개를 돌렸다가 다시 바라보면 방금 전까지 없던 행인이나 차량이 자연스럽게 자리를 차지하고 있었다고 말했다. 일부는 상점 간판, 버스 정류장, 횡단보도 건너편 인파처럼 평소라면 한 번에 인식될 요소들이 유독 늦게 또렷해졌다고 주장했다.",
          "실종자 가족들의 증언은 더 구체적이다. 지난 겨울 동생을 잃었다는 한 시민은 본지에 '사람이 사라지기 전에 주변부터 이상해졌다'고 말했다. 그는 실종 전날 저녁, 동생이 귀가하던 길을 봤다는 이웃들의 말이 기묘할 정도로 엇갈렸다고 전했다. 같은 시간대 같은 구간을 본 사람들 가운데 누군가는 분명히 길을 걷는 모습을 봤다고 했고, 다른 누군가는 그 자리가 이상할 만큼 텅 비어 있었다고 말했다는 것이다.",
          "심야 시간대 외곽 상권에서 근무하는 자영업자들과 경비 인력도 비슷한 경험을 증언했다. 손님이 끊긴 뒤 바깥을 내다보면 멀리 있는 가로등 아래 인영이 사람처럼 보이다가도, 다시 볼 때는 전혀 다른 위치에 있거나 아예 사라져 있다는 것이다. 한 편의점 업주는 '사람이 움직였다기보다, 처음엔 대강 형태만 있다가 내가 다시 볼 때 그제야 사람처럼 맞춰지는 느낌이 들 때가 있다'고 말했다.",
          "특히 이런 제보는 사람이 적은 시간과 장소에 집중돼 있다. 번화가 중심부나 대형 상업 지구처럼 유동 인구가 많은 구역보다, 외곽 도로와 심야 버스 노선, 재개발이 멈춘 구역, 폐쇄된 공공시설 주변에서 유사 사례가 반복적으로 보고되고 있다. 넥서스의 생활 인프라망이 촘촘히 연결된 중심권은 비교적 안정적으로 보이지만, 시선이 드물게 머무는 공간일수록 배경이나 인물의 형태가 늦게 또렷해진다는 증언이 많았다.",
          "전문가들은 아직 원인을 단정하기는 어렵다고 말한다. 조도 차이, 피로 누적, 불안 심리, 반복되는 실종 보도에 따른 긴장감이 인지 오류를 키울 가능성은 충분하다는 설명이다. 다만 본지가 접촉한 한 지각심리 연구자는 '이번 제보의 특징은 단순히 잘못 봤다는 수준이 아니라, 처음엔 완성되지 않은 것처럼 보였다거나 시선을 둔 뒤에야 주변이 정리됐다는 표현이 유독 많다는 점'이라며 '일반적인 야간 착시 보고와는 결이 다르다'고 말했다.",
          "도시 인프라 전문가들 사이에서는 넥서스가 운영하는 통합 조명, 교통, 보안 네트워크와의 연관성을 점검해야 한다는 의견도 나온다. 넥서스는 이미 이 도시의 교통 관제, 공공 보안 연동, 상업 지구 데이터망 상당 부분에 영향력을 미치고 있다. 공식적으로 확인된 것은 없지만, 일부 제보자들은 넥서스 계열 시설 인근에서 유독 사람 수나 거리 배경이 '뒤늦게 맞춰지는 것 같다'는 느낌을 받았다고 주장했다.",
          "넥서스는 본지 질의에 대해 '자사가 제공하는 인프라 서비스와 시민들이 호소하는 시야 이상, 목격 불일치 현상 사이의 직접적 연관성은 확인된 바 없다'며 '현재까지 파악된 범위에서는 범죄, 시설 노후, 심야 환경 요인 등 다양한 가능성을 열어 두고 관계 기관과 협조 중'이라고 밝혔다. 다만 외곽 구역과 비혼잡 시간대에 제보가 집중되는 이유, 그리고 복수의 목격자가 같은 장소를 두고 상반된 진술을 내놓는 현상에 대해서는 별도의 설명을 내놓지 않았다.",
          "지역 커뮤니티에서는 이미 더 근본적인 의문도 제기되고 있다. 왜 사람이 적은 장소에서만 주변 풍경과 인물의 형태가 늦게 또렷해지는지, 왜 누군가는 분명 존재를 봤다고 하고 누군가는 같은 자리에서 공백만 봤다고 말하는지, 왜 가까이 가거나 오래 바라본 뒤에야 비로소 거리의 디테일이 채워지는 듯한 증언이 반복되는지에 대한 의문이다. 일부 시민들은 이제 실종 사건을 단순한 개별 사건이 아니라, 이 도시의 현실 자체가 예상과 다른 방식으로 유지되고 있을 가능성과 연결해 바라보기 시작했다.",
          "본지는 현재 외곽 실종 사건과 함께 제기된 시야 이상, 목격 인원 불일치, 심야 시간대 공간 인식 왜곡 제보의 발생 시점과 지역별 공통점을 추가로 확인하고 있다. 지금까지 확보된 증언만으로 특정 원인을 단정하기는 어렵지만, 복수의 제보가 비슷한 시간대와 유사한 환경에서 반복되고 있다는 점은 단순한 개인 착시나 일회성 불안으로만 치부하기 어렵다는 지적이 나온다.",
          "관계 당국과 넥서스는 아직 범죄, 시설 결함, 환경 이상 가운데 어느 가능성도 확정하지 않은 상태다. 다만 시민들이 공통적으로 제기하는 '주변 인물이나 풍경이 뒤늦게 또렷해지거나, 시선을 돌린 뒤 다시 볼 때 형태가 달라 보였다'는 증언에 대해서는 현재까지 납득할 만한 설명이 제시되지 않고 있다. 본지는 추가 제보와 현장 확인을 바탕으로 해당 현상이 실제로 특정 구역에 집중돼 나타나는지, 또 최근 실종 사건들과 어떤 관련이 있는지 계속 추적할 예정이다."
        ],
        "articleCorruption": {
          "paragraphIndexes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          "inspectIndex": 10,
          "intensity": "active"
        }
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_DEVTOOLS_CUE',
        'system',
        $${
      "scene": {
        "id": "CH1_DEVTOOLS_CUE",
        "mode": "browser",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "notifications": [
        {
          "type": "system",
          "title": "페이지 렌더링 오류",
          "body": "외부 리소스 응답 지연으로 본문 일부가 누락되었습니다.",
          "priority": "medium"
        }
      ],
      "content": {
        "articleFooter": "[render warning] blocked resources detected / article body partially unavailable"
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_DEVTOOLS_FRAME',
        'system',
        $${
      "scene": {
        "id": "CH1_DEVTOOLS_FRAME",
        "mode": "devtools",
        "bgm": "rain-and-little-storm-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_NETWORK_TAB',
        'network',
        $${
      "scene": {
        "id": "CH1_NETWORK_TAB",
        "mode": "network",
        "bgm": "rain-and-little-storm-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_SUCCESS_REQUEST_SELECTED',
        'network',
        $${
      "scene": {
        "id": "CH1_SUCCESS_REQUEST_SELECTED",
        "mode": "network",
        "bgm": "rain-and-little-storm-v1.mp3",
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
            "size": "1.9 KB",
            "selected": true
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_PACKET_HEADERS_RESPONSE',
        'network',
        $${
      "scene": {
        "id": "CH1_PACKET_HEADERS_RESPONSE",
        "mode": "network",
        "bgm": "rain-and-little-storm-v1.mp3",
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
            "size": "1.9 KB",
            "selected": true
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
        ],
        "detailTabs": ["Headers", "Response"],
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
          },
          "bridge": {
            "entry": "connect_core()",
            "state": "waiting"
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_PACKET_MESSAGE',
        'system',
        $${
      "scene": {
        "id": "CH1_PACKET_MESSAGE",
        "mode": "network",
        "bgm": "rain-and-little-storm-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_CONSOLE_CONNECT_READY',
        'console',
        $${
      "scene": {
        "id": "CH1_CONSOLE_CONNECT_READY",
        "mode": "console",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "content": {
        "consoleLogs": [
          "[console] attached to local runtime",
          "[bridge] waiting for unresolved entry"
        ]
      },
      "messages": []
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_CONNECT_CORE_SUCCESS',
        'console',
        $${
      "scene": {
        "id": "CH1_CONNECT_CORE_SUCCESS",
        "mode": "console",
        "bgm": "rain-and-little-storm-v1.mp3",
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
        "playSound": "rain-lightning-storm-v1.mp3",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_LUCAS_DOG_APPEAR',
        'system',
        $${
      "scene": {
        "id": "CH1_LUCAS_DOG_APPEAR",
        "mode": "system",
        "bgm": "rain-and-little-storm-v1.mp3",
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
      "clickTargets": ["open_terminal"]
    }$$::jsonb,
        false,
        false
    ),
    (
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_RELAY_CLUE_REVISIT',
        'network',
        $${
      "scene": {
        "id": "CH1_RELAY_CLUE_REVISIT",
        "mode": "network",
        "bgm": "rain-and-little-storm-v1.mp3",
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
          "text": "필요한 값은 모두 열렸어. 여기서 더 오래 머물면 잡혀.",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_TERMINAL_SSH_READY',
        'console',
        $${
      "scene": {
        "id": "CH1_TERMINAL_SSH_READY",
        "mode": "terminal",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 2
      },
      "content": {
        "terminalOutput": [
          "terminal://lucas-relay"
        ]
      },
      "messages": []
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_SSH_AUTH_PROMPT',
        'console',
        $${
      "scene": {
        "id": "CH1_SSH_AUTH_PROMPT",
        "mode": "terminal",
        "bgm": "rain-and-little-storm-v1.mp3",
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
      "allowedActions": ["command"]
    }$$::jsonb,
        false,
        false
    ),
    (
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_SSH_CONNECTED',
        'console',
        $${
      "scene": {
        "id": "CH1_SSH_CONNECTED",
        "mode": "terminal",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "content": {
        "terminalOutput": [
          "guest@lucas-server:~$"
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_COMPLETE',
        'system',
        $${
      "scene": {
        "id": "CH1_COMPLETE",
        "mode": "system",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 0
      },
      "content": {},
      "notifications": []
    }$$::jsonb,
        'none',
        $${
      "allowedActions": []
    }$$::jsonb,
        true,
        true
    ),
    (
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_FAIL_UNRELATED',
        'system',
        $${
      "scene": {
        "id": "CH1_FAIL_UNRELATED",
        "mode": "system",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "content": {
        "consoleLogs": [
          "입력을 인식하지 못했습니다."
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "입력 처리 실패",
          "body": "현재 화면에서는 이 입력을 사용할 수 없습니다.",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_FAIL_DANGEROUS',
        'system',
        $${
      "scene": {
        "id": "CH1_FAIL_DANGEROUS",
        "mode": "system",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 2
      },
      "content": {
        "consoleLogs": [
          "permission denied",
          "cannot access requested target"
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "접근 거부",
          "body": "요청한 대상에 접근할 수 없습니다.",
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
        (
            SELECT id
            FROM chapters
            WHERE
                code = 'week01'
        ),
        'CH1_FAIL_SKIP',
        'system',
        $${
      "scene": {
        "id": "CH1_FAIL_SKIP",
        "mode": "system",
        "bgm": "rain-and-little-storm-v1.mp3",
        "glitchLevel": 1
      },
      "content": {
        "consoleLogs": [
          "command failed"
        ]
      },
      "notifications": [
        {
          "type": "system",
          "title": "실행 실패",
          "body": "요청을 완료할 수 없습니다.",
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
ON CONFLICT (code) DO
UPDATE
SET
    node_type = EXCLUDED.node_type,
    output_bundle = EXCLUDED.output_bundle,
    prompt_type = EXCLUDED.prompt_type,
    prompt_meta = EXCLUDED.prompt_meta,
    is_checkpoint = EXCLUDED.is_checkpoint,
    is_terminal = EXCLUDED.is_terminal,
    updated_at = NOW();

COMMIT;
