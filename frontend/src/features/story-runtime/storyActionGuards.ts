import type { StoryNode, TransitionRequest } from "../../shared/types/story";
import { objectRecord, stringValue } from "./outputBundle.adapters";

type StoryActionType = TransitionRequest["actionType"];

export function canSubmitStoryAction(
  node: StoryNode | null | undefined,
  actionType: StoryActionType,
  inputValue?: string
) {
  if (!node || !inputValue) return false;
  if (actionType !== "system" && node.promptType !== actionType) return false;

  const meta = objectRecord(node.promptMeta) ?? {};
  const allowedActions = stringArray(meta.allowedActions);

  if (allowedActions.length > 0 && !allowedActions.includes(actionType)) {
    return false;
  }

  if (actionType === "click") {
    return metaIncludes(meta.clickTargets, inputValue) || !Array.isArray(meta.clickTargets);
  }

  if (actionType === "inspect") {
    return getStoryInspectTarget(node) === inputValue || metaIncludes(meta.inspectTargets, inputValue);
  }

  return true;
}

export function getStoryInspectTarget(node: StoryNode | null | undefined) {
  const meta = objectRecord(node?.promptMeta) ?? {};
  const inspectTarget = stringValue(meta.inspectTarget);
  if (inspectTarget) return inspectTarget;

  return getInspectTargetFallbackByNodeCode(node?.code);
}

function getInspectTargetFallbackByNodeCode(nodeCode: string | undefined) {
  if (!nodeCode) return undefined;

  if (nodeCode === "CH1_ARTICLE_SCROLL_CORRUPTION") return "corrupted_article_region";
  if (nodeCode === "CH1_DEVTOOLS_CUE") return "devtools_open";
  if (nodeCode === "CH1_SUCCESS_REQUEST_SELECTED") return "headers_or_response";
  if (nodeCode === "CH1_PACKET_HEADERS_RESPONSE") return "packet_message";
  if (nodeCode === "CH1_RELAY_CLUE_REVISIT") return "relay_clue_recheck";

  return undefined;
}

function metaIncludes(value: unknown, target: string) {
  return stringArray(value).includes(target);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}
