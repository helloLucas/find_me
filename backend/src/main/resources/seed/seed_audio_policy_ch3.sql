BEGIN;

-- 1) CH3 scene_bgm update
-- keep CH3_FRIEND_CALL unchanged
UPDATE public.story_nodes n
SET output_bundle = jsonb_set(
  n.output_bundle,
  '{scene,bgm}',
  to_jsonb('rain-and-little-storm-v1.mp3'::text),
  true
)
FROM public.chapters c
WHERE c.id = n.chapter_id
  AND c.code = 'week03'
  AND n.code LIKE 'CH3_%'
  AND n.code <> 'CH3_FRIEND_CALL';

-- 2) CH3 effects.playSound update
-- exclude CH3_FRIEND_CALL and FAIL nodes
UPDATE public.story_nodes n
SET output_bundle = jsonb_set(
  n.output_bundle,
  '{effects,playSound}',
  to_jsonb('notification_lucas_v1.mp3'::text),
  true
)
FROM public.chapters c
WHERE c.id = n.chapter_id
  AND c.code = 'week03'
  AND n.code LIKE 'CH3_%'
  AND n.code <> 'CH3_FRIEND_CALL'
  AND n.code NOT LIKE '%FAIL%';

COMMIT;
