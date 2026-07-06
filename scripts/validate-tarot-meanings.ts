import { allMeaningCardIds, rawMeaningsByCardId } from "../src/data/tarot/meanings/allMeanings";
import { trainingCardPool } from "../src/data/tarotQuestions";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import { normalizeCardId } from "../src/lib/tarot/cardId";
import { tarotManifest } from "../src/lib/tarot/getCardMeta";
import type { CardOrientationMeaning, TarotKnowledgeBaseEntry, TarotMeaningContexts } from "../src/types/tarot";

const REQUIRED_CONTEXTS: Array<keyof TarotMeaningContexts> = [
  "love",
  "reunion",
  "business",
  "money",
  "career",
  "health",
  "relationship",
  "advice",
  "daily",
];

const EXPECTED_CARD_COUNT = 78;

const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasTextArray(value: unknown) {
  return Array.isArray(value) && value.length > 0 && value.every(hasText);
}

function validateMeaning(cardId: string, orientation: "upright" | "reversed", meaning: CardOrientationMeaning) {
  const prefix = `${cardId}.${orientation}`;

  if (!hasTextArray(meaning.keywords)) fail(`${prefix}.keywords is missing`);
  if (!hasText(meaning.traditional_meaning)) fail(`${prefix}.traditional_meaning is missing`);
  if (!hasTextArray(meaning.symbolism)) fail(`${prefix}.symbolism is missing`);
  if (!hasText(meaning.positive_aspect)) fail(`${prefix}.positive_aspect is missing`);
  if (!hasText(meaning.warning)) fail(`${prefix}.warning is missing`);
  if (!hasTextArray(meaning.must_include)) fail(`${prefix}.must_include is missing`);
  if (!hasTextArray(meaning.common_mistakes)) fail(`${prefix}.common_mistakes is missing`);
}

function validateContexts(cardId: string, contexts: TarotMeaningContexts | undefined) {
  if (!contexts) {
    fail(`${cardId}.contexts is missing`);
    return;
  }

  for (const context of REQUIRED_CONTEXTS) {
    if (!hasText(contexts[context]?.upright)) fail(`${cardId}.contexts.${context}.upright is missing`);
    if (!hasText(contexts[context]?.reversed)) fail(`${cardId}.contexts.${context}.reversed is missing`);
  }
}

if (allMeaningCardIds.length !== EXPECTED_CARD_COUNT) {
  fail(`Expected ${EXPECTED_CARD_COUNT} meaning cards, found ${allMeaningCardIds.length}`);
}

const uniqueCardIds = new Set(allMeaningCardIds);
if (uniqueCardIds.size !== allMeaningCardIds.length) {
  fail("allMeaningCardIds contains duplicate card ids");
}

if (trainingCardPool.length !== EXPECTED_CARD_COUNT) {
  fail(`Expected ${EXPECTED_CARD_COUNT} training cards, found ${trainingCardPool.length}`);
}

for (const cardId of trainingCardPool) {
  if (!rawMeaningsByCardId[cardId]) {
    fail(`${cardId} is in trainingCardPool but not rawMeaningsByCardId`);
  }

  const normalizedCardId = normalizeCardId(cardId);
  if (!tarotManifest[normalizedCardId]) {
    fail(`${cardId} normalizes to ${normalizedCardId}, but no manifest entry exists`);
  }
}

for (const cardId of allMeaningCardIds) {
  const entry = rawMeaningsByCardId[cardId] as TarotKnowledgeBaseEntry;

  if (!hasText(entry.card_id)) fail(`${cardId}.card_id is missing`);
  if (!hasText(entry.name_ko)) fail(`${cardId}.name_ko is missing`);
  if (!hasText(entry.name_en)) fail(`${cardId}.name_en is missing`);
  if (!hasText(entry.arcana)) fail(`${cardId}.arcana is missing`);

  validateContexts(cardId, entry.contexts);

  try {
    getCard(cardId);
    validateMeaning(cardId, "upright", getCardMeaning(cardId, "upright"));
    validateMeaning(cardId, "reversed", getCardMeaning(cardId, "reversed"));
  } catch (error) {
    fail(`${cardId} failed getCard/getCardMeaning: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((message) => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${allMeaningCardIds.length} tarot cards and ${trainingCardPool.length} training ids.`);
