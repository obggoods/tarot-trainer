import thinkingDatabase from "../../../data/tarot/thinking/tarotThinkingGuides.json";
import type { Orientation, TarotCategory } from "../../../types/tarot";
import { normalizeCardId, toTrainingCardId } from "../cardId";
import type { TarotThinkingDatabase, TarotThinkingEntry, TarotThinkingGuide } from "./types";

const database = thinkingDatabase as TarotThinkingDatabase;

export function getThinkingEntry(cardId: string): TarotThinkingEntry | undefined {
  const normalizedCardId = normalizeCardId(cardId);
  return database.cards[normalizedCardId] ?? database.cards[toTrainingCardId(normalizedCardId)];
}

export function getThinkingGuide(cardId: string, orientation: Orientation = "upright"): TarotThinkingGuide | undefined {
  const entry = getThinkingEntry(cardId);
  if (!entry) return undefined;
  return orientation === "reversed" ? entry.reversed ?? entry.upright : entry.upright;
}

export function hasThinkingGuide(cardId: string, orientation: Orientation = "upright") {
  return Boolean(getThinkingGuide(cardId, orientation));
}

export function getThinkingDatabaseMeta() {
  return {
    version: database.version,
    purpose: database.purpose,
    reviewNote: database.reviewNote,
    cardCount: Object.keys(database.cards).length,
  };
}

export function selectThinkingLogic(guide: TarotThinkingGuide, category: TarotCategory) {
  if (category === "love" || category === "career" || category === "money" || category === "health" || category === "relationship") {
    return guide.selectionLogic[category];
  }

  if (category === "reunion" || category === "crush" || category === "family") {
    return guide.selectionLogic.relationship ?? guide.selectionLogic.love;
  }

  if (category === "business" || category === "job_change" || category === "exam" || category === "path") {
    return guide.selectionLogic.career ?? guide.selectionLogic.selfGrowth;
  }

  return guide.selectionLogic.selfGrowth;
}
