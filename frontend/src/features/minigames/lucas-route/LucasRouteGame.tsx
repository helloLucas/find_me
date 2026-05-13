import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LUCAS_ROUTE_ASSETS,
  LUCAS_ROUTE_GAME_CONFIG,
  ROUTE_STOPS,
  SEGMENT_TUNING,
  type RouteStop,
  type RowKind,
} from "./LucasRouteGame.config";
import "./LucasRouteGame.css";

type GameStatus = "idle" | "running" | "lost" | "complete";

type CollectorObstacle = {
  start: number;
  width: number;
  speed: number;
  direction: -1 | 1;
  label: string;
};

type LaneObstacle = {
  collectors: CollectorObstacle[];
};

type RouteRow = {
  row: number;
  kind: RowKind;
  title: string;
  safe: boolean;
  obstacle?: LaneObstacle;
};

type Packet = {
  col: number;
  row: number;
};

type GameState = {
  status: GameStatus;
  seed: number;
  rows: RouteRow[];
  packet: Packet;
  attempts: number;
  bestRow: number;
  startedAt: number;
  elapsedMs: number;
  message: string;
  lossReason: string;
  lostAt: number;
  lostPacket: Packet | null;
};

type RenderState = {
  visualPacket: Packet;
  cameraRow: number;
  lastNow: number;
};

type HudState = {
  status: GameStatus;
  attempts: number;
  bestRow: number;
  currentRow: number;
  currentStop: RouteStop;
  nextStop: RouteStop;
  message: string;
  lossReason: string;
  elapsedMs: number;
  seed: number;
};

type CollectorSpriteKey = keyof typeof LUCAS_ROUTE_ASSETS.collectors;

type LoadedRouteAssets = {
  lucas?: HTMLImageElement;
  collectors: Partial<Record<CollectorSpriteKey, HTMLImageElement>>;
  backgrounds: Partial<Record<RowKind, HTMLImageElement>>;
};

const EMPTY_ROUTE_ASSETS: LoadedRouteAssets = {
  collectors: {},
  backgrounds: {},
};

const LOGICAL_WIDTH = LUCAS_ROUTE_GAME_CONFIG.logicalWidth;
const LOGICAL_HEIGHT = LUCAS_ROUTE_GAME_CONFIG.logicalHeight;
const BOARD_X = LUCAS_ROUTE_GAME_CONFIG.boardX;
const BOARD_Y = LUCAS_ROUTE_GAME_CONFIG.boardY;
const BOARD_WIDTH = LUCAS_ROUTE_GAME_CONFIG.boardWidth;
const VISIBLE_ROWS = LUCAS_ROUTE_GAME_CONFIG.visibleRows;
const COLS = LUCAS_ROUTE_GAME_CONFIG.cols;
const TILE = BOARD_WIDTH / COLS;
const BOARD_HEIGHT = TILE * VISIBLE_ROWS;
const START_COL = LUCAS_ROUTE_GAME_CONFIG.startCol;
const END_ROW = LUCAS_ROUTE_GAME_CONFIG.endRow;

const STATUS_LABEL: Record<GameStatus, string> = {
  idle: "WAITING",
  running: "IN TRANSIT",
  lost: "PACKET LOST",
  complete: "DELIVERED",
};

