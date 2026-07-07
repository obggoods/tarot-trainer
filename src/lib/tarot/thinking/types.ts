import type { Orientation, TarotCategory } from "../../../types/tarot";

export type TarotThinkingSelectionLogic = Partial<
  Record<Extract<TarotCategory, "love" | "career" | "money" | "health" | "relationship"> | "selfGrowth", string>
>;

export interface TarotThinkingGuide {
  coreIdentity: string;
  firstQuestion: string;
  firstFocus: string;
  selectionLogic: TarotThinkingSelectionLogic;
  consultingFocus: string;
  commonMistakes: string[];
  avoidInterpretations: string[];
  followUpQuestions: string[];
  counselingExample: string;
  teachingTip: string;
}

export type TarotThinkingEntry = {
  card_id: string;
  name_ko: string;
  upright: TarotThinkingGuide;
  reversed?: TarotThinkingGuide;
};

export type TarotThinkingDatabase = {
  version: string;
  purpose: string;
  reviewNote: string;
  cards: Record<string, TarotThinkingEntry>;
};

export type ThinkingGuidePayload = {
  card_id: string;
  name_ko: string;
  orientation: Orientation;
  coreIdentity: string;
  firstQuestion: string;
  firstFocus: string;
  selectedLogic?: string;
  consultingFocus: string;
  followUpQuestions: string[];
  counselingExample: string;
  teachingTip: string;
};
