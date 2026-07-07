import thinkingDatabase from "../src/data/tarot/thinking/tarotThinkingGuides.json";
import { rawMeaningsByCardId } from "../src/data/tarot/meanings/allMeanings";
import { buildThinkingGuide, formatThinkingGuideForPrompt } from "../src/lib/tarot/thinking/buildThinkingGuide";
import type { TarotThinkingDatabase, TarotThinkingGuide } from "../src/lib/tarot/thinking/types";
import type { Orientation, TarotCategory } from "../src/types/tarot";

const EXPECTED_FOUNDATION_CARD_IDS = ["major_00_fool", "major_01_magician", "major_10_wheel_of_fortune", "cups_02", "wands_09"];
const REQUIRED_SELECTION_KEYS = ["love", "career", "money", "health", "relationship", "selfGrowth"] as const;
const BANNED_TEXT = ["좋은 카드", "나쁜 카드", "인터넷식", "행운 카드", "불운 카드"];

const database = thinkingDatabase as TarotThinkingDatabase;
const errors: string[] = [];

validateDatabase();

if (errors.length > 0) {
  console.error("Thinking guide validation failed.");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.table([
  {
    Version: database.version,
    Cards: Object.keys(database.cards).length,
    Orientations: Object.values(database.cards).reduce((count, entry) => count + 1 + (entry.reversed ? 1 : 0), 0),
    "Prompt Payload": buildThinkingGuide({ cardId: "wands_09", orientation: "upright", category: "love" }) ? "PASS" : "FAIL",
  },
]);

const samplePayload = buildThinkingGuide({ cardId: "wands_09", orientation: "upright", category: "love" });
if (samplePayload) {
  console.log("\nSample prompt payload:\n");
  console.log(formatThinkingGuideForPrompt(samplePayload));
}

function validateDatabase() {
  requireText("version", database.version);
  requireText("purpose", database.purpose);
  requireText("reviewNote", database.reviewNote);

  const cardIds = Object.keys(database.cards);
  if (cardIds.length !== EXPECTED_FOUNDATION_CARD_IDS.length) {
    fail(`Foundation scope must contain exactly ${EXPECTED_FOUNDATION_CARD_IDS.length} cards, found ${cardIds.length}. Do not expand to 78 cards in v1.`);
  }

  for (const expectedCardId of EXPECTED_FOUNDATION_CARD_IDS) {
    if (!database.cards[expectedCardId]) fail(`Missing foundation thinking card: ${expectedCardId}`);
  }

  for (const [cardId, entry] of Object.entries(database.cards)) {
    if (!EXPECTED_FOUNDATION_CARD_IDS.includes(cardId)) fail(`Unexpected thinking card in v1 foundation: ${cardId}`);
    if (!rawMeaningsByCardId[cardId]) fail(`Thinking card does not exist in meaning registry: ${cardId}`);
    if (entry.card_id !== cardId) fail(`${cardId}.card_id must match its object key.`);
    requireText(`${cardId}.name_ko`, entry.name_ko);
    validateGuide(`${cardId}.upright`, entry.upright);
    if (entry.reversed) validateGuide(`${cardId}.reversed`, entry.reversed);

    validatePromptPayload(cardId, "upright", "love");
    if (entry.reversed) validatePromptPayload(cardId, "reversed", "career");
  }
}

function validateGuide(prefix: string, guide: TarotThinkingGuide) {
  requireText(`${prefix}.coreIdentity`, guide.coreIdentity);
  requireText(`${prefix}.firstQuestion`, guide.firstQuestion);
  requireText(`${prefix}.firstFocus`, guide.firstFocus);
  requireText(`${prefix}.consultingFocus`, guide.consultingFocus);
  requireText(`${prefix}.counselingExample`, guide.counselingExample);
  requireText(`${prefix}.teachingTip`, guide.teachingTip);

  for (const key of REQUIRED_SELECTION_KEYS) requireText(`${prefix}.selectionLogic.${key}`, guide.selectionLogic[key]);
  requireStringArray(`${prefix}.commonMistakes`, guide.commonMistakes, 3);
  requireStringArray(`${prefix}.avoidInterpretations`, guide.avoidInterpretations, 3);
  requireStringArray(`${prefix}.followUpQuestions`, guide.followUpQuestions, 3);
  rejectBannedText(prefix, JSON.stringify(guide));
}

function validatePromptPayload(cardId: string, orientation: Orientation, category: TarotCategory) {
  const payload = buildThinkingGuide({ cardId, orientation, category });
  if (!payload) {
    fail(`Failed to build prompt payload for ${cardId}.${orientation}.${category}`);
    return;
  }

  requireText(`${cardId}.${orientation}.payload.coreIdentity`, payload.coreIdentity);
  requireText(`${cardId}.${orientation}.payload.selectedLogic`, payload.selectedLogic);
  requireText(`${cardId}.${orientation}.payload.counselingExample`, payload.counselingExample);
}

function requireText(path: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${path} must be a non-empty string.`);
}

function requireStringArray(path: string, value: unknown, minLength: number) {
  if (!Array.isArray(value)) {
    fail(`${path} must be an array.`);
    return;
  }

  if (value.length < minLength) fail(`${path} must contain at least ${minLength} items.`);
  for (const [index, item] of value.entries()) requireText(`${path}[${index}]`, item);
}

function rejectBannedText(path: string, text: string) {
  for (const banned of BANNED_TEXT) {
    if (text.includes(banned)) fail(`${path} includes banned wording: ${banned}`);
  }
}

function fail(message: string) {
  errors.push(message);
}
