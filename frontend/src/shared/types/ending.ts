export interface EndingProgress {
  hasUnlockedEnding: boolean;
  allUnlocked: boolean;
}

export interface EndingTitleScene {
  videoUrl: string;
}

export type EndingResultVariant = "ENDING";
export type EndingResultTone = "lime" | "cyan" | "red" | "violet";

export interface EndingResultScene {
  variant: EndingResultVariant;
  tone: EndingResultTone;
  headerLeft: string;
  headerRight: string | null;
  classification: string;
  title: string;
  headline: string;
  terminalLines: string[];
  primaryActionLabel: string;
}
