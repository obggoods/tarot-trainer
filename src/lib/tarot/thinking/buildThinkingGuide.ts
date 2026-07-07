import type { Orientation, TarotCategory } from "../../../types/tarot";
import { getThinkingEntry, getThinkingGuide, selectThinkingLogic } from "./getThinkingGuide";
import type { ThinkingGuidePayload } from "./types";

type BuildThinkingGuideInput = {
  cardId: string;
  orientation?: Orientation;
  category?: TarotCategory;
};

export function buildThinkingGuide({ cardId, orientation = "upright", category }: BuildThinkingGuideInput): ThinkingGuidePayload | undefined {
  const entry = getThinkingEntry(cardId);
  const guide = getThinkingGuide(cardId, orientation);
  if (!entry || !guide) return undefined;

  return {
    card_id: entry.card_id,
    name_ko: entry.name_ko,
    orientation,
    coreIdentity: guide.coreIdentity,
    firstQuestion: guide.firstQuestion,
    firstFocus: guide.firstFocus,
    selectedLogic: category ? selectThinkingLogic(guide, category) : undefined,
    consultingFocus: guide.consultingFocus,
    followUpQuestions: guide.followUpQuestions.slice(0, 3),
    counselingExample: guide.counselingExample,
    teachingTip: guide.teachingTip,
  };
}

export function formatThinkingGuideForPrompt(payload: ThinkingGuidePayload) {
  return [
    `card_id: ${payload.card_id}`,
    `name_ko: ${payload.name_ko}`,
    `orientation: ${payload.orientation}`,
    `coreIdentity: ${payload.coreIdentity}`,
    `firstQuestion: ${payload.firstQuestion}`,
    `firstFocus: ${payload.firstFocus}`,
    payload.selectedLogic ? `selectedLogic: ${payload.selectedLogic}` : "",
    `consultingFocus: ${payload.consultingFocus}`,
    `followUpQuestions: ${payload.followUpQuestions.join(" / ")}`,
    `counselingExample: ${payload.counselingExample}`,
    `teachingTip: ${payload.teachingTip}`,
  ]
    .filter(Boolean)
    .join("\n");
}
