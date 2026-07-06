import type { TarotImagePath } from "../../types/tarot";
import { getCardMeta } from "./getCardMeta";

export function getCardImage(cardId: string): TarotImagePath | undefined {
  return getCardMeta(cardId)?.image;
}

export function getOriginalCardImage(cardId: string): TarotImagePath | undefined {
  return getCardMeta(cardId)?.original_image;
}
