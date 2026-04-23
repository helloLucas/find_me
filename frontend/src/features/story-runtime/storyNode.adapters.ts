import type {
  StoryNode,
  StoryNodeResponse,
  TransitionNextNodeResponse,
} from "../../shared/types/story";

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

export function normalizeTransitionNodeResponse(
  response: TransitionNextNodeResponse
): StoryNode {
  return {
    id: response.id,
    code: response.code,
    nodeType: response.nodeType,
    outputBundle: response.outputBundle,
    promptType: response.promptType,
    promptMeta: response.promptMeta,
    isCheckpoint: response.checkpoint,
    isTerminal: response.terminal,
  };
}
