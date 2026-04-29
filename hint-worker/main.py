import os
import sys
import json
import logging
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from elasticsearch import Elasticsearch

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 환경변수 로드
ES_URL = os.getenv("ELASTICSEARCH_URL")
DB_URL = os.getenv("SPRING_DATASOURCE_URL")
DB_USER = os.getenv("SPRING_DATASOURCE_USERNAME")
DB_PASS = os.getenv("SPRING_DATASOURCE_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MATTERMOST_WEBHOOK_URL = os.getenv("MATTERMOST_WEBHOOK_URL")

# 필수 환경변수 검증
if not all([ES_URL, DB_URL, DB_USER, DB_PASS, OPENAI_API_KEY, MATTERMOST_WEBHOOK_URL]):
    logger.error("Missing required environment variables.")
    sys.exit(1)

# PostgreSQL 연결 파싱
try:
    db_host_port_db = DB_URL.replace("jdbc:postgresql://", "").split("/")
    db_host_port = db_host_port_db[0].split(":")
    db_host = db_host_port[0]
    db_port = db_host_port[1] if len(db_host_port) > 1 else "5432"
    db_name = db_host_port_db[1].split("?")[0]
except Exception as e:
    logger.error(f"Failed to parse DB_URL: {DB_URL}")
    sys.exit(1)

def get_db_connection():
    """DB 연결을 생성합니다."""
    return psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname=db_name,
        user=DB_USER,
        password=DB_PASS
    )

def get_active_chapter():
    """is_published가 true인 챕터들 중 sort_order가 가장 높은(최신) 챕터 코드를 가져옵니다."""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT code FROM chapters WHERE is_published = true ORDER BY sort_order DESC LIMIT 1")
        result = cur.fetchone()
        return result['code'] if result else "week01"
    except Exception as e:
        logger.error(f"Failed to fetch active chapter from chapters table: {e}")
        return "week01"
    finally:
        cur.close()
        conn.close()

def get_already_sent_nodes(chapter_id):
    """현재 챕터에서 최근 7일 이내에 이미 발송된 노드 리스트를 가져옵니다."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 이번 주(최근 7일)에 이미 힌트가 나간 노드들 조회
        query = "SELECT node_id FROM hint_history WHERE chapter_id = %s AND sent_at > NOW() - INTERVAL '7 days'"
        cur.execute(query, (chapter_id,))
        rows = cur.fetchall()
        return [row[0] for row in rows]
    except Exception as e:
        logger.error(f"Failed to fetch sent nodes: {e}")
        return []
    finally:
        cur.close()
        conn.close()

def record_sent_hint(node_id, chapter_id):
    """발송된 힌트 정보를 DB에 기록합니다."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        query = "INSERT INTO hint_history (node_id, chapter_id) VALUES (%s, %s)"
        cur.execute(query, (node_id, chapter_id))
        conn.commit()
        logger.info(f"Recorded hint history for node: {node_id}")
    except Exception as e:
        logger.error(f"Failed to record hint history: {e}")
    finally:
        cur.close()
        conn.close()

def get_bottleneck_data(chapter_id=None):
    """Elasticsearch에서 세션 기반 고도화 병목 지표를 추출합니다."""
    logger.info(f"Analyzing bottleneck patterns for Chapter: {chapter_id}...")
    es = Elasticsearch([ES_URL])
    
    # 챕터 필터 설정
    must_conditions = [{"range": {"@timestamp": {"gte": "now-7d", "lte": "now"}}}]
    if chapter_id:
        must_conditions.append({"term": {"chapter_id.keyword": chapter_id}})
    
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": must_conditions,
                "must_not": [
                    {"term": {"from_node_id.keyword": "null"}},
                    {"term": {"from_node_id.keyword": ""}}
                ]
            }
        },
        "aggs": {
            "nodes": {
                "terms": {
                    "field": "from_node_id.keyword",
                    "size": 20 # 더 넓은 범위를 분석
                },
                "aggs": {
                    "total_users": { "cardinality": { "field": "session_id.keyword" } },
                    "fail_logs": { 
                        "filter": { 
                            "terms": { "result.keyword": ["FAIL", "ERROR"] } # 실패와 오류를 모두 병목으로 판단
                        } 
                    },
                    "success_users": {
                        "filter": { "term": { "result.keyword": "SUCCESS" } },
                        "aggs": { "unique_success": { "cardinality": { "field": "session_id.keyword" } } }
                    },
                    "avg_fails_per_user": {
                        "bucket_script": {
                            "buckets_path": {
                                "total_fails": "fail_logs._count",
                                "user_count": "total_users"
                            },
                            "script": "params.user_count > 0 ? (double)params.total_fails / params.user_count : 0"
                        }
                    },
                    # 이탈률 추정: (전체 방문자 - 성공자) / 전체 방문자
                    "churn_rate": {
                        "bucket_script": {
                            "buckets_path": {
                                "total": "total_users",
                                "success": "success_users>unique_success"
                            },
                            "script": "params.total > 0 ? (double)(params.total - params.success) / params.total : 0"
                        }
                    },
                    "top_wrong_answers": {
                        "terms": {
                            "field": "input_value_norm.keyword",
                            "size": 3
                        }
                    }
                }
            }
        }
    }
    
    try:
        response = es.search(index="game-logs-*", body=query)
        buckets = response.get("aggregations", {}).get("nodes", {}).get("buckets", [])
        
        candidates = []
        for b in buckets:
            node_id = b.get("key")
            avg_fails = b.get("avg_fails_per_user", {}).get("value", 0)
            churn = b.get("churn_rate", {}).get("value", 0)
            total_fail_count = b.get("fail_logs", {}).get("doc_count", 0)
            
            # 사용자 정의 임계치 적용 (병목 점수 계산)
            # 1. 평균 실패 7회 이상 가중치
            # 2. 이탈률 15% 이상 가중치
            # 3. 단순 실패 빈도 고려
            score = (avg_fails / 7.0) * 40 + (churn / 0.15) * 40 + (total_fail_count / 100.0) * 20
            
            candidates.append({
                "nodeId": node_id,
                "score": score,
                "avgFails": round(avg_fails, 2),
                "churnRate": round(churn * 100, 1),
                "failCount": total_fail_count,
                "wrongAnswers": [w.get("key") for w in b.get("top_wrong_answers", {}).get("buckets", [])]
            })
            
        # 점수 순으로 정렬
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates
    except Exception as e:
        logger.error(f"Advanced ES analysis failed: {e}")
        return []

def get_node_guideline(node_id):
    """PostgreSQL(pgvector)에서 해당 퍼즐 노드의 정답 가이드를 조회합니다."""
    logger.info(f"Connecting to DB to get guideline for node: {node_id}")
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=DB_USER,
            password=DB_PASS
        )
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # lucas_knowledge 테이블 구조에 맞게 조회 (puzzle_id 필드 가정)
        # 만약 puzzle_id 필드가 없다면 메타데이터 JSON 필드를 검색하거나 적절한 컬럼 사용
        query = "SELECT content FROM lucas_knowledge WHERE metadata->>'puzzle_id' = %s LIMIT 1"
        cur.execute(query, (node_id,))
        result = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if result:
            return result.get('content')
        return "정답 가이드를 찾을 수 없습니다."
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        return "데이터베이스에서 정답 가이드를 불러오는 데 실패했습니다."

