-- 용도: Chapter 1 네트워크 탭 더미 데이터(30건) 및 패널 상태를 보정하는 데이터 패치 스크립트.
-- 범위: CH1_NETWORK_TAB 및 상세 노드의 networkPanel/networkRequests 갱신.

ROLLBACK;

BEGIN;

-- 7) Expand CH1 network list to 30 items.
-- Keep req_029 normal, make req_030 the major clue, keep req_037 as the only 200 OK near bottom.

UPDATE story_nodes
SET output_bundle = jsonb_set(
  jsonb_set(
    output_bundle,
    '{content,networkPanel}',
    $$
    {
      "visibleRange": [29, 58],
      "statusSummary": { "200": 1, "404": 52, "500": 4, "pending": 1 },
      "totalRequests": 58,
      "currentScrollIndex": 29
    }
    $$::jsonb,
    true
  ),
  '{content,networkRequests}',
  $$
  [
    { "id": "req_029", "name": "track.js", "size": "0.4 KB", "domain": "cdn.nexus-news.net", "method": "GET", "status": 404, "timeMs": 23 },
    { "id": "req_030", "name": "africa-population-gap.log", "size": "0.2 KB", "domain": "census.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 41 },
    { "id": "req_031", "name": "ads.js", "size": "0.5 KB", "domain": "static.nexus-news.net", "method": "GET", "status": 404, "timeMs": 18 },
    { "id": "req_032", "name": "impression.log", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 37 },
    { "id": "req_033", "name": "stat.gif", "size": "0.1 KB", "domain": "cdn.nexus-news.net", "method": "GET", "status": 404, "timeMs": 29 },
    { "id": "req_034", "name": "user-cache.json", "size": "0.8 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 404, "timeMs": 64 },
    { "id": "req_035", "name": "session-trace.map", "size": "0.6 KB", "domain": "edge.nexus-news.net", "method": "GET", "status": 404, "timeMs": 57 },
    { "id": "req_036", "name": "render-state.bin", "size": "1.1 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 404, "timeMs": 92 },
    { "id": "req_038", "name": "prefetch-manifest.json", "size": "0.7 KB", "domain": "static.nexus-news.net", "method": "GET", "status": 404, "timeMs": 21 },
    { "id": "req_039", "name": "banner-slot.js", "size": "0.5 KB", "domain": "ads.nexus-news.net", "method": "GET", "status": 404, "timeMs": 33 },
    { "id": "req_040", "name": "tracking-seed.txt", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 47 },

    { "id": "req_041", "name": "antarctica-edge-mask.map", "size": "1.6 KB", "domain": "map.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 72 },
    { "id": "req_042", "name": "atlantic-tiles.mesh", "size": "1.2 KB", "domain": "render.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 76 },
    { "id": "req_043", "name": "observer-count.gc.tmp", "size": "0.3 KB", "domain": "telemetry.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 109 },
    { "id": "req_044", "name": "india-density-delta.json", "size": "0.9 KB", "domain": "census.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 61 },
    { "id": "req_045", "name": "city-block-7.delta", "size": "1.0 KB", "domain": "stream.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 83 },
    { "id": "req_046", "name": "render-cycle.seed", "size": "0.4 KB", "domain": "time.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 58 },
    { "id": "req_047", "name": "crowd-sim-eviction.bin", "size": "1.4 KB", "domain": "sim.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 122 },
    { "id": "req_048", "name": "brazil-weather-cell-r17.dat", "size": "0.8 KB", "domain": "climate.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 69 },
    { "id": "req_049", "name": "coastline-lod3.mesh", "size": "1.1 KB", "domain": "render.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 95 },
    { "id": "req_050", "name": "memory-prune.report", "size": "0.5 KB", "domain": "gc.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 117 },
    { "id": "req_051", "name": "sector-lookup.idx", "size": "0.6 KB", "domain": "atlas.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 66 },
    { "id": "req_052", "name": "observer-latency.log", "size": "0.4 KB", "domain": "telemetry.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 89 },
    { "id": "req_053", "name": "visibility-shadow-probe.pack", "size": "0.9 KB", "domain": "light.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 74 },
    { "id": "req_054", "name": "census-sync.delta", "size": "0.7 KB", "domain": "census.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 63 },
    { "id": "req_055", "name": "desert-lod2.mesh", "size": "1.2 KB", "domain": "render.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 93 },
    { "id": "req_056", "name": "session-reconcile.trace", "size": "0.6 KB", "domain": "edge.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 126 },
    { "id": "req_057", "name": "kenya-region-a17.prefab", "size": "1.0 KB", "domain": "stream.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 87 },
    { "id": "req_058", "name": "gc-cycle.tick", "size": "0.3 KB", "domain": "gc.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 71 },

    { "id": "req_037", "name": "core_anchor", "path": "/api/laplace/core_anchor", "size": "1.9 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 200, "timeMs": 187 }
  ]
  $$::jsonb,
  true
)
WHERE code = 'CH1_NETWORK_TAB';

-- Same 30-item list for selected/detail nodes, with req_037 selected=true
UPDATE story_nodes
SET output_bundle = jsonb_set(
  jsonb_set(
    output_bundle,
    '{content,networkPanel}',
    $$
    {
      "visibleRange": [29, 58],
      "statusSummary": { "200": 1, "404": 52, "500": 4, "pending": 1 },
      "totalRequests": 58,
      "currentScrollIndex": 29
    }
    $$::jsonb,
    true
  ),
  '{content,networkRequests}',
  $$
  [
    { "id": "req_029", "name": "track.js", "size": "0.4 KB", "domain": "cdn.nexus-news.net", "method": "GET", "status": 404, "timeMs": 23 },
    { "id": "req_030", "name": "africa-population-gap.log", "size": "0.2 KB", "domain": "census.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 41 },
    { "id": "req_031", "name": "ads.js", "size": "0.5 KB", "domain": "static.nexus-news.net", "method": "GET", "status": 404, "timeMs": 18 },
    { "id": "req_032", "name": "impression.log", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 37 },
    { "id": "req_033", "name": "stat.gif", "size": "0.1 KB", "domain": "cdn.nexus-news.net", "method": "GET", "status": 404, "timeMs": 29 },
    { "id": "req_034", "name": "user-cache.json", "size": "0.8 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 404, "timeMs": 64 },
    { "id": "req_035", "name": "session-trace.map", "size": "0.6 KB", "domain": "edge.nexus-news.net", "method": "GET", "status": 404, "timeMs": 57 },
    { "id": "req_036", "name": "render-state.bin", "size": "1.1 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 404, "timeMs": 92 },
    { "id": "req_038", "name": "prefetch-manifest.json", "size": "0.7 KB", "domain": "static.nexus-news.net", "method": "GET", "status": 404, "timeMs": 21 },
    { "id": "req_039", "name": "banner-slot.js", "size": "0.5 KB", "domain": "ads.nexus-news.net", "method": "GET", "status": 404, "timeMs": 33 },
    { "id": "req_040", "name": "tracking-seed.txt", "size": "0.2 KB", "domain": "metrics.nexus-news.net", "method": "GET", "status": 404, "timeMs": 47 },

    { "id": "req_041", "name": "antarctica-edge-mask.map", "size": "1.6 KB", "domain": "map.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 72 },
    { "id": "req_042", "name": "atlantic-tiles.mesh", "size": "1.2 KB", "domain": "render.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 76 },
    { "id": "req_043", "name": "observer-count.gc.tmp", "size": "0.3 KB", "domain": "telemetry.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 109 },
    { "id": "req_044", "name": "india-density-delta.json", "size": "0.9 KB", "domain": "census.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 61 },
    { "id": "req_045", "name": "city-block-7.delta", "size": "1.0 KB", "domain": "stream.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 83 },
    { "id": "req_046", "name": "render-cycle.seed", "size": "0.4 KB", "domain": "time.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 58 },
    { "id": "req_047", "name": "crowd-sim-eviction.bin", "size": "1.4 KB", "domain": "sim.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 122 },
    { "id": "req_048", "name": "brazil-weather-cell-r17.dat", "size": "0.8 KB", "domain": "climate.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 69 },
    { "id": "req_049", "name": "coastline-lod3.mesh", "size": "1.1 KB", "domain": "render.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 95 },
    { "id": "req_050", "name": "memory-prune.report", "size": "0.5 KB", "domain": "gc.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 117 },
    { "id": "req_051", "name": "sector-lookup.idx", "size": "0.6 KB", "domain": "atlas.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 66 },
    { "id": "req_052", "name": "observer-latency.log", "size": "0.4 KB", "domain": "telemetry.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 89 },
    { "id": "req_053", "name": "visibility-shadow-probe.pack", "size": "0.9 KB", "domain": "light.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 74 },
    { "id": "req_054", "name": "census-sync.delta", "size": "0.7 KB", "domain": "census.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 63 },
    { "id": "req_055", "name": "desert-lod2.mesh", "size": "1.2 KB", "domain": "render.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 93 },
    { "id": "req_056", "name": "session-reconcile.trace", "size": "0.6 KB", "domain": "edge.nexus-grid.net", "method": "GET", "status": 500, "timeMs": 126 },
    { "id": "req_057", "name": "kenya-region-a17.prefab", "size": "1.0 KB", "domain": "stream.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 87 },
    { "id": "req_058", "name": "gc-cycle.tick", "size": "0.3 KB", "domain": "gc.nexus-grid.net", "method": "GET", "status": 404, "timeMs": 71 },

    { "id": "req_037", "name": "core_anchor", "path": "/api/laplace/core_anchor", "size": "1.9 KB", "domain": "api.nexus-news.net", "method": "GET", "status": 200, "timeMs": 187, "selected": true }
  ]
  $$::jsonb,
  true
)
WHERE code IN ('CH1_SUCCESS_REQUEST_SELECTED', 'CH1_PACKET_HEADERS_RESPONSE');

COMMIT;
