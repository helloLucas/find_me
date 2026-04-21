import type { StoryNode, StoryNodeResponse } from "../../shared/types/story";

export function normalizeStoryNodeResponse(response: StoryNodeResponse): StoryNode {
  return {
    id: response.id,
    code: response.nodeCode,
    nodeType: response.nodeType,
    outputBundle: response.outputBundle,
    promptType: response.promptType,
    promptMeta: response.promptMeta,
    isCheckpoint: response.checkpoint,
    isTerminal: response.terminal,
  };
}
