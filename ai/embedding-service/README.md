# 루카스 임베딩 서비스

GMS 임베딩 API를 감싸는 FastAPI 서비스입니다.  
문서 임베딩(`RETRIEVAL_DOCUMENT`)과 런타임 질의 임베딩(`RETRIEVAL_QUERY`)을 분리해서 제공합니다.

기본 모델값:

- `GMS_EMBEDDING_MODEL=gemini-embedding-001`

참고:

- 현재 GMS 환경에서는 `text-embedding-004`를 그대로 모델명으로 넣으면 `embedContent`에서 404가 발생할 수 있습니다.
- 현재 키 기준으로 `gemini-embedding-001` 호출은 정상 동작 확인했습니다.

## 1) 서버 실행

```bash
cd ai/embedding-service
cp .env.example .env
```

`.env`에서 `GMS_KEY`를 실제 키로 바꾼 뒤:

```bash
docker compose up --build -d
```

헬스체크:

```bash
curl http://localhost:8101/health
```

## 2) 시딩(전이 정답 -> lucas_knowledge -> embedding) 한 번에 실행

아래 스크립트가 자동으로 수행합니다.

1. 임베딩 서비스 헬스체크
2. `backend/src/main/resources/seed_lucas_knowledge_from_transitions.sql` 실행
3. `lucas_knowledge`의 전이 정답 행 조회
4. `/v1/hint/embed-documents` 호출
5. `lucas_knowledge.embedding` 업데이트

```bash
cd ai/embedding-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed_transition_embeddings.py
```

기본 DB 접속값:

- host: `localhost`
- port: `5432`
- db: `lucas_db`
- user: `lucas_admin`
- password: `lucas1234!`

필요하면 인자로 변경:

```bash
python scripts/seed_transition_embeddings.py \
  --db-host 127.0.0.1 \
  --db-port 5432 \
  --db-name lucas_db \
  --db-user lucas_admin \
  --db-password "your_password"
```

## 3) 자주 쓰는 옵션

- SQL 적재 생략(이미 적재된 경우):
```bash
python scripts/seed_transition_embeddings.py --skip-transition-sql --output-dimensionality 1536
```

- 실제 업데이트 없이 사전 점검:
```bash
python scripts/seed_transition_embeddings.py --dry-run
```

- 임베딩 차원 강제(모델 옵션, `lucas_knowledge.embedding=vector(1536)`이면 1536 권장):
```bash
python scripts/seed_transition_embeddings.py --output-dimensionality 1536
```

## 4) 차원 불일치 에러가 날 때

스크립트는 `lucas_knowledge.embedding`의 `vector(N)` 차원과 실제 임베딩 차원을 비교합니다.  
불일치하면 실패시키고, 컬럼 차원 조정 필요 메시지를 출력합니다.

예시:

```sql
ALTER TABLE lucas_knowledge
ALTER COLUMN embedding TYPE vector(실제차원);
```

## 5) 주요 API

- `GET /health`
- `GET /v1/key-info`
- `POST /v1/embeddings`
- `POST /v1/embed`
- `POST /v1/hint/embed-documents`
- `POST /v1/hint/embed-query`
