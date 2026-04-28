-- Runtime schema patch: add the natural key needed by transition seed upserts.
-- Run once before seed_transitions_chapter2.sql or any transition seed that uses ON CONFLICT.

BEGIN;

ALTER TABLE story_transitions
ALTER COLUMN expected_input TYPE TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_story_transitions_natural_key'
          AND conrelid = 'story_transitions'::regclass
    ) THEN
        ALTER TABLE story_transitions
            ADD CONSTRAINT uk_story_transitions_natural_key UNIQUE (
                from_node_id,
                action_type,
                expected_input,
                validator_type
            );
    END IF;
END $$;

COMMIT;
