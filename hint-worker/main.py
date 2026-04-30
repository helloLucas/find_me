import os
import sys
import json
import logging
import time
from datetime import datetime
import requests
import psycopg2
from psycopg2 import pool
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
MATTERMOST_REPORT_WEBHOOK_URL = os.getenv("MATTERMOST_REPORT_WEBHOOK_URL")
GMS_ENDPOINT = os.getenv("GMS_ENDPOINT")

# 필수 환경변수 검증
if not all([ES_URL, DB_URL, DB_USER, DB_PASS, OPENAI_API_KEY, MATTERMOST_WEBHOOK_URL, GMS_ENDPOINT]):
    logger.error("Missing required environment variables (check ELASTICSEARCH_URL, SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD, OPENAI_API_KEY, MATTERMOST_WEBHOOK_URL, GMS_ENDPOINT).")
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

# 전역 DB 커넥션 풀 초기화
try:
    db_pool = pool.SimpleConnectionPool(
        1, 5, # 최소 1개, 최대 5개 커넥션
        host=db_host,
        port=db_port,
        dbname=db_name,
        user=DB_USER,
        password=DB_PASS
    )
    if db_pool:
        logger.info("Database connection pool created successfully.")
except Exception as e:
    logger.error(f"Failed to create database connection pool: {e}")
    sys.exit(1)

def get_db_connection():
    """풀에서 DB 연결을 가져옵니다. 실패 시 최대 3번 재시도합니다."""
    retries = 3
    for i in range(retries):
        try:
            return db_pool.getconn()
        except Exception as e:
            if i < retries - 1:
                logger.warning(f"Failed to get DB connection (attempt {i+1}/{retries}): {e}. Retrying in 2s...")
                time.sleep(2)
            else:
                logger.error(f"Failed to get DB connection after {retries} attempts.")
                raise e

def release_db_connection(conn):
    """DB 연결을 풀에 반환합니다."""
    db_pool.putconn(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)

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
        release_db_connection(conn)

