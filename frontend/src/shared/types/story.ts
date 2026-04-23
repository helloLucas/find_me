export type ArticleCorruptionIntensity = "subtle" | "active";

export interface ArticleCorruption {
  paragraphIndexes: number[];
  inspectIndex?: number;
  intensity: ArticleCorruptionIntensity;
}

export interface StoryContent {
  articleTitle?: string;
  articleBody?: string[];
  articleCorruption?: ArticleCorruption;
  [key: string]: any;
}

export interface OutputBundle {
  text?: string;
  content?: StoryContent;
  [key: string]: any;
}

export interface PromptMeta {
  directory?: string;
  [key: string]: any;
}

export interface StoryNode {
  id: number;
  code: string;
  nodeType: "narrative" | "console" | "network" | "choice" | "system" | "ending";
  outputBundle?: OutputBundle;
  promptType: "none" | "command" | "choice" | "inspect" | "click";
  promptMeta?: PromptMeta | null;
  isCheckpoint: boolean;
  isTerminal: boolean;
}

export interface StoryNodeResponse {
  id: number;
  nodeCode: string;
  nodeType: StoryNode["nodeType"];
  outputBundle?: OutputBundle;
  promptType: StoryNode["promptType"];
  promptMeta?: PromptMeta | null;
  checkpoint: boolean;
  terminal: boolean;
}

export interface EffectBundle {
  type: string;
  payload?: any;
}

export interface ProgressSnapshot {
  [key: string]: any;
}

export interface TransitionRequest {
  nodeId: number;
  actionType: "command" | "click" | "inspect" | "choice" | "system";
  inputValue?: string;
  meta?: Record<string, unknown>;
}

export interface TransitionResponse {
  nextNode: StoryNode;
  snapshot: ProgressSnapshot;
  effects?: EffectBundle[];
  result: "success" | "fail" | "retry" | "game_over";
}