function createSeed() {
  return Math.floor(Math.random() * 999_999) + 1;
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function mod(value: number, size: number) {
  return ((value % size) + size) % size;
}

function randomBetween(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isRestRow(row: number) {
  return ROUTE_STOPS.some((stop) => Math.abs(stop.row - row) <= 1);
}

function getStopForRow(row: number) {
  let current = ROUTE_STOPS[0];
  for (const stop of ROUTE_STOPS) {
    if (row >= stop.row) current = stop;
  }
  return current;
}

function getNextStopForRow(row: number) {
  return ROUTE_STOPS.find((stop) => stop.row > row) ?? ROUTE_STOPS[ROUTE_STOPS.length - 1];
}

function getExactStop(row: number) {
  return ROUTE_STOPS.find((stop) => stop.row === row);
}

function getSegmentIndex(row: number) {
  for (let index = ROUTE_STOPS.length - 1; index >= 0; index -= 1) {
    if (row >= ROUTE_STOPS[index].row) return index;
  }
  return 0;
}

function getKindForRow(row: number): RowKind {
  const exactStop = getExactStop(row);
  if (exactStop?.row === END_ROW) return "server";
  if (exactStop) return row === 0 ? "space" : "router";
  const segmentIndex = getSegmentIndex(row);
  if (segmentIndex === 0) return "city";
  if (segmentIndex === 1) return "backbone";
  if (segmentIndex === 2) return "backbone";
  if (segmentIndex === 3) return "cable";
  if (segmentIndex === 4) return "edge";
  return "edge";
}

function createRows(seed: number): RouteRow[] {
  const random = mulberry32(seed);

  return Array.from({ length: END_ROW + 1 }, (_, row) => {
    const exactStop = getExactStop(row);
    const safe = row === 0 || row === END_ROW || isRestRow(row);
    const kind = getKindForRow(row);
    const title = exactStop?.title ?? getStopForRow(row).code;

    if (safe) {
      return {
        row,
        kind,
        title,
        safe: true,
      };
    }

    const segment = Math.min(getSegmentIndex(row), SEGMENT_TUNING.length - 1);
    const tuning = SEGMENT_TUNING[segment];
    const collectorCount =
      1 + (random() < tuning.secondCollectorChance ? 1 : 0) + (random() < tuning.thirdCollectorChance ? 1 : 0);
    const direction: -1 | 1 = random() > 0.5 ? 1 : -1;
    const trackWidth = COLS + LUCAS_ROUTE_GAME_CONFIG.collectorOffscreenTiles * 2;
    const collectors = Array.from({ length: collectorCount }, (_, index) => ({
      start: (trackWidth / collectorCount) * index + randomBetween(random, 0.4, 2.4),
      width: randomBetween(random, tuning.width[0], tuning.width[1]),
      speed: randomBetween(random, tuning.speed[0], tuning.speed[1]),
      direction,
      label: tuning.labels[Math.floor(random() * tuning.labels.length)],
    }));

    return {
      row,
      kind,
      title,
      safe: false,
      obstacle: { collectors },
    };
  });
}

function createInitialGame(seed = createSeed(), attempts = 0, bestRow = 0): GameState {
  return {
    status: "idle",
    seed,
    rows: createRows(seed),
    packet: { col: START_COL, row: 0 },
    attempts,
    bestRow,
    startedAt: performance.now(),
    elapsedMs: 0,
    message: "Press any move key to send Lucas from Yuseong.",
    lossReason: "",
    lostAt: 0,
    lostPacket: null,
  };
}

function createHud(game: GameState): HudState {
  return {
    status: game.status,
    attempts: game.attempts,
    bestRow: game.bestRow,
    currentRow: game.packet.row,
    currentStop: getStopForRow(game.packet.row),
    nextStop: getNextStopForRow(game.packet.row),
    message: game.message,
    lossReason: game.lossReason,
    elapsedMs: game.elapsedMs,
    seed: game.seed,
  };
}

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadConfiguredAssets() {
  const assets: LoadedRouteAssets = {
    collectors: {},
    backgrounds: {},
  };

  if (LUCAS_ROUTE_ASSETS.lucas) {
    assets.lucas = await loadImage(LUCAS_ROUTE_ASSETS.lucas);
  }

  await Promise.all(
    (Object.entries(LUCAS_ROUTE_ASSETS.collectors) as Array<[CollectorSpriteKey, string]>)
      .filter(([, src]) => Boolean(src))
      .map(async ([key, src]) => {
        assets.collectors[key] = await loadImage(src);
      }),
  );

  await Promise.all(
    (Object.entries(LUCAS_ROUTE_ASSETS.backgrounds) as Array<[RowKind, string]>)
      .filter(([, src]) => Boolean(src))
      .map(async ([key, src]) => {
        assets.backgrounds[key] = await loadImage(src);
      }),
  );

  return assets;
}

function getCollectorX(collector: CollectorObstacle, timeSeconds: number) {
  const offscreen = LUCAS_ROUTE_GAME_CONFIG.collectorOffscreenTiles + collector.width;
  const cycle = COLS + offscreen * 2;
  return mod(collector.start + timeSeconds * collector.speed * collector.direction + offscreen, cycle) - offscreen;
}

function collidesWithLane(row: RouteRow, col: number, timeSeconds: number) {
  if (!row.obstacle) return false;
  const packetLeft = col + LUCAS_ROUTE_GAME_CONFIG.collisionPadding;
  const packetRight = col + 1 - LUCAS_ROUTE_GAME_CONFIG.collisionPadding;

  return row.obstacle.collectors.some((collector) => {
    const obstacleLeft = getCollectorX(collector, timeSeconds);
    const obstacleRight = obstacleLeft + collector.width;
    return packetRight > obstacleLeft && packetLeft < obstacleRight;
  });
}

function getCameraStart(row: number) {
  return Math.max(0, Math.min(END_ROW - VISIBLE_ROWS + 1, row - LUCAS_ROUTE_GAME_CONFIG.cameraLeadRows));
}

function rowToY(row: number, cameraStart: number) {
  return BOARD_Y + (VISIBLE_ROWS - 1 - (row - cameraStart)) * TILE;
}

function getPerspectiveAtY(y: number) {
  const depth = clamp((y - BOARD_Y) / BOARD_HEIGHT, 0, 1);
  const scale = LUCAS_ROUTE_GAME_CONFIG.perspectiveMinScale + depth * (1 - LUCAS_ROUTE_GAME_CONFIG.perspectiveMinScale);
  const width = BOARD_WIDTH * scale;
  const left = BOARD_X + (BOARD_WIDTH - width) / 2;
  return {
    depth,
    scale,
    left,
    width,
    tile: width / COLS,
  };
}

function getRowProjection(y: number) {
  const top = getPerspectiveAtY(y);
  const middle = getPerspectiveAtY(y + TILE / 2);
  const bottom = getPerspectiveAtY(y + TILE);
  return { top, middle, bottom };
}

function colToX(col: number, y: number) {
  const { middle } = getRowProjection(y);
  return middle.left + col * middle.tile;
}

function fillProjectedRow(context: CanvasRenderingContext2D, y: number, color: string) {
  const { top, bottom } = getRowProjection(y);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(top.left, y);
  context.lineTo(top.left + top.width, y);
  context.lineTo(bottom.left + bottom.width, y + TILE);
  context.lineTo(bottom.left, y + TILE);
  context.closePath();
  context.fill();
}

function strokeProjectedRow(context: CanvasRenderingContext2D, y: number, color: string, lineWidth = 1) {
  const { top, bottom } = getRowProjection(y);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(top.left, y);
  context.lineTo(top.left + top.width, y);
  context.lineTo(bottom.left + bottom.width, y + TILE);
  context.lineTo(bottom.left, y + TILE);
  context.closePath();
  context.stroke();
}

function clipProjectedRow(context: CanvasRenderingContext2D, y: number) {
  const { top, bottom } = getRowProjection(y);
  context.beginPath();
  context.moveTo(top.left, y);
  context.lineTo(top.left + top.width, y);
  context.lineTo(bottom.left + bottom.width, y + TILE);
  context.lineTo(bottom.left, y + TILE);
  context.closePath();
  context.clip();
}

function withCanvasScale(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.setTransform(width / LOGICAL_WIDTH, 0, 0, height / LOGICAL_HEIGHT, 0, 0);
}

function drawPixelText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = "#dff9ff",
  align: CanvasTextAlign = "left",
) {
  context.save();
  context.font = `${size}px "JetBrains Mono", "Courier New", monospace`;
  context.textAlign = align;
  context.textBaseline = "top";
  context.fillStyle = color;
  context.fillText(text, x, y);
  context.restore();
}

function drawLucas(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  timeSeconds: number,
  assets: LoadedRouteAssets,
) {
  if (assets.lucas) {
    context.drawImage(assets.lucas, x, y, size, size);
    return;
  }

  const bounce = Math.sin(timeSeconds * 8) * 1.2;
  const unit = size / 10;
  const px = Math.round(x + size * 0.12);
  const py = Math.round(y + size * 0.1 + bounce);

  context.save();
  context.imageSmoothingEnabled = false;

  context.fillStyle = "#5f3b25";
  context.fillRect(px + unit * 1, py + unit * 3, unit * 2, unit * 3);
  context.fillRect(px + unit * 7, py + unit * 3, unit * 2, unit * 3);

  context.fillStyle = "#f2c37b";
  context.fillRect(px + unit * 2, py + unit * 2, unit * 6, unit * 5);
  context.fillRect(px + unit * 3, py + unit * 7, unit * 4, unit * 1.6);

  context.fillStyle = "#f6d99f";
  context.fillRect(px + unit * 3, py + unit * 4, unit * 4, unit * 2.4);

  context.fillStyle = "#20140f";
  context.fillRect(px + unit * 3.2, py + unit * 3.4, unit * 1, unit * 1);
  context.fillRect(px + unit * 5.8, py + unit * 3.4, unit * 1, unit * 1);
  context.fillRect(px + unit * 4.55, py + unit * 5.15, unit * 1, unit * 0.8);

  context.fillStyle = "#45ffe0";
  context.fillRect(px + unit * 2.5, py + unit * 8.3, unit * 5, unit * 0.8);
  context.fillStyle = "#071516";
  context.fillRect(px + unit * 4.2, py + unit * 8.3, unit * 1.6, unit * 0.8);

  context.restore();
}

function drawPacketBurst(context: CanvasRenderingContext2D, x: number, y: number, size: number, ageSeconds: number) {
  context.save();
  context.imageSmoothingEnabled = false;
  const alpha = Math.max(0, 1 - ageSeconds * 1.2);
  const pieces = 18;
  for (let index = 0; index < pieces; index += 1) {
    const angle = (Math.PI * 2 * index) / pieces;
    const radius = ageSeconds * 58 + (index % 3) * 4;
    const px = x + size / 2 + Math.cos(angle) * radius;
    const py = y + size / 2 + Math.sin(angle) * radius;
    context.fillStyle = index % 2 === 0 ? `rgba(69, 255, 224, ${alpha})` : `rgba(255, 87, 111, ${alpha})`;
    context.fillRect(px, py, 5, 5);
  }
  context.restore();
}

function drawRowBackground(context: CanvasRenderingContext2D, row: RouteRow, y: number, assets: LoadedRouteAssets) {
  const palettes: Record<RowKind, { base: string; line: string }> = {
    space: { base: "#13191d", line: "#56616a" },
    router: { base: "#173c36", line: "#6df7bb" },
    city: { base: "#20242b", line: "#494f58" },
    backbone: { base: "#182e35", line: "#4bb6c9" },
    cable: { base: "#10233d", line: "#3f8dff" },
    edge: { base: "#271d2a", line: "#ff5777" },
    server: { base: "#2e3519", line: "#e7f778" },
  };
  const palette = palettes[row.kind];
  const projection = getRowProjection(y);

  fillProjectedRow(context, y, palette.base);

  const background = assets.backgrounds[row.kind];
  if (background) {
    context.save();
    context.globalAlpha = row.safe ? 0.62 : 0.48;
    clipProjectedRow(context, y);
    context.drawImage(background, projection.middle.left, y, projection.middle.width, TILE);
    context.restore();
  }

  context.save();
  clipProjectedRow(context, y);
  context.fillStyle = palette.line;
  context.globalAlpha = row.safe ? 0.38 : 0.18;
  for (let x = projection.middle.left + 8; x < projection.middle.left + projection.middle.width; x += 24) {
    context.fillRect(x, y + TILE - 4, 14, 2);
  }
  context.globalAlpha = 1;

  if (row.safe) {
    context.fillStyle = "rgba(109, 247, 187, 0.12)";
    context.fillRect(projection.middle.left, y + 4, projection.middle.width, TILE - 8);
  }

  if (row.kind === "cable") {
    context.strokeStyle = "rgba(155, 211, 255, 0.22)";
    context.lineWidth = 2;
    for (let wave = 0; wave < 3; wave += 1) {
      const waveY = y + TILE * (0.24 + wave * 0.22);
      context.beginPath();
      for (let x = projection.middle.left; x <= projection.middle.left + projection.middle.width; x += 18) {
        const offset = Math.sin((x + row.row * 19) / 38) * 5;
        if (x === projection.middle.left) context.moveTo(x, waveY + offset);
        else context.lineTo(x, waveY + offset);
      }
      context.stroke();
    }
  }
  context.restore();
}

function drawCableCollector(
  context: CanvasRenderingContext2D,
  collector: CollectorObstacle,
  x: number,
  y: number,
  width: number,
  assets: LoadedRouteAssets,
) {
  const isShark = collector.label === "SHARK" || width > TILE * 1.35;
  const sprite = assets.collectors[isShark ? "shark" : "fish"] ?? assets.collectors.default;
  if (sprite) {
    context.drawImage(sprite, x, y + TILE * 0.1, width, TILE * 0.8);
    return;
  }

  const bodyColor = isShark ? "#9bd3ff" : "#67f0c7";
  const finColor = isShark ? "#4b87b5" : "#249f92";
  const eyeColor = "#061015";
  const centerY = y + TILE * 0.5;
  const height = isShark ? TILE * 0.42 : TILE * 0.32;
  const noseX = collector.direction > 0 ? x + width : x;
  const tailX = collector.direction > 0 ? x : x + width;
  const bodyStartX = collector.direction > 0 ? x + width * 0.18 : x + width * 0.82;

  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = "rgba(5, 12, 22, 0.72)";
  context.fillRect(x + 4, y + TILE * 0.68, width - 8, 6);

  context.fillStyle = bodyColor;
  context.beginPath();
  context.moveTo(noseX, centerY);
  context.lineTo(bodyStartX, centerY - height / 2);
  context.lineTo(tailX + (collector.direction > 0 ? width * 0.08 : -width * 0.08), centerY);
  context.lineTo(bodyStartX, centerY + height / 2);
  context.closePath();
  context.fill();

  context.fillStyle = finColor;
  context.beginPath();
  context.moveTo(x + width * 0.5, centerY - height * 0.4);
  context.lineTo(x + width * 0.62, centerY - height * 0.95);
  context.lineTo(x + width * 0.7, centerY - height * 0.25);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(tailX, centerY);
  context.lineTo(tailX + (collector.direction > 0 ? -width * 0.18 : width * 0.18), centerY - height * 0.48);
  context.lineTo(tailX + (collector.direction > 0 ? -width * 0.18 : width * 0.18), centerY + height * 0.48);
  context.closePath();
  context.fill();

  context.fillStyle = eyeColor;
  context.fillRect(noseX + (collector.direction > 0 ? -18 : 12), centerY - 8, 5, 5);

  context.fillStyle = isShark ? "#e2f7ff" : "#d2fff5";
  const label = isShark ? "GC SHARK" : "FISH";
  drawPixelText(
    context,
    label,
    x + width / 2,
    y + TILE * 0.73,
    isShark ? 12 : 11,
    isShark ? "#e2f7ff" : "#d2fff5",
    "center",
  );
  context.restore();
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: LaneObstacle,
  row: RouteRow,
  y: number,
  timeSeconds: number,
  assets: LoadedRouteAssets,
) {
  for (const collector of obstacle.collectors) {
    const projection = getRowProjection(y);
    const x = projection.middle.left + getCollectorX(collector, timeSeconds) * projection.middle.tile;
    const width = collector.width * projection.middle.tile;
    if (
      x + width < projection.middle.left - projection.middle.tile * 1.5 ||
      x > projection.middle.left + projection.middle.width + projection.middle.tile * 1.5
    ) {
      continue;
    }

    const isCable = row.kind === "cable";
    if (isCable) {
      drawCableCollector(context, collector, x, y, width, assets);
      continue;
    }

    context.fillStyle = isCable ? "#122647" : "#2b1018";
    context.fillRect(x, y + TILE * 0.16, width, TILE * 0.68);
    context.fillStyle = isCable ? "#48a6ff" : "#ff5777";
    context.fillRect(x, y + TILE * 0.16, width, 5);
    context.fillRect(x, y + TILE * 0.78, width, 5);
    context.fillStyle = isCable ? "#9bd3ff" : "#ffc1ca";
    context.fillRect(x + 10, y + TILE * 0.28, Math.max(14, width - 20), 4);
    context.fillStyle = "#071516";
    context.fillRect(x + 12, y + TILE / 2 - 12, Math.min(width - 24, 72), 24);
    drawPixelText(context, collector.label, x + 18, y + TILE / 2 - 8, 14, isCable ? "#9bd3ff" : "#ffb3c0");
  }
}

function drawRouteMarkers(context: CanvasRenderingContext2D, cameraStart: number) {
  for (const stop of ROUTE_STOPS) {
    const y = rowToY(stop.row, cameraStart);
    if (y < BOARD_Y - TILE || y > BOARD_Y + BOARD_HEIGHT) continue;
    const { middle } = getRowProjection(y);
    context.fillStyle = "rgba(8, 16, 20, 0.72)";
    context.fillRect(middle.left + middle.tile * 0.12, y + TILE * 0.16, middle.width - middle.tile * 0.24, TILE * 0.68);
    strokeProjectedRow(context, y, stop.row === END_ROW ? "#e7f778" : "#6df7bb", 2);
    drawPixelText(context, stop.title, middle.left + middle.width / 2, y + TILE * 0.2, 15, "#eafff9", "center");
    drawPixelText(context, stop.subtitle, middle.left + middle.width / 2, y + TILE * 0.42, 10, "#8ed9d0", "center");
  }
}

function drawGame(
  context: CanvasRenderingContext2D,
  game: GameState,
  render: RenderState,
  now: number,
  assets: LoadedRouteAssets,
) {
  const timeSeconds = (now - game.startedAt) / 1000;
  const cameraStart = getCameraStart(render.cameraRow);

  context.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  const gradient = context.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  gradient.addColorStop(0, "#05090d");
  gradient.addColorStop(0.45, "#0d171a");
  gradient.addColorStop(1, "#1b1014");
  context.fillStyle = gradient;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  for (let i = 0; i < LUCAS_ROUTE_GAME_CONFIG.starCount; i += 1) {
    const x = (i * 97 + Math.sin(timeSeconds * 0.2 + i) * 14) % LOGICAL_WIDTH;
    const y = (i * 53 + timeSeconds * (i % 3)) % LOGICAL_HEIGHT;
    context.fillStyle = i % 4 === 0 ? "rgba(255, 203, 107, 0.45)" : "rgba(69, 255, 224, 0.26)";
    context.fillRect(x, y, 2, 2);
  }

  context.fillStyle = "#06090c";
  context.fillRect(BOARD_X - 22, BOARD_Y - 22, BOARD_WIDTH + 44, BOARD_HEIGHT + 54);
  strokeProjectedRow(context, BOARD_Y - 4, "#45ffe0", 2);
  strokeProjectedRow(context, BOARD_Y + BOARD_HEIGHT - TILE + 4, "rgba(69, 255, 224, 0.42)", 2);

  const firstRow = Math.max(0, Math.floor(cameraStart) - 1);
  const lastRow = Math.min(END_ROW, Math.ceil(cameraStart + VISIBLE_ROWS) + 1);
  for (let rowIndex = lastRow; rowIndex >= firstRow; rowIndex -= 1) {
    const row = game.rows[rowIndex];
    const y = rowToY(rowIndex, cameraStart);
    if (y < BOARD_Y - TILE * 1.25 || y > BOARD_Y + BOARD_HEIGHT + TILE * 0.5) continue;
    drawRowBackground(context, row, y, assets);
    if (row.obstacle) drawObstacle(context, row.obstacle, row, y, timeSeconds, assets);

    context.strokeStyle = "rgba(255, 255, 255, 0.05)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(BOARD_X, y);
    context.lineTo(BOARD_X + BOARD_WIDTH, y);
    context.stroke();
  }

  for (let col = 1; col < COLS; col += 1) {
    context.strokeStyle = "rgba(255, 255, 255, 0.035)";
    context.beginPath();
    const top = getPerspectiveAtY(BOARD_Y);
    const bottom = getPerspectiveAtY(BOARD_Y + BOARD_HEIGHT);
    context.moveTo(top.left + col * top.tile, BOARD_Y);
    context.lineTo(bottom.left + col * bottom.tile, BOARD_Y + BOARD_HEIGHT);
    context.stroke();
  }

  drawRouteMarkers(context, cameraStart);

  const packetY = rowToY(render.visualPacket.row, cameraStart);
  const packetProjection = getRowProjection(packetY);
  const packetSize = Math.min(packetProjection.middle.tile * 0.92, TILE * 0.92);
  const packetVisible = packetY >= BOARD_Y - TILE && packetY < BOARD_Y + BOARD_HEIGHT && game.status !== "lost";
  if (packetVisible) {
    drawLucas(
      context,
      colToX(render.visualPacket.col, packetY) + packetProjection.middle.tile * 0.04,
      packetY + TILE * 0.08,
      packetSize,
      timeSeconds,
      assets,
    );
  }

  if (game.status === "lost" && game.lostPacket) {
    const lostY = rowToY(game.lostPacket.row, cameraStart);
    const lostProjection = getRowProjection(lostY);
    const lostSize = Math.min(lostProjection.middle.tile * 0.92, TILE * 0.92);
    const lostVisible = lostY >= BOARD_Y - TILE && lostY < BOARD_Y + BOARD_HEIGHT;
    if (lostVisible) {
      drawPacketBurst(
        context,
        colToX(game.lostPacket.col, lostY) + lostProjection.middle.tile * 0.04,
        lostY + TILE * 0.08,
        lostSize,
        (now - game.lostAt) / 1000,
      );
    }
  }

  context.fillStyle = "rgba(5, 9, 13, 0.76)";
  context.fillRect(BOARD_X, 14, BOARD_WIDTH, 30);
  drawPixelText(context, STATUS_LABEL[game.status], BOARD_X + 14, 21, 13, game.status === "lost" ? "#ff5777" : "#45ffe0");
  drawPixelText(
    context,
    `${game.packet.row}/${END_ROW} ROWS  |  ${getNextStopForRow(game.packet.row).code} NEXT`,
    BOARD_X + BOARD_WIDTH - 14,
    21,
    13,
    "#dff9ff",
    "right",
  );

  if (game.status === "idle" || game.status === "lost" || game.status === "complete") {
    context.fillStyle = "rgba(4, 7, 9, 0.78)";
    context.fillRect(BOARD_X + 26, BOARD_Y + 184, BOARD_WIDTH - 52, 196);
    context.strokeStyle = game.status === "lost" ? "#ff5777" : "#45ffe0";
    context.lineWidth = 2;
    context.strokeRect(BOARD_X + 28, BOARD_Y + 186, BOARD_WIDTH - 56, 192);

    const title = game.status === "complete" ? "PACKET DELIVERED" : game.status === "lost" ? "PACKET LOST" : "READY";
    const color = game.status === "lost" ? "#ff5777" : "#e7f778";
    drawPixelText(context, title, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + 218, 25, color, "center");
    drawPixelText(context, game.message, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + 260, 15, "#dff9ff", "center");
    if (game.status === "lost") {
      drawPixelText(context, game.lossReason, BOARD_X + BOARD_WIDTH / 2, BOARD_Y + 292, 12, "#ffb3c0", "center");
      drawPixelText(context, "Every lost packet restarts from Yuseong.", BOARD_X + BOARD_WIDTH / 2, BOARD_Y + 320, 12, "#ffcb6b", "center");
    }
    drawPixelText(context, "Press SPACE or a move key.", BOARD_X + BOARD_WIDTH / 2, BOARD_Y + 346, 12, "#9db8bf", "center");
  }
}

export default function LucasRouteGame({ isPractice }: { isPractice?: boolean }) {
  const navigate = useNavigate();
  const [initialGame] = useState(() => createInitialGame());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(initialGame);
  const renderRef = useRef<RenderState>({
    visualPacket: { ...initialGame.packet },
    cameraRow: initialGame.packet.row,
    lastNow: 0,
  });
  const rafRef = useRef<number | null>(null);
  const hudTimerRef = useRef(0);
  const assetsRef = useRef<LoadedRouteAssets>(EMPTY_ROUTE_ASSETS);
  const [hud, setHud] = useState(() => createHud(initialGame));

  const syncHud = useCallback(() => {
    setHud(createHud(gameRef.current));
  }, []);

  const startNewRun = useCallback(
    (message = "Packet resent from Yuseong meteor.") => {
      const previous = gameRef.current;
      const next = createInitialGame(createSeed(), previous.attempts, previous.bestRow);
      next.status = "running";
      next.message = message;
      gameRef.current = next;
      renderRef.current = {
        visualPacket: { ...next.packet },
        cameraRow: next.packet.row,
        lastNow: performance.now(),
      };
      syncHud();
    },
    [syncHud],
  );

  const losePacket = useCallback(
    (reason: string) => {
      const game = gameRef.current;
      if (game.status !== "running") return;

      game.status = "lost";
      game.attempts += 1;
      game.lossReason = reason;
      game.message = "Collector swept the packet out of route memory.";
      game.lostAt = performance.now();
      game.lostPacket = { ...renderRef.current.visualPacket };
      game.bestRow = Math.max(game.bestRow, game.packet.row);
      syncHud();
    },
    [syncHud],
  );

  const completeRun = useCallback(() => {
    const game = gameRef.current;
    game.status = "complete";
    game.bestRow = END_ROW;
    game.message = "NY Lucas Server accepted the packet.";
    syncHud();
  }, [syncHud]);

  const movePacket = useCallback(
    (dc: number, dr: number) => {
      const game = gameRef.current;

      if (game.status === "idle") {
        game.status = "running";
        game.startedAt = performance.now();
        game.message = "Lucas packet launched. Reach New York without packet loss.";
      } else if (game.status === "lost" || game.status === "complete") {
        startNewRun();
        return;
      }

      const nextCol = Math.max(0, Math.min(COLS - 1, game.packet.col + dc));
      const nextRow = Math.max(0, Math.min(END_ROW, game.packet.row + dr));
      game.packet = { col: nextCol, row: nextRow };
      game.bestRow = Math.max(game.bestRow, nextRow);

      const exactStop = getExactStop(nextRow);
      if (exactStop && nextRow !== 0 && nextRow !== END_ROW) {
        game.message = `${exactStop.title} reached. Rest lane only; no checkpoint saved.`;
      } else {
        game.message = `Next hop: ${getNextStopForRow(nextRow).title}`;
      }

      if (nextRow >= END_ROW) {
        completeRun();
        return;
      }

      const row = game.rows[nextRow];
      const timeSeconds = (performance.now() - game.startedAt) / 1000;
      if (collidesWithLane(row, nextCol, timeSeconds)) {
        losePacket(`${row.title} lane collected row ${String(nextRow).padStart(2, "0")}.`);
      }

      syncHud();
    },
    [completeRun, losePacket, startNewRun, syncHud],
  );

  useEffect(() => {
    let cancelled = false;
    loadConfiguredAssets()
      .then((assets) => {
        if (!cancelled) assetsRef.current = assets;
      })
      .catch(() => {
        if (!cancelled) assetsRef.current = EMPTY_ROUTE_ASSETS;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const movement: Record<string, [number, number] | undefined> = {
        arrowup: [0, 1],
        w: [0, 1],
        arrowdown: [0, -1],
        s: [0, -1],
        arrowleft: [-1, 0],
        a: [-1, 0],
        arrowright: [1, 0],
        d: [1, 0],
      };

      if (key === "r" || key === " ") {
        event.preventDefault();
        startNewRun();
        return;
      }

      const delta = movement[key];
      if (!delta) return;
      event.preventDefault();
      movePacket(delta[0], delta[1]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePacket, startNewRun]);

  useEffect(() => {
    const tick = (now: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const game = gameRef.current;
      withCanvasScale(canvas, context);
      const render = renderRef.current;
      if (render.lastNow === 0) render.lastNow = now;
      const frameStep = Math.min(1, Math.max(0.35, (now - render.lastNow) / 16.67));
      render.lastNow = now;

      const packetLerp = 1 - (1 - LUCAS_ROUTE_GAME_CONFIG.packetLerp) ** frameStep;
      const cameraLerp = 1 - (1 - LUCAS_ROUTE_GAME_CONFIG.cameraLerp) ** frameStep;
      render.visualPacket.col += (game.packet.col - render.visualPacket.col) * packetLerp;
      render.visualPacket.row += (game.packet.row - render.visualPacket.row) * packetLerp;
      render.cameraRow += (render.visualPacket.row - render.cameraRow) * cameraLerp;

      if (game.status === "running") {
        game.elapsedMs = now - game.startedAt;
        const row = game.rows[game.packet.row];
        const timeSeconds = game.elapsedMs / 1000;
        if (collidesWithLane(row, game.packet.col, timeSeconds)) {
          losePacket(`${row.title} lane collected row ${String(row.row).padStart(2, "0")}.`);
        }
      }

      drawGame(context, gameRef.current, render, now, assetsRef.current);

      if (now - hudTimerRef.current > 250) {
        hudTimerRef.current = now;
        syncHud();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [losePacket, syncHud]);

  const progress = Math.round((hud.currentRow / END_ROW) * 100);

  return (
    <div className="lucas-route-game" data-status={hud.status}>
      <header className="lucas-route-game__header">
        <div>
          <p className="lucas-route-game__eyebrow">standalone process</p>
          <h1>lucas_route.sh</h1>
        </div>
        <div className="lucas-route-game__status">
          <span>{STATUS_LABEL[hud.status]}</span>
          <strong>{progress}%</strong>
        </div>
      </header>

      <main className="lucas-route-game__shell">
        <section className="lucas-route-game__viewport" aria-label="Lucas route mini game">
          <canvas ref={canvasRef} className="lucas-route-game__canvas" width={LOGICAL_WIDTH} height={LOGICAL_HEIGHT} />
        </section>

        <aside className="lucas-route-game__panel" aria-label="Run information">
          <div className="lucas-route-game__metric">
            <span>Current hop</span>
            <strong>{hud.currentStop.title}</strong>
          </div>
          <div className="lucas-route-game__metric">
            <span>Next router</span>
            <strong>{hud.nextStop.title}</strong>
          </div>
          <div className="lucas-route-game__metric-grid">
            <div>
              <span>Attempts</span>
              <strong>{hud.attempts + 1}</strong>
            </div>
            <div>
              <span>Best</span>
              <strong>
                {hud.bestRow}/{END_ROW}
              </strong>
            </div>
            <div>
              <span>Elapsed</span>
              <strong>{formatTime(hud.elapsedMs)}</strong>
            </div>
            <div>
              <span>Seed</span>
              <strong>{hud.seed}</strong>
            </div>
          </div>
          <p className="lucas-route-game__message">{hud.lossReason || hud.message}</p>
          <div className="lucas-route-game__controls" aria-label="Touch controls">
            <button type="button" onClick={() => movePacket(0, 1)} aria-label="Move up">
              ↑
            </button>
            <button type="button" onClick={() => movePacket(-1, 0)} aria-label="Move left">
              ←
            </button>
            <button type="button" onClick={() => startNewRun()} aria-label="Resend packet">
              R
            </button>
            <button type="button" onClick={() => movePacket(1, 0)} aria-label="Move right">
              →
            </button>
            <button type="button" onClick={() => movePacket(0, -1)} aria-label="Move down">
              ↓
            </button>
          </div>
          <p className="lucas-route-game__hint">
            Routers are rest lanes only. If a packet is collected, the run restarts from Yuseong.
          </p>
          {hud.status === "complete" && isPractice && (
            <div className="lucas-route-game__clear-overlay">
              <div className="lucas-route-game__clear-content">
                <h2 className="lucas-route-game__clear-title">ARCADE CLEAR!</h2>
                <p className="lucas-route-game__clear-subtitle">
                  Practice session complete. No data was synced.
                </p>
                <div className="lucas-route-game__clear-stats">
                  <div>
                    <span>Attempts</span>
                    <strong>{hud.attempts + 1}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{formatTime(hud.elapsedMs)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/minigames')}
                  className="lucas-route-game__clear-btn"
                >
                  RETURN TO ARCADE LOBBY
                </button>
                <button
                  type="button"
                  onClick={() => startNewRun()}
                  className="lucas-route-game__retry-btn"
                >
                  RETRY
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
