import type { OutputBundle, StoryNode } from "../../shared/types/story";

type StoryOutputBundleRecord = Record<string, unknown>;

export type StoryTextResolveContext = {
  playerName?: string;
  friendName?: string;
};

export type NormalizedStoryOutputBundle = {
  raw: StoryOutputBundleRecord;
  scene: {
    id?: string;
    mode?: string;
    bgm?: string;
    preVideo?: string;
    glitchLevel: number;
  };
  content: StoryOutputBundleRecord;
  messages: StoryOutputBundleRecord[];
  notifications: StoryOutputBundleRecord[];
  actions: StoryOutputBundleRecord[];
  uiMarkers: StoryOutputBundleRecord;
};

export function normalizeStoryOutputBundle(
  outputBundle: OutputBundle | null | undefined
): NormalizedStoryOutputBundle {
  const raw = objectRecord(outputBundle) ?? {};
  const scene = objectRecord(raw.scene) ?? {};

  return {
    raw,
    scene: {
      id: stringValue(scene.id),
      mode: stringValue(scene.mode),
      bgm: stringValue(scene.bgm),
      preVideo: stringValue(scene.preVideo),
      glitchLevel: numberValue(scene.glitchLevel, 0),
    },
    content: objectRecord(raw.content) ?? {},
    messages: recordArray(raw.messages),
    notifications: recordArray(raw.notifications),
    actions: recordArray(raw.actions),
    uiMarkers: objectRecord(raw.uiMarkers) ?? {},
  };
}

export function resolveStoryText(value: unknown, context: StoryTextResolveContext = {}): string {
  return String(value ?? "").replace(/\{([^{}]+)\}/g, (_, key: string) => {
    return resolveStoryPlaceholder(key.trim(), context) ?? `{${key}}`;
  });
}

function resolveStoryPlaceholder(
  key: string,
  context: StoryTextResolveContext
): string | undefined {
  if (key === "플레이어 이름") return context.playerName ?? "플레이어";
  if (key === "다른 친구 이름") return context.friendName ?? "친구";
  return undefined;
}

export function shouldOpenBrowserForStoryNode(
  node: Pick<StoryNode, "code" | "nodeType">,
  output: NormalizedStoryOutputBundle
): boolean {
  return (
    output.scene.mode === "browser" ||
    output.scene.mode === "network" ||
    node.nodeType === "network" ||
    node.code.includes("NEWS") ||
    node.code.includes("ARTICLE")
  );
}

export function objectRecord(value: unknown): StoryOutputBundleRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as StoryOutputBundleRecord)
    : undefined;
}

export function recordArray(value: unknown): StoryOutputBundleRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is StoryOutputBundleRecord => Boolean(objectRecord(item)));
}

export function stringValue(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
