-- Runtime patch: publish week01/week02 and backfill week02 lobby unlocks.
-- Run after Chapter 2 seed data exists.

BEGIN;

ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE chapters
SET is_published = TRUE
WHERE code IN ('week01', 'week02');

WITH previous_chapter AS (
    SELECT id
    FROM chapters
    WHERE code = 'week01'
),
next_chapter AS (
    SELECT id
    FROM chapters
    WHERE code = 'week02'
)
INSERT INTO user_chapter_progress (
    user_id,
    chapter_id,
    status
)
SELECT
    previous_progress.user_id,
    next_chapter.id,
    'UNLOCKED'
FROM user_chapter_progress previous_progress
JOIN previous_chapter
    ON previous_chapter.id = previous_progress.chapter_id
CROSS JOIN next_chapter
WHERE previous_progress.status = 'COMPLETED'
  AND NOT EXISTS (
      SELECT 1
      FROM user_chapter_progress existing_progress
      WHERE existing_progress.user_id = previous_progress.user_id
        AND existing_progress.chapter_id = next_chapter.id
  )
ON CONFLICT (user_id, chapter_id) DO NOTHING;

WITH previous_chapter AS (
    SELECT id
    FROM chapters
    WHERE code = 'week01'
),
next_chapter AS (
    SELECT id
    FROM chapters
    WHERE code = 'week02'
)
UPDATE user_chapter_progress next_progress
SET status = 'UNLOCKED'
FROM next_chapter
WHERE next_progress.chapter_id = next_chapter.id
  AND next_progress.status = 'LOCKED'
  AND EXISTS (
      SELECT 1
      FROM user_chapter_progress previous_progress
      JOIN previous_chapter
          ON previous_chapter.id = previous_progress.chapter_id
      WHERE previous_progress.user_id = next_progress.user_id
        AND previous_progress.status = 'COMPLETED'
  );

COMMIT;
