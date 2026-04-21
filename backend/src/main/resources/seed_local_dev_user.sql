BEGIN;

INSERT INTO users (
    id,
    email,
    oauth_name,
    nickname,
    provider,
    provider_user_id,
    role
) VALUES (
    1,
    'local-dev@lucas.test',
    'LOCAL_DEV',
    'local-dev',
    'GOOGLE',
    'local-dev-1',
    'GUEST'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    oauth_name = EXCLUDED.oauth_name,
    nickname = EXCLUDED.nickname,
    provider = EXCLUDED.provider,
    provider_user_id = EXCLUDED.provider_user_id,
    role = EXCLUDED.role,
    modified_at = NOW();

SELECT setval(
    pg_get_serial_sequence('users', 'id'),
    GREATEST((SELECT MAX(id) FROM users), 1),
    true
);

COMMIT;