def generate_hint(node_id, fail_count, churn_rate, wrong_answers, guide_content):
    """GMS Gemini API를 사용하여 루카스 페르소나의 모호한 힌트 메시지를 생성합니다."""
    logger.info("Generating persona-driven hint using GMS Gemini API...")
    
    # GMS 엔드포인트 설정
    GMS_ENDPOINT = "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
    
    system_prompt = """당신은 게임의 조력자 '루카스'입니다. 
당신의 목표는 데이터 분석 결과를 바탕으로 플레이어들에게 '일간 팁'을 제공하는 것입니다.

[반드시 지켜야 할 규칙]
1. 페르소나: 너무 장난스럽지 않으면서도 따뜻하고 듬직한 조력자의 느낌을 유지하세요.
2. 절대 금지: 실제 정답 명령어 전체나 정답 키워드를 직접적으로 언급하지 마세요. 
3. 힌트 방식: 플레이어가 스스로 정답을 유추할 수 있도록 은유적이거나 상황적인 힌트만 제공하세요.
4. 노드 ID 처리: 'CH1_...' 같은 시스템 아이디는 절대 노출하지 마세요. 대신 가이드라인을 읽고 "터미널 접속 구간", "보안 코드 입력 단계" 처럼 사람이 이해할 수 있는 말로 풀어서 설명하세요.
5. 포맷: Mattermost에 어울리는 마크다운 형식을 사용하며, 사용자 제공 예시의 구조를 최대한 따르세요.
6. 가독성: Mattermost에 전송될 메시지이므로, **각 섹션 사이에는 반드시 빈 줄(Double Newline)을 넣어** 가독성을 극대화하세요."""

    user_prompt = f"""
데이터 분석 결과를 바탕으로 루카스의 '일간 팁' 메시지를 작성해주세요.

[분석 데이터]
- 구간 설명: {guide_content}
- 이탈률: {churn_rate}%
- 실패 횟수: {fail_count}회
- 주요 오답: {', '.join(wrong_answers)}

위 데이터를 바탕으로 루카스의 '일간 팁' 메시지를 작성해주세요.
구조 예시:
🐶 [루카스의 일간 팁] "제목"

**📊 이번 챕터에서 험난했던 구간**
(풀어서 설명) (유저 {churn_rate}%가 여기서 멈춤!)

**💡 최다 오답 리포트**
1. {wrong_answers[0] if len(wrong_answers) > 0 else '없음'}
2. {wrong_answers[1] if len(wrong_answers) > 1 else '없음'}

**🐾 루카스의 한마디**
(모호하고 도움이 되는 힌트 내용)
"""

    # Gemini API 요청 구조
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{system_prompt}\n\n{user_prompt}"
                    }
                ]
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": OPENAI_API_KEY # 기존 변수명 유지 (GMS 키가 주입됨)
    }

    try:
        response = requests.post(GMS_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        
        result = response.json()
        # Gemini 응답 구조에서 텍스트 추출
        hint_text = result['candidates'][0]['content']['parts'][0]['text']
        return hint_text
    except Exception as e:
        logger.error(f"Gemini API request failed: {e}")
        try:
            error_details = response.text
            logger.error(f"Response details: {error_details}")
        except:
            pass
        return None

def send_to_mattermost(markdown_message):
    """생성된 마크다운 메시지를 Mattermost 웹훅으로 전송합니다."""
    logger.info("Sending hint to Mattermost...")
    payload = {
        "text": markdown_message,
        "username": "Lucas Hint Bot",
        "icon_url": "https://lucas-assets.s3.amazonaws.com/lucas-icon.png" # 아이콘이 있다면 설정
    }
    
    try:
        response = requests.post(
            MATTERMOST_WEBHOOK_URL, 
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        logger.info("Successfully sent message to Mattermost.")
    except Exception as e:
        logger.error(f"Failed to send webhook to Mattermost: {e}")

def main():
    logger.info("Starting Daily Mattermost Hint Generation Job...")
    
    # 1. 현재 활성화된 챕터 조회 (DB에서 관리)
    active_chapter = get_active_chapter()
    logger.info(f"Current Active Chapter: {active_chapter}")
    
    # 2. ES 병목 노드 후보군 추출
    node_candidates = get_bottleneck_data(active_chapter)
    if not node_candidates:
        logger.info(f"No bottleneck data found for chapter {active_chapter}. Exiting.")
        return
        
    # 3. 이번 주에 이미 힌트가 나간 노드들 조회
    sent_nodes = get_already_sent_nodes(active_chapter)
    logger.info(f"Already sent nodes for {active_chapter} this week: {sent_nodes}")
    
    # 4. 중복되지 않은 최상위 노드 선택
    selected_node = None
    for node in node_candidates:
        if node["nodeId"] not in sent_nodes:
            selected_node = node
            break
            
    if not selected_node:
        logger.info("All top bottleneck nodes for this chapter have already been hinted this week. Exiting.")
        return
        
    node_id = selected_node["nodeId"]
    fail_count = selected_node["failCount"]
    avg_fails = selected_node["avgFails"]
    churn_rate = selected_node["churnRate"]
    wrong_answers = selected_node["wrongAnswers"]
    
    logger.info(f"Selected Node for Hint: {node_id}")
    logger.info(f"Metrics -> Score: {selected_node['score']:.2f}, Avg Fails: {avg_fails}, Churn: {churn_rate}%")
    
    # 5. DB에서 정답 가이드 조회
    guide_content = get_node_guideline(node_id)
    
    # 6. Gemini 힌트 생성
    hint_message = generate_hint(node_id, fail_count, churn_rate, wrong_answers, guide_content)
    if not hint_message:
        logger.error("Failed to generate hint message. Exiting.")
        return
        
    # 7. Mattermost 발송
    send_to_mattermost(hint_message)
    
    # 8. 발송 이력 기록
    record_sent_hint(node_id, active_chapter)
    
    logger.info("Job completed successfully.")

if __name__ == "__main__":
    main()
