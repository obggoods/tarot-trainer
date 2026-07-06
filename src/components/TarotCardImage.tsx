import { useEffect, useMemo, useState } from "react";
import { ImageOff, Maximize2, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { getCardImage, getOriginalCardImage } from "../lib/tarot/getCardImage";
import { getCardMeta } from "../lib/tarot/getCardMeta";

type TarotCardImageSize = "sm" | "md" | "lg" | "full";

type TarotCardImageProps = {
  cardId: string;
  size?: TarotCardImageSize;
  alt?: string;
  className?: string;
  enableLightbox?: boolean;
  isReversed?: boolean;
};

const sizeClass: Record<TarotCardImageSize, string> = {
  sm: "w-28",
  md: "w-40",
  lg: "w-56",
  full: "w-full",
};

export function TarotCardImage({
  cardId,
  size = "md",
  alt,
  className,
  enableLightbox = true,
  isReversed = false,
}: TarotCardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showUprightInModal, setShowUprightInModal] = useState(false);

  const meta = useMemo(() => getCardMeta(cardId), [cardId]);
  const image = useMemo(() => getCardImage(cardId), [cardId]);
  const originalImage = useMemo(() => getOriginalCardImage(cardId), [cardId]);
  const [currentImage, setCurrentImage] = useState(image);
  const imageAlt = alt ?? meta?.name_ko ?? "Tarot card";
  const lightboxImage = originalImage ?? currentImage ?? image;

  useEffect(() => {
    setLoaded(false);
    setHasError(false);
    setCurrentImage(image);
  }, [cardId, image, originalImage]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  function openLightbox() {
    if (!enableLightbox || !lightboxImage || hasError) return;
    setShowUprightInModal(false);
    setIsLightboxOpen(true);
  }

  function toggleModalOrientation() {
    if (!isReversed) return;
    setShowUprightInModal((value) => !value);
  }

  function handleImageError() {
    console.warn("[TarotTrainer card image load failed]", {
      cardId,
      failedSrc: currentImage,
      fallbackSrc: originalImage,
      location: window.location.href,
    });

    if (currentImage !== originalImage && originalImage) {
      setLoaded(false);
      setCurrentImage(originalImage);
      return;
    }

    setHasError(true);
  }

  const shouldRotateInModal = isReversed && !showUprightInModal;

  return (
    <>
      <figure className={cn("group relative max-w-full", sizeClass[size], className)}>
        <button
          type="button"
          className="relative block aspect-[5/8] w-full overflow-hidden rounded-md border border-stone-300 bg-stone-100 shadow-sm outline-none transition focus:ring-4 focus:ring-night/15"
          onClick={openLightbox}
          aria-label={`${imageAlt} 크게 보기`}
          disabled={!enableLightbox || !lightboxImage || hasError}
        >
          {!loaded && !hasError ? (
            <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-100 via-stone-200 to-stone-100" />
          ) : null}

          {currentImage && !hasError ? (
            <img
              src={currentImage}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className={cn("h-full w-full object-cover transition duration-300", loaded ? "opacity-100" : "opacity-0", isReversed ? "rotate-180" : "")}
              onLoad={() => setLoaded(true)}
              onError={handleImageError}
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center text-stone-500">
              <ImageOff size={28} />
              <span className="text-sm font-semibold leading-5">이미지를 준비 중입니다</span>
            </span>
          )}

          {enableLightbox && currentImage && !hasError ? (
            <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
              <Maximize2 size={16} />
            </span>
          ) : null}
        </button>
      </figure>

      {isLightboxOpen && lightboxImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${imageAlt} 확대 이미지`}
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            <Button
              type="button"
              variant="secondary"
              className="absolute right-2 top-2 z-10 bg-white/95"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="닫기"
            >
              <X size={16} />
              닫기
            </Button>

            <div className="max-h-[86vh] max-w-full rounded-md bg-white/10 p-2">
              <button
                type="button"
                className={cn("block cursor-default rounded-md outline-none focus:ring-4 focus:ring-white/25", isReversed ? "cursor-pointer" : "")}
                onClick={toggleModalOrientation}
                aria-label={isReversed ? "카드 방향 전환" : undefined}
              >
                <img
                  src={lightboxImage}
                  alt={imageAlt}
                  className="max-h-[84vh] max-w-full rounded-md bg-white object-contain shadow-2xl transition-transform duration-300"
                  style={{ transform: shouldRotateInModal ? "rotate(180deg)" : "none", transformOrigin: "center" }}
                />
              </button>
            </div>
            {isReversed ? (
              <p className="rounded-md bg-black/45 px-3 py-2 text-sm font-semibold text-white">
                {showUprightInModal ? "카드를 클릭하면 역방향으로 돌아갑니다." : "카드를 클릭하면 정방향으로 볼 수 있어요."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
