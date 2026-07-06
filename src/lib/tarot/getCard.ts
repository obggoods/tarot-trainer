import highPriestess02 from "../../data/tarot/meanings/major/02_high_priestess.json";
import lovers06 from "../../data/tarot/meanings/major/06_lovers.json";
import hangedMan12 from "../../data/tarot/meanings/major/12_hanged_man.json";
import death13 from "../../data/tarot/meanings/major/13_death.json";
import temperance14 from "../../data/tarot/meanings/major/14_temperance.json";
import tower16 from "../../data/tarot/meanings/major/16_tower.json";
import cups02 from "../../data/tarot/meanings/cups/02_cups.json";
import cups05 from "../../data/tarot/meanings/cups/05_cups.json";
import pentacles03 from "../../data/tarot/meanings/pentacles/03_pentacles.json";
import pentacles04 from "../../data/tarot/meanings/minor/pentacles/04.json";
import pentaclesPage from "../../data/tarot/meanings/pentacles/page_pentacles.json";
import swords10 from "../../data/tarot/meanings/swords/10_swords.json";
import wands08 from "../../data/tarot/meanings/minor/wands/08.json";
import wands10 from "../../data/tarot/meanings/wands/10_wands.json";
import type {
  CardMeaning,
  CardOrientationMeaning,
  TarotCard,
  TarotKnowledgeBaseEntry,
  TarotMeaningContexts,
} from "../../types/tarot";
import { normalizeCardId } from "./cardId";
import { getCardMeta } from "./getCardMeta";

type RawMeaningEntry = CardMeaning | TarotKnowledgeBaseEntry;

const rawMeaningsByCardId: Record<string, RawMeaningEntry> = {
  major_02_high_priestess: highPriestess02,
  major_06_lovers: lovers06,
  major_12_hanged_man: hangedMan12,
  major_13_death: death13,
  major_14_temperance: temperance14,
  major_16_tower: tower16,
  cups_02: cups02,
  cups_05: cups05,
  pentacles_03: pentacles03,
  pentacles_04: pentacles04,
  pentacles_11: pentaclesPage,
  swords_10: swords10,
  wands_08: wands08,
  wands_10: wands10,
};

export function getCard(cardId: string): TarotCard {
  const normalizedCardId = normalizeCardId(cardId);
  const meta = getCardMeta(normalizedCardId);
  const rawMeaning = rawMeaningsByCardId[normalizedCardId];

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
  };
}
