-- =============================================================================
-- 마이그레이션: users 테이블에 마지막 성공 로그인 시각 컬럼 추가
-- 작성일: 2026-05-07
-- 대상 DB: PostgreSQL (운영 DB 적용용)
--
-- 의미
--   - last_login_at은 성공적으로 로그인하여 서비스 토큰이 발급된 순간에만 갱신합니다.
--   - 일반 API 액션, 토큰 재발급(refresh), 로그아웃 시에는 갱신하지 않습니다.
-- =============================================================================

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITHOUT TIME ZONE;

COMMENT ON COLUMN users.last_login_at IS '마지막 성공 로그인 시각';

COMMIT;
