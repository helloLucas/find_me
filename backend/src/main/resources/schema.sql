BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(50),
    ssafy_id BIGINT UNIQUE,
    region VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN ('USER', 'GUEST', 'ADMIN')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE chapters (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE story_nodes (
    id BIGSERIAL PRIMARY KEY,
    chapter_id BIGINT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL UNIQUE,
    node_type VARCHAR(50) NOT NULL CHECK (
        node_type IN ('narrative', 'console', 'network', 'choice', 'system', 'ending')
    ),
    output_bundle JSONB NOT NULL,
    prompt_type VARCHAR(50) CHECK (
        prompt_type IN ('none', 'command', 'choice', 'inspect', 'click')
    ),
    prompt_meta JSONB,
    is_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
    is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE story_transitions (
    id BIGSERIAL PRIMARY KEY,
    from_node_id BIGINT NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
    to_node_id BIGINT NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (
        action_type IN ('command', 'click', 'inspect', 'choice', 'system')
    ),
    expected_input VARCHAR(255),
    validator_type VARCHAR(50) NOT NULL CHECK (
        validator_type IN ('exact', 'regex', 'server_rule')
    ),
    validator_config JSONB,
    fail_node_id BIGINT REFERENCES story_nodes(id) ON DELETE SET NULL,
    effect_bundle JSONB,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE unlocked_endings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ending_type VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, ending_type)
);

CREATE TABLE user_fragments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fragment_code VARCHAR(50) NOT NULL,
    acquired_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, fragment_code)
);

CREATE TABLE save_slots (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_no INT NOT NULL,
    save_title VARCHAR(255) NOT NULL,
    chapter_id BIGINT NOT NULL REFERENCES chapters(id),
    node_id BIGINT NOT NULL REFERENCES story_nodes(id),
    snapshot_json JSONB NOT NULL,
    saved_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, slot_no)
);

CREATE TABLE user_story_progress (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    latest_chapter_id BIGINT NOT NULL REFERENCES chapters(id),
    latest_node_id BIGINT NOT NULL REFERENCES story_nodes(id),
    latest_checkpoint_node_id BIGINT REFERENCES story_nodes(id),
    latest_snapshot_json JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lucas_knowledge (
    id BIGSERIAL PRIMARY KEY,
    chapter INT,
    puzzle_id VARCHAR(50),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(1536)
);

CREATE TABLE story_action_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    node_id BIGINT NOT NULL REFERENCES story_nodes(id),
    action_type VARCHAR(50) NOT NULL CHECK (
        action_type IN ('command', 'click', 'inspect', 'choice', 'system')
    ),
    input_value TEXT,
    result VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapters_sort_order
    ON chapters(sort_order);

CREATE INDEX idx_story_nodes_chapter_id
    ON story_nodes(chapter_id);

CREATE INDEX idx_story_nodes_is_checkpoint
    ON story_nodes(is_checkpoint);

CREATE INDEX idx_story_transitions_from_node_id
    ON story_transitions(from_node_id);

CREATE INDEX idx_story_transitions_to_node_id
    ON story_transitions(to_node_id);

CREATE INDEX idx_story_transitions_fail_node_id
    ON story_transitions(fail_node_id);

CREATE INDEX idx_unlocked_endings_user_id
    ON unlocked_endings(user_id);

CREATE INDEX idx_user_fragments_user_id
    ON user_fragments(user_id);

CREATE INDEX idx_save_slots_user_id
    ON save_slots(user_id);

CREATE INDEX idx_save_slots_user_saved_at
    ON save_slots(user_id, saved_at DESC);

CREATE INDEX idx_user_story_progress_latest_chapter_id
    ON user_story_progress(latest_chapter_id);

CREATE INDEX idx_user_story_progress_latest_node_id
    ON user_story_progress(latest_node_id);

CREATE INDEX idx_lucas_knowledge_chapter
    ON lucas_knowledge(chapter);

CREATE INDEX idx_lucas_knowledge_puzzle_id
    ON lucas_knowledge(puzzle_id);

CREATE INDEX idx_lucas_knowledge_metadata
    ON lucas_knowledge USING GIN(metadata);

CREATE INDEX idx_story_action_logs_user_id
    ON story_action_logs(user_id);

CREATE INDEX idx_story_action_logs_session_id
    ON story_action_logs(session_id);

CREATE INDEX idx_story_action_logs_node_id
    ON story_action_logs(node_id);

CREATE INDEX idx_story_action_logs_created_at
    ON story_action_logs(created_at);

CREATE INDEX idx_lucas_knowledge_embedding_cosine
    ON lucas_knowledge
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMIT;