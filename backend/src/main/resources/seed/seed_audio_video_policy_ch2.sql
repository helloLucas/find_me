-- Chapter 2 audio/video policy overrides.
-- Run after seed_nodes_chapter2.sql.

BEGIN;

WITH gc_scan_alert AS (
    SELECT id
    FROM story_nodes
    WHERE code = 'CH2_GC_SCAN_ALERT'
),
chapter2_bgm_targets AS (
    SELECT
        story_nodes.id,
        CASE
            WHEN story_nodes.id >= gc_scan_alert.id THEN 'gc_bgm.mp3'
            ELSE 'rain-and-little-storm-v1.mp3'
        END AS bgm
    FROM story_nodes
    JOIN chapters ON chapters.id = story_nodes.chapter_id
    CROSS JOIN gc_scan_alert
    WHERE chapters.code = 'week02'
      AND story_nodes.output_bundle #>> '{scene,bgm}' = 'server_hum'
)
UPDATE story_nodes
SET output_bundle = jsonb_set(
        story_nodes.output_bundle,
        '{scene,bgm}',
        to_jsonb(chapter2_bgm_targets.bgm::text),
        true
    ),
    updated_at = NOW()
FROM chapter2_bgm_targets
WHERE story_nodes.id = chapter2_bgm_targets.id;

UPDATE story_nodes
SET output_bundle = jsonb_set(
        output_bundle,
        '{scene,preVideo}',
        to_jsonb('ch02_prologue/ch02_prologue.m3u8'::text),
        true
    ),
    updated_at = NOW()
WHERE code = 'CH2_SERVER_HOME';

UPDATE story_nodes
SET output_bundle = jsonb_set(
        output_bundle,
        '{scene,preVideo}',
        to_jsonb('ch02_epilogue/ch02_epilogue.m3u8'::text),
        true
    ),
    updated_at = NOW()
WHERE code = 'CH2_COMPLETE';

COMMIT;
