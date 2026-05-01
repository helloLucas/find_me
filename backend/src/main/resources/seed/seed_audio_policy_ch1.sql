-- 용도: Chapter 1의 오디오/BGM 및 output_bundle 정책을 보정하는 데이터 패치 스크립트.
-- 범위: BGM, preVideo, node/transition 효과음(alias -> 파일명) 보정.

ROLLBACK;

BEGIN;

-- 1) Unify CH1 BGM
UPDATE story_nodes
SET output_bundle = jsonb_set(
  output_bundle,
  '{scene,bgm}',
  to_jsonb('rain-and-little-storm-v1.mp3'::text),
  true
)
WHERE code LIKE 'CH1_%';

-- 2) Ensure epilogue pre-video exists on CH1_COMPLETE
UPDATE story_nodes
SET output_bundle = jsonb_set(
  output_bundle,
  '{scene,preVideo}',
  to_jsonb('ch01_epilogue/ch01_epilogue.m3u8'::text),
  true
)
WHERE code = 'CH1_COMPLETE';

-- 3) Normalize node playSound aliases -> concrete filenames
UPDATE story_nodes
SET output_bundle = jsonb_set(
  output_bundle,
  '{effects,playSound}',
  to_jsonb(
    CASE output_bundle #>> '{effects,playSound}'
      WHEN 'audio_distortion_short' THEN 'electric-noise-v1.mp3'
      WHEN 'warning_alarm'          THEN 'rain-lightning-storm-v1.mp3'
      WHEN 'warning_short'          THEN 'notification_v1.mp3'
    END::text
  ),
  true
)
WHERE output_bundle #>> '{effects,playSound}' IN (
  'audio_distortion_short', 'warning_alarm', 'warning_short'
);

-- 4) Click-point node SFX (2,3,7,8)
UPDATE story_nodes
SET output_bundle = jsonb_set(
  output_bundle,
  '{effects,playSound}',
  to_jsonb('mouse_click_v1.mp3'::text),
  true
)
WHERE code IN (
  'CH1_FRIEND_CHAT_OPEN',
  'CH1_NEWS_PORTAL',
  'CH1_DEVTOOLS_FRAME',
  'CH1_NETWORK_TAB'
);

-- 5) Remove node-entry playSound for specific nodes
UPDATE story_nodes
SET output_bundle = output_bundle #- '{effects,playSound}'
WHERE code IN (
  'CH1_FRIEND_CHAT_PUSH',
  'CH1_DEVTOOLS_CUE',
  'CH1_TERMINAL_SSH_READY',
  'CH1_SSH_AUTH_PROMPT',
  'CH1_SSH_CONNECTED',
  'CH1_COMPLETE',
  'CH1_FAIL_UNRELATED',
  'CH1_FAIL_DANGEROUS',
  'CH1_FAIL_SKIP'
);

-- 6) Normalize transition playSound aliases -> concrete filenames
UPDATE story_transitions
SET effect_bundle = jsonb_set(
  effect_bundle,
  '{playSound}',
  to_jsonb(
    CASE effect_bundle ->> 'playSound'
      WHEN 'audio_distortion_short' THEN 'electric-noise-v1.mp3'
      WHEN 'warning_alarm'          THEN 'rain-lightning-storm-v1.mp3'
      WHEN 'warning_short'          THEN 'notification_v1.mp3'
    END::text
  ),
  true
)
WHERE effect_bundle ->> 'playSound' IN (
  'audio_distortion_short', 'warning_alarm', 'warning_short'
);

COMMIT;