def get_bottleneck_data(chapter_id=None):
    """Elasticsearch에서 세션 기반 고도화 병목 지표를 추출합니다."""
    logger.info(f"Analyzing bottleneck patterns for Chapter: {chapter_id}...")
    es = Elasticsearch([ES_URL])
    
    # 챕터별 정밀 인덱싱: 최근 7일간의 인덱스만 명시적으로 타겟팅
    # 인덱스 패턴이 game-logs-YYYY.MM.DD 형식이므로 와일드카드를 사용하되 범위를 제한
    target_index = "game-logs-*" 
    
    # 챕터 필터 설정
    must_conditions = [{"range": {"@timestamp": {"gte": "now-7d", "lte": "now"}}}]
    if chapter_id:
        must_conditions.append({"term": {"chapter_id": chapter_id}})
    
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": must_conditions,
                "must_not": [
                    {"term": {"from_node_id": "null"}},
                    {"term": {"from_node_id": ""}}
                ]
            }
        },
        "aggs": {
            "nodes": {
                "terms": {
                    "field": "from_node_id",
                    "size": 20 # 더 넓은 범위를 분석
                },
                "aggs": {
                    "total_users": { "cardinality": { "field": "session_id" } },
                    "fail_logs": { 
                        "filter": { 
                            "terms": { "result": ["FAIL", "ERROR"] } # 실패와 오류를 모두 병목으로 판단
                        } 
                    },
                    "success_users": {
                        "filter": { "term": { "result": "SUCCESS" } },
                        "aggs": { "unique_success": { "cardinality": { "field": "session_id" } } }
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
        # request_timeout을 추가하여 ES 검색 지연 방지
        response = es.search(index=target_index, body=query, request_timeout=60)
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
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = "SELECT content FROM lucas_knowledge WHERE puzzle_id = %s LIMIT 1"
        cur.execute(query, (node_id,))
        result = cur.fetchone()
        
        if result:
            return result.get('content')
        return "정답 가이드를 찾을 수 없습니다."
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        return "데이터베이스에서 정답 가이드를 불러오는 데 실패했습니다."
    finally:
        cur.close()
        release_db_connection(conn)

def generate_hint(node_id, fail_count, churn_rate, wrong_answers, guide_content):
    """GMS Gemini API를 사용하여 루카스 페르소나의 모호한 힌트 메시지를 생성합니다."""
    logger.info("Generating persona-driven hint using GMS Gemini API...")
    
    # GMS 엔드포인트 설정 (환경변수에서 로드)
    
    system_prompt = """당신은 게임의 친근한 친구이자 조력자 '루카스'입니다. 
당신의 목표는 데이터 분석 결과를 바탕으로 플레이어들에게 '일간 팁'을 제공하는 것입니다.

[반드시 지켜야 할 규칙]
1. 말투 (Persona): 아주 친근하고 따뜻한 친구이자 조력자 같은 느낌으로 **반말(~해, ~야, ~었어, ~했더라!)을 사용**하세요. 격식을 차리지 말고 부드럽게 이야기하세요.
2. 힌트 방식: 너무 시적이거나 모호한 표현은 피하세요. 플레이어가 "무엇을 찾아봐야 할지" 또는 "어떤 명령어를 고민해야 할지" 실질적인 방향을 제시하세요. 
   - 나쁜 예: "어둠 속에서 빛을 찾아보렴"
   - 좋은 예: "저기 구석에 있는 낡은 문서 파일에 비밀번호 힌트가 적혀있던 것 같은데, 한번 열어보는 건 어때?"
3. 절대 금지: 정답 명령어 전체를 그대로 노출하지 마세요. (예: 'ls -al'이 답이라면 'ls' 정도는 언급 가능하지만 전체를 알려주지는 말 것)
4. 노드 ID 처리: 'CH1_...' 같은 시스템 아이디는 절대 노출하지 마세요. 대신 "터미널 접속 구간", "보안 코드 입력 단계" 처럼 사람이 이해할 수 있는 말로 풀어서 설명하세요.
5. 포맷: Mattermost에 어울리는 마크다운 형식을 사용하며, 사용자 제공 예시의 구조를 최대한 따르세요.
6. 가독성: 각 섹션 사이에는 반드시 빈 줄(Double Newline)을 넣어 가독성을 높이세요."""

    user_prompt = f"""
데이터 분석 결과를 바탕으로 루카스의 '일간 팁' 메시지를 작성해줘. 

[분석 데이터]
- 구간 설명: {guide_content}
- 이탈률: {churn_rate}%
- 실패 횟수: {fail_count}회
- 주요 오답: {', '.join(wrong_answers)}

위 데이터를 바탕으로 루카스의 '일간 팁' 메시지를 작성해줘.

구조 예시:
#### 🐶 [루카스의 일간 팁] "제목"

**📊 이번 챕터에서 험난했던 구간**
(구간 설명을 바탕으로 어떤 상황인지 반말로 친절하게 설명)

**💡 최다 오답 리포트**
1. {wrong_answers[0] if len(wrong_answers) > 0 else '없음'}
2. {wrong_answers[1] if len(wrong_answers) > 1 else '없음'}

**🐾 루카스의 한마디**
(반말로 친근하게, 플레이어가 실질적으로 해볼 만한 행동을 추천해주는 내용)
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
        "x-goog-api-key": OPENAI_API_KEY
    }

    try:
        # timeout 설정을 추가하여 무한 대기 방지
        response = requests.post(GMS_ENDPOINT, headers=headers, json=payload, timeout=30)
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

def send_to_mattermost(markdown_message, webhook_url, username="Lucas"):
    """생성된 마크다운 메시지를 특정 Mattermost 웹훅으로 전송합니다."""
    if not webhook_url:
        logger.warning("No webhook URL provided. Skipping message send.")
        return

    logger.info(f"Sending message to Mattermost ({username})...")
    payload = {
        "text": markdown_message,
        "username": username
    }
    
    try:
        response = requests.post(
            webhook_url, 
            data=json.dumps(payload),
            headers={'Content-Type': 'application/json'},
            timeout=20
        )
        response.raise_for_status()
        logger.info(f"Successfully sent message to Mattermost as {username}.")
    except Exception as e:
        logger.error(f"Failed to send webhook to Mattermost: {e}")

def get_detailed_stats(chapter_id, days=7):
    """지정한 기간(일) 동안의 상세 분석 데이터를 가져옵니다."""
    logger.info(f"Gathering detailed analysis for Chapter: {chapter_id} ({days} days)...")
    es = Elasticsearch([ES_URL])
    target_index = "game-logs-*"
    
    must_conditions = [{"range": {"@timestamp": {"gte": f"now-{days}d", "lte": "now"}}}]
    if chapter_id:
        must_conditions.append({"term": {"chapter_id": chapter_id}})

    query = {
        "size": 0,
        "query": { "bool": { "must": must_conditions } },
        "aggs": {
            "total_users": { "cardinality": { "field": "session_id" } },
            "total_actions": { "value_count": { "field": "session_id" } },
            "node_stats": {
                "terms": { "field": "from_node_id", "size": 100 },
                "aggs": {
                    "unique_users": { "cardinality": { "field": "session_id" } },
                    "success_count": { "filter": { "term": { "result": "SUCCESS" } } },
                    "fail_count": { "filter": { "terms": { "result": ["FAIL", "ERROR"] } } }
                }
            },
            "session_duration": {
                "terms": { "field": "session_id", "size": 1000 },
                "aggs": {
                    "min_ts": { "min": { "field": "@timestamp" } },
                    "max_ts": { "max": { "field": "@timestamp" } }
                }
            }
        }
    }

    try:
        res = es.search(index=target_index, body=query)
        aggs = res['aggregations']
        
        total_users = aggs['total_users']['value']
        total_actions = aggs['total_actions']['value']
        
        # 평균 플레이 시간 계산 (초 단위 -> 분 단위)
        durations = []
        for bucket in aggs['session_duration']['buckets']:
            start = bucket['min_ts']['value']
            end = bucket['max_ts']['value']
            if start and end:
                durations.append((end - start) / 1000) # ms to s
        
        avg_duration_min = (sum(durations) / len(durations) / 60) if durations else 0
        
        node_report = []
        for bucket in aggs['node_stats']['buckets']:
            node_id = bucket['key']
            if node_id in ["null", ""]: continue
            
            users = bucket['unique_users']['value']
            success = bucket['success_count']['doc_count']
            fails = bucket['fail_count']['doc_count']
            
            # 이탈률 추정 (전체 유저 대비 이 노드에서 멈춘 비율)
            # 실제 서비스에서는 (방문자 - 성공자) / 방문자로 계산
            churn_rate = ((users - bucket['success_count']['doc_count']) / users * 100) if users > 0 else 0
            
            node_report.append({
                "node_id": node_id,
                "users": users,
                "success_rate": (success / (success + fails) * 100) if (success + fails) > 0 else 0,
                "fail_count": fails,
                "churn_rate": churn_rate
            })
            
        # 이탈률 높은 순으로 정렬
        node_report.sort(key=lambda x: x['churn_rate'], reverse=True)
        
        return {
            "total_users": total_users,
            "total_actions": total_actions,
            "avg_duration": avg_duration_min,
            "nodes": node_report
        }
    except Exception as e:
        logger.error(f"Failed to gather detailed stats: {e}")
        return None

def generate_dev_report(chapter_id, stats_1d, stats_7d, is_monday=False):
    """운영진용 일간/주간 비교 분석 리포트 마크다운을 생성합니다."""
    if not stats_1d or not stats_7d: return "데이터를 불러오지 못했습니다."
    
    title_suffix = "(주말 포함)" if is_monday else "(24h)"
    report = f"### 📊 [운영 리포트] {chapter_id} 분석 결과 {title_suffix}\n\n"
    
    # 요약 비교 섹션
    label_1d = "지난 3일(주말)" if is_monday else "어제"
    report += f"#### 📈 주요 지표 요약 ({label_1d} vs 최근 7일)\n"
    report += f"- **총 참여 유저**: {stats_1d['total_users']}명 (주간 합계: {stats_7d['total_users']}명)\n"
    report += f"- **평균 플레이 시간**: {stats_1d['avg_duration']:.1f}분 (주간 평균: {stats_7d['avg_duration']:.1f}분)\n"
    report += f"- **총 액션 발생**: {stats_1d['total_actions']}회 (주간 합계: {stats_7d['total_actions']}회)\n\n"
    
    # 어제 기준 상세 구간 분석
    report += "#### ⚠️ 어제(24h) 이탈 주의 구간 (Top 5)\n"
    report += "| 노드 ID | 유저 수 | 이탈률 | 성공률 | 실패 횟수 |\n"
    report += "| :--- | :---: | :---: | :---: | :---: |\n"
    
    for node in stats_1d['nodes'][:5]:
        report += f"| {node['node_id']} | {node['users']}명 | {node['churn_rate']:.1f}% | {node['success_rate']:.1f}% | {node['fail_count']}회 |\n"
    
    # 주간 트렌드 (비교용)
    report += "\n#### 🗓️ 주간 이탈 스토리 노드 (Top 3)\n"
    for node in stats_7d['nodes'][:3]:
        report += f"- **{node['node_id']}**: 주간 이탈률 {node['churn_rate']:.1f}% (성공률 {node['success_rate']:.1f}%)\n"
            
    return report

def main():
    logger.info("Starting Daily Mattermost Hint Generation Job...")
    
    # 1. 현재 활성화된 챕터 조회
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
        
    # 7. Mattermost 발송 (유저용 힌트)
    send_to_mattermost(hint_message, MATTERMOST_WEBHOOK_URL, username="Lucas")
    
    # 8. 운영진용 상세 리포트 생성 및 발송 (1일 vs 7일 비교)
    report_webhook = MATTERMOST_REPORT_WEBHOOK_URL
    
    # 월요일이면 주말(3일치)을 포함하여 리포트 생성
    is_monday = datetime.now().weekday() == 0
    report_days = 3 if is_monday else 1
    
    stats_1d = get_detailed_stats(active_chapter, days=report_days)
    stats_7d = get_detailed_stats(active_chapter, days=7)
    dev_report = generate_dev_report(active_chapter, stats_1d, stats_7d, is_monday=is_monday)
    send_to_mattermost(dev_report, report_webhook, username="Lucas-Analyzer")
    
    # 9. 발송 이력 기록
    record_sent_hint(node_id, active_chapter)
    
    # 9. 커넥션 풀 종료
    if db_pool:
        db_pool.closeall()
        logger.info("Database connection pool closed.")
    
    logger.info("Job completed successfully.")

if __name__ == "__main__":
    main()
