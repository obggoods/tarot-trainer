import { rawMeaningsByCardId } from "../../data/tarot/meanings/allMeanings";
import type {
  CardMeaning,
  CardOrientationMeaning,
  RawMeaningEntry,
  TarotCard,
  TarotMeaningContexts,
} from "../../types/tarot";
import { normalizeCardId, toTrainingCardId } from "./cardId";
import { getCardMeta } from "./getCardMeta";

export function getCard(cardId: string): TarotCard {
  const normalizedCardId = normalizeCardId(cardId);
  const meta = getCardMeta(normalizedCardId);
  const rawMeaning = rawMeaningsByCardId[normalizedCardId] ?? rawMeaningsByCardId[toTrainingCardId(normalizedCardId)];

  if (!meta) {
    throw new Error(`카드 메타데이터를 찾을 수 없습니다: ${cardId}`);
  }

  if (!rawMeaning) {
    throw new Error(`카드 의미 데이터를 찾을 수 없습니다: ${cardId}`);
  }

  const { meaning, contexts } = normalizeMeaningEntry(rawMeaning);
  return { meta, meaning, contexts };
}

export function getCardMeaning(cardId: string, orientation: "upright" | "reversed"): CardOrientationMeaning {
  const card = getCard(cardId);
  const meaning = orientation === "reversed" ? card.meaning.reversed : card.meaning.upright;

  if (!isCompleteMeaning(meaning)) {
    return card.meaning.upright;
  }

  return meaning;
}

function isCompleteMeaning(meaning: Partial<CardOrientationMeaning> | undefined): meaning is CardOrientationMeaning {
  return Boolean(
    meaning &&
      Array.isArray(meaning.keywords) &&
      typeof meaning.traditional_meaning === "string" &&
      typeof meaning.positive_aspect === "string" &&
      typeof meaning.warning === "string" &&
      Array.isArray(meaning.must_include) &&
      Array.isArray(meaning.common_mistakes) &&
      typeof meaning.traditional_correction === "string" &&
      typeof meaning.sample_answer === "string" &&
      typeof meaning.wrong_note === "string",
  );
}

function normalizeMeaningEntry(entry: RawMeaningEntry): { meaning: CardMeaning; contexts?: TarotMeaningContexts } {
  if ("meanings" in entry) {
    return {
      meaning: {
        card_id: entry.card_id,
        upright: withCompatibilityFields(entry.meanings.upright),
        reversed: withCompatibilityFields(entry.meanings.reversed),
      },
      contexts: entry.contexts,
    };
  }

  return {
    meaning: {
      ...entry,
      upright: withCompatibilityFields(entry.upright),
      reversed: entry.reversed ? withCompatibilityFields(entry.reversed) : undefined,
    },
  };
}

function withCompatibilityFields(meaning: Partial<CardOrientationMeaning>): CardOrientationMeaning {
  const keywords = meaning.keywords ?? [];
  const traditionalMeaning = meaning.traditional_meaning ?? "";
  const positiveAspect = meaning.positive_aspect ?? "";
  const warning = meaning.warning ?? "";
  const mustInclude = meaning.must_include ?? [];
  const commonMistakes = meaning.common_mistakes ?? [];

  return {
    keywords,
    traditional_meaning: traditionalMeaning,
    symbolism: meaning.symbolism ?? [],
    positive_aspect: positiveAspect,
    warning,
    must_include: mustInclude,
    common_mistakes: commonMistakes,
    traditional_correction: meaning.traditional_correction ?? traditionalMeaning,
    sample_answer: meaning.sample_answer ?? positiveAspect,
    wrong_note: meaning.wrong_note ?? commonMistakes.join(" / "),
    question_contexts: meaning.question_contexts,
    training_hints: meaning.training_hints,
  };
}
