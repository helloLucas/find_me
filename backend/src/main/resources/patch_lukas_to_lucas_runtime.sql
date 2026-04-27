-- Runtime patch: rename lukas variants in already-seeded DB data.
-- Mapping policy:
--   lukas -> lucas
--   Lukas -> Lucas
--   LUKAS -> Lukas
--
-- Note:
--   Use a temporary token so LUKAS does not become Lucas by chained replaces.

BEGIN;

-- 1) story_nodes.output_bundle (jsonb)
UPDATE story_nodes
SET output_bundle = (
  replace(
    replace(
      replace(
        replace(output_bundle::text, 'LUKAS', '__TMP_LUKAS_CASE__'),
        'Lukas', 'Lucas'
      ),
      'lukas', 'lucas'
    ),
    '__TMP_LUKAS_CASE__', 'Lukas'
  )
)::jsonb
WHERE output_bundle::text LIKE '%lukas%'
   OR output_bundle::text LIKE '%Lukas%'
   OR output_bundle::text LIKE '%LUKAS%';

-- 2) story_transitions.expected_input (text)
UPDATE story_transitions
SET expected_input = replace(
  replace(
    replace(
      replace(expected_input, 'LUKAS', '__TMP_LUKAS_CASE__'),
      'Lukas', 'Lucas'
    ),
    'lukas', 'lucas'
  ),
  '__TMP_LUKAS_CASE__', 'Lukas'
)
WHERE expected_input IS NOT NULL
  AND (
    expected_input LIKE '%lukas%'
    OR expected_input LIKE '%Lukas%'
    OR expected_input LIKE '%LUKAS%'
  );

-- 3) story_transitions.validator_config (jsonb)
UPDATE story_transitions
SET validator_config = (
  replace(
    replace(
      replace(
        replace(validator_config::text, 'LUKAS', '__TMP_LUKAS_CASE__'),
        'Lukas', 'Lucas'
      ),
      'lukas', 'lucas'
    ),
    '__TMP_LUKAS_CASE__', 'Lukas'
  )
)::jsonb
WHERE validator_config IS NOT NULL
  AND (
    validator_config::text LIKE '%lukas%'
    OR validator_config::text LIKE '%Lukas%'
    OR validator_config::text LIKE '%LUKAS%'
  );

-- 4) story_transitions.effect_bundle (jsonb)
UPDATE story_transitions
SET effect_bundle = (
  replace(
    replace(
      replace(
        replace(effect_bundle::text, 'LUKAS', '__TMP_LUKAS_CASE__'),
        'Lukas', 'Lucas'
      ),
      'lukas', 'lucas'
    ),
    '__TMP_LUKAS_CASE__', 'Lukas'
  )
)::jsonb
WHERE effect_bundle IS NOT NULL
  AND (
    effect_bundle::text LIKE '%lukas%'
    OR effect_bundle::text LIKE '%Lukas%'
    OR effect_bundle::text LIKE '%LUKAS%'
  );

-- 5) save_slots.snapshot_json (jsonb) - runtime snapshot data
UPDATE save_slots
SET snapshot_json = (
  replace(
    replace(
      replace(
        replace(snapshot_json::text, 'LUKAS', '__TMP_LUKAS_CASE__'),
        'Lukas', 'Lucas'
      ),
      'lukas', 'lucas'
    ),
    '__TMP_LUKAS_CASE__', 'Lukas'
  )
)::jsonb
WHERE snapshot_json::text LIKE '%lukas%'
   OR snapshot_json::text LIKE '%Lukas%'
   OR snapshot_json::text LIKE '%LUKAS%';

-- 6) user_story_progress.latest_snapshot_json (jsonb) - runtime snapshot data
UPDATE user_story_progress
SET latest_snapshot_json = (
  replace(
    replace(
      replace(
        replace(latest_snapshot_json::text, 'LUKAS', '__TMP_LUKAS_CASE__'),
        'Lukas', 'Lucas'
      ),
      'lukas', 'lucas'
    ),
    '__TMP_LUKAS_CASE__', 'Lukas'
  )
)::jsonb
WHERE latest_snapshot_json::text LIKE '%lukas%'
   OR latest_snapshot_json::text LIKE '%Lukas%'
   OR latest_snapshot_json::text LIKE '%LUKAS%';

COMMIT;
