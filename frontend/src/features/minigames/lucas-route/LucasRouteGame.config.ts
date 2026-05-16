export type RowKind = "space" | "router" | "city" | "backbone" | "cable" | "edge" | "server";

export type RouteStop = {
  row: number;
  title: string;
  subtitle: string;
  code: string;
};

export type SegmentTuning = {
  width: readonly [number, number];
  speed: readonly [number, number];
  secondCollectorChance: number;
  thirdCollectorChance: number;
  labels: readonly string[];
};

export const LUCAS_ROUTE_GAME_CONFIG = {
  bgmUrl: "https://djbod0nv85jx9.cloudfront.net/audios/minigame_4_v1.mp3",
  logicalWidth: 1000,
  logicalHeight: 760,
  boardX: 86,
  boardY: 58,
  boardWidth: 840,
  visibleRows: 6,
  cols: 8,
  startCol: 3,
  endRow: 86,
  cameraLeadRows: 2,
  cameraLerp: 0.16,
  packetLerp: 0.28,
  perspectiveMinScale: 0.72,
  collisionPadding: 0.3,
  collectorOffscreenTiles: 3.2,
  starCount: 64,
} as const;

export const LUCAS_ROUTE_ASSETS = {
  lucas: "",
  collectors: {
    default: "",
    shark: "",
    fish: "",
  },
  backgrounds: {
    space: "",
    router: "",
    city: "",
    backbone: "",
    cable: "",
    edge: "",
    server: "",
  } satisfies Record<RowKind, string>,
} as const;

export const ROUTE_STOPS: RouteStop[] = [
  {
    row: 0,
    title: "YUSEONG METEOR",
    subtitle: "packet launch point",
    code: "YS",
  },
  {
    row: 16,
    title: "DAEJEON ROUTER",
    subtitle: "local backbone rest lane",
    code: "DJ",
  },
  {
    row: 32,
    title: "KOREA ROUTER",
    subtitle: "national route exchange",
    code: "KR",
  },
  {
    row: 50,
    title: "SUBMARINE CABLE",
    subtitle: "deep packet transit",
    code: "SEA",
  },
  {
    row: 68,
    title: "US ROUTER",
    subtitle: "edge network ingress",
    code: "US",
  },
  {
    row: LUCAS_ROUTE_GAME_CONFIG.endRow,
    title: "NY LUCAS SERVER",
    subtitle: "packet delivery target",
    code: "NY",
  },
];

export const SEGMENT_TUNING: SegmentTuning[] = [
  {
    width: [0.95, 1.34],
    speed: [0.92, 1.65],
    secondCollectorChance: 0.14,
    thirdCollectorChance: 0,
    labels: ["GC", "SWEEP"],
  },
  {
    width: [0.92, 1.5],
    speed: [0.82, 2.24],
    secondCollectorChance: 0.22,
    thirdCollectorChance: 0.02,
    labels: ["GC", "CACHE", "TTL"],
  },
  {
    width: [0.98, 1.7],
    speed: [1.02, 2.76],
    secondCollectorChance: 0.28,
    thirdCollectorChance: 0.05,
    labels: ["GC", "SWEEP", "DROP"],
  },
  {
    width: [0.92, 1.62],
    speed: [1.18, 3.28],
    secondCollectorChance: 0.34,
    thirdCollectorChance: 0.09,
    labels: ["SHARK", "FISH", "GC", "DROP"],
  },
  {
    width: [0.9, 1.62],
    speed: [1.08, 3.02],
    secondCollectorChance: 0.31,
    thirdCollectorChance: 0.07,
    labels: ["GC", "PURGE", "DROP"],
  },
];
