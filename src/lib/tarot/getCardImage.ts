import type { TarotImagePath } from "../../types/tarot";
import { getCardMeta } from "./getCardMeta";

function normalizePublicPath(path?: string | null): TarotImagePath | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path as TarotImagePath;
  return (path.startsWith("/") ? path : `/${path}`) as TarotImagePath;
}

export function getCardImage(cardId: string): TarotImagePath | undefined {
  const meta = getCardMeta(cardId);
  const image = normalizePublicPath(meta?.image);
  const originalImage = normalizePublicPath(meta?.original_image);

  console.debug("[TarotTrainer card image]", {
    cardId,
    image,
    originalImage,
    fallback: !image && Boolean(originalImage),
    location: typeof window !== "undefined" ? window.location.href : undefined,
  });

  return image ?? originalImage;
}

export function getOriginalCardImage(cardId: string): TarotImagePath | undefined {
  return normalizePublicPath(getCardMeta(cardId)?.original_image);
}
