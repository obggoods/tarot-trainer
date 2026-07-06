import cardsManifest from "../../data/tarot/cards/cards-manifest.json";
import type { TarotCardMeta, TarotManifest } from "../../types/tarot";
import { normalizeCardId } from "./cardId";

export const tarotManifest = cardsManifest as TarotManifest;

export function getCardMeta(cardId: string): TarotCardMeta | undefined {
  const normalizedCardId = normalizeCardId(cardId);
  return tarotManifest[normalizedCardId];
}
