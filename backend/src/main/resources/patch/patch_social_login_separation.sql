-- =============================================================================
-- 마이그레이션: users 테이블 1:1 인증 정보 → social_logins 테이블 1:N 분리
-- 작성일: 2026-05-04
-- 대상 DB: PostgreSQL (운영 DB 적용용)
--
-- 실행 순서
--   STEP 1. social_logins 테이블 신규 생성
--   STEP 2. 기존 users 데이터를 social_logins 로 복사 (INSERT INTO ... SELECT)
--   STEP 3. users 테이블에서 provider, provider_user_id 컬럼 DROP
--
-- 주의사항
--   - 운영 적용 전 반드시 백업본 확인 후 실행하세요.
--   - 전체를 트랜잭션으로 묶어 원자적으로 처리합니다.
-- =============================================================================

BEGIN;

-- ──────────────────────────────────────────────
-- STEP 1. social_logins 테이블 생성
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_logins (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(30)  NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    modified_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_social_logins_provider_provider_user_id
        UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_logins_user_id
    ON social_logins(user_id);

CREATE INDEX IF NOT EXISTS idx_social_logins_provider_provider_user_id
    ON social_logins(provider, provider_user_id);

-- ──────────────────────────────────────────────
-- STEP 2. 기존 users 데이터 → social_logins 이관
--   - provider IS NOT NULL 조건: 소셜 정보가 있는 MEMBER만 대상
--   - GUEST(provider = NULL)는 소셜 정보 없으므로 제외
-- ──────────────────────────────────────────────
INSERT INTO social_logins (user_id, provider, provider_user_id, created_at, modified_at)
SELECT
    id,
    provider,
    provider_user_id,
    COALESCE(created_at, NOW()),
    COALESCE(modified_at, NOW())
FROM users
WHERE provider IS NOT NULL
  AND provider_user_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- STEP 3. users 테이블에서 인증 관련 컬럼 및 제약 조건 제거
-- ──────────────────────────────────────────────

-- 유니크 제약조건 삭제
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS uk_users_provider_provider_user_id;

-- provider, provider_user_id 컬럼 삭제
ALTER TABLE users
    DROP COLUMN IF EXISTS provider;

ALTER TABLE users
    DROP COLUMN IF EXISTS provider_user_id;

-- oauth_name 컬럼을 NULL 허용으로 변경
ALTER TABLE users
    ALTER COLUMN oauth_name DROP NOT NULL;

-- nickname 컬럼을 NOT NULL로 변경
-- (주의: 기존 데이터 중 nickname이 NULL인 행이 있다면 이 구문 실행 시 오류가 발생할 수 있습니다.
-- 필요한 경우 사전에 UPDATE users SET nickname = '임시닉네임' WHERE nickname IS NULL; 작업이 선행되어야 합니다.)
ALTER TABLE users
    ALTER COLUMN nickname SET NOT NULL;

COMMIT;
