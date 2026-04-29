import os
import sys
import json
import logging
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from elasticsearch import Elasticsearch
from openai import OpenAI

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 환경변수 로드
ES_URL = os.getenv("ELASTICSEARCH_URL", "http://elasticsearch.lucas-elk.svc.cluster.local:9200")
DB_URL = os.getenv("SPRING_DATASOURCE_URL")
DB_USER = os.getenv("SPRING_DATASOURCE_USERNAME")
DB_PASS = os.getenv("SPRING_DATASOURCE_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MATTERMOST_WEBHOOK_URL = os.getenv("MATTERMOST_WEBHOOK_URL")

# 필수 환경변수 검증
if not all([ES_URL, DB_URL, DB_USER, DB_PASS, OPENAI_API_KEY, MATTERMOST_WEBHOOK_URL]):
    logger.error("Missing required environment variables. Please check K8S Secret/ConfigMap.")
    sys.exit(1)

# PostgreSQL 연결 파싱 (jdbc:postgresql://host:port/db)
try:
    db_host_port_db = DB_URL.replace("jdbc:postgresql://", "").split("/")
    db_host_port = db_host_port_db[0].split(":")
    db_host = db_host_port[0]
    db_port = db_host_port[1] if len(db_host_port) > 1 else "5432"
    db_name = db_host_port_db[1].split("?")[0]
except Exception as e:
    logger.error(f"Failed to parse DB_URL: {DB_URL}")
    sys.exit(1)

def get_bottleneck_data():
    """Elasticsearch에서 가장 실패가 많은 노드와 해당 노드의 최다 오답 3가지를 추출합니다."""
    logger.info("Connecting to Elasticsearch...")
    es = Elasticsearch([ES_URL])
    
    query = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"term": {"result.keyword": "FAIL"}},
                    {"range": {"@timestamp": {"gte": "now-7d", "lte": "now"}}}
                ],
                "must_not": [
                    {"term": {"puzzle_id.keyword": "null"}},
                    {"term": {"puzzle_id.keyword": ""}}
                ]
            }
        },
        "aggs": {
            "bottleneck_nodes": {
                "terms": {
                    "field": "puzzle_id.keyword",
                    "size": 1,
                    "order": {"_count": "desc"}
                },
                "aggs": {
                    "top_wrong_answers": {
                        "terms": {
                            "field": "input_value_norm.keyword",
                            "size": 3,
                            "order": {"_count": "desc"}
                        }
                    }
                }
            }
        }
    }
    
    try:
        response = es.search(index="game-logs-*", body=query)
        buckets = response.get("aggregations", {}).get("bottleneck_nodes", {}).get("buckets", [])
        
        if not buckets:
            return None
            
        top_node = buckets[0]
        node_id = top_node.get("key")
        fail_count = top_node.get("doc_count")
        wrong_answers = [bucket.get("key") for bucket in top_node.get("top_wrong_answers", {}).get("buckets", [])]
        
        return {
            "nodeId": node_id,
            "failCount": fail_count,
            "wrongAnswers": wrong_answers
        }
    except Exception as e:
        logger.error(f"Elasticsearch query failed: {e}")
        return None

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

def generate_hint(node_id, fail_count, wrong_answers, guide_content):
    """OpenAI API를 사용하여 Mattermost 힌트 마크다운 메시지를 생성합니다."""
    logger.info("Generating hint using OpenAI API...")
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    system_prompt = """당신은 '강아지 루카스'입니다. 플레이어들이 게임에서 어려움을 겪는 구간의 데이터를 분석하여 힌트를 제공하는 역할을 합니다.
말투는 항상 귀엽고 친절한 강아지처럼 "멍멍!", "~할개!" 와 같은 어투를 사용해야 합니다.
Mattermost 채널에 전송될 메시지이므로 마크다운(Markdown) 포맷으로 예쁘고 가독성 좋게 작성해주세요.
주의: 실제 정답을 직접적으로 알려주기보다는 생각할 수 있는 유도성 힌트를 제공하세요."""

    user_prompt = f"""
최근 일주일 동안 플레이어들이 '{node_id}' 구간에서 가장 많이 막히고 있어요! (총 {fail_count}회 실패)

플레이어들이 가장 많이 입력한 오답 3가지는 다음과 같습니다:
{', '.join(wrong_answers)}

이 구간의 실제 정답 및 가이드라인은 다음과 같습니다:
{guide_content}

이 데이터를 바탕으로 플레이어들에게 도움이 될 만한 힌트 메시지를 강아지 루카스 페르소나에 맞춰 작성해주세요.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI API request failed: {e}")
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
    logger.info("Starting Weekly Mattermost Hint Generation Job...")
    
    # 1. ES 병목 노드 추출
    bottleneck_data = get_bottleneck_data()
    if not bottleneck_data:
        logger.info("No bottleneck data found. Exiting.")
        return
        
    node_id = bottleneck_data["nodeId"]
    fail_count = bottleneck_data["failCount"]
    wrong_answers = bottleneck_data["wrongAnswers"]
    logger.info(f"Top Bottleneck Node: {node_id} ({fail_count} fails)")
    logger.info(f"Top Wrong Answers: {wrong_answers}")
    
    # 2. DB에서 정답 가이드 조회
    guide_content = get_node_guideline(node_id)
    
    # 3. LLM 힌트 생성
    hint_message = generate_hint(node_id, fail_count, wrong_answers, guide_content)
    if not hint_message:
        logger.error("Failed to generate hint message. Exiting.")
        return
        
    # 4. Mattermost 발송
    send_to_mattermost(hint_message)
    logger.info("Job completed successfully.")

if __name__ == "__main__":
    main()
