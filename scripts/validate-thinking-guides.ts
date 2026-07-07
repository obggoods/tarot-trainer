import thinkingDatabase from "../src/data/tarot/thinking/tarotThinkingGuides.json";
import { rawMeaningsByCardId } from "../src/data/tarot/meanings/allMeanings";
import { buildThinkingGuide, formatThinkingGuideForPrompt } from "../src/lib/tarot/thinking/buildThinkingGuide";
import type { TarotThinkingDatabase, TarotThinkingGuide } from "../src/lib/tarot/thinking/types";
import type { Orientation, TarotCategory } from "../src/types/tarot";

const REQUIRED_MAJOR_CARD_IDS = [
  "major_00_fool",
  "major_01_magician",
  "major_02_high_priestess",
  "major_03_empress",
  "major_04_emperor",
  "major_05_hierophant",
  "major_06_lovers",
  "major_07_chariot",
  "major_08_strength",
  "major_09_hermit",
  "major_10_wheel_of_fortune",
  "major_11_justice",
  "major_12_hanged_man",
  "major_13_death",
  "major_14_temperance",
  "major_15_devil",
  "major_16_tower",
  "major_17_star",
  "major_18_moon",
  "major_19_sun",
  "major_20_judgement",
  "major_21_world",
];
const REQUIRED_CUPS_CARD_IDS = [
  "cups_ace",
  "cups_02",
  "cups_03",
  "cups_04",
  "cups_05",
  "cups_06",
  "cups_07",
  "cups_08",
  "cups_09",
  "cups_10",
  "cups_page",
  "cups_knight",
  "cups_queen",
  "cups_king",
];
const REQUIRED_WANDS_CARD_IDS = [
  "wands_ace",
  "wands_02",
  "wands_03",
  "wands_04",
  "wands_05",
  "wands_06",
  "wands_07",
  "wands_08",
  "wands_09",
  "wands_10",
  "wands_page",
  "wands_knight",
  "wands_queen",
  "wands_king",
];
const REQUIRED_SWORDS_CARD_IDS = [
  "swords_ace",
  "swords_02",
  "swords_03",
  "swords_04",
  "swords_05",
  "swords_06",
  "swords_07",
  "swords_08",
  "swords_09",
  "swords_10",
  "swords_page",
  "swords_knight",
  "swords_queen",
  "swords_king",
];
const REQUIRED_PENTACLES_CARD_IDS = [
  "pentacles_ace",
  "pentacles_02",
  "pentacles_03",
  "pentacles_04",
  "pentacles_05",
  "pentacles_06",
  "pentacles_07",
  "pentacles_08",
  "pentacles_09",
  "pentacles_10",
  "pentacles_page",
  "pentacles_knight",
  "pentacles_queen",
  "pentacles_king",
];
const ALLOWED_CARD_IDS = [
  ...REQUIRED_MAJOR_CARD_IDS,
  ...REQUIRED_CUPS_CARD_IDS,
  ...REQUIRED_WANDS_CARD_IDS,
  ...REQUIRED_SWORDS_CARD_IDS,
  ...REQUIRED_PENTACLES_CARD_IDS,
];
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
    "Major Cards": Object.keys(database.cards).filter((cardId) => cardId.startsWith("major_")).length,
    "Cups Cards": Object.keys(database.cards).filter((cardId) => cardId.startsWith("cups_")).length,
    "Wands Cards": Object.keys(database.cards).filter((cardId) => cardId.startsWith("wands_")).length,
    "Swords Cards": Object.keys(database.cards).filter((cardId) => cardId.startsWith("swords_")).length,
    "Pentacles Cards": Object.keys(database.cards).filter((cardId) => cardId.startsWith("pentacles_")).length,
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
  const majorCardIds = cardIds.filter((cardId) => cardId.startsWith("major_"));
  const cupsCardIds = cardIds.filter((cardId) => cardId.startsWith("cups_"));
  const wandsCardIds = cardIds.filter((cardId) => cardId.startsWith("wands_"));
  const swordsCardIds = cardIds.filter((cardId) => cardId.startsWith("swords_"));
  const pentaclesCardIds = cardIds.filter((cardId) => cardId.startsWith("pentacles_"));
  if (cardIds.length !== ALLOWED_CARD_IDS.length) {
    fail(`Full Thinking KB must contain exactly ${ALLOWED_CARD_IDS.length} cards, found ${cardIds.length}.`);
  }
  if (majorCardIds.length !== REQUIRED_MAJOR_CARD_IDS.length) {
    fail(`Major Phase 1 scope must contain exactly ${REQUIRED_MAJOR_CARD_IDS.length} major cards, found ${majorCardIds.length}.`);
  }
  if (cupsCardIds.length !== REQUIRED_CUPS_CARD_IDS.length) {
    fail(`Cups Phase 2 scope must contain exactly ${REQUIRED_CUPS_CARD_IDS.length} cups cards, found ${cupsCardIds.length}.`);
  }
  if (wandsCardIds.length !== REQUIRED_WANDS_CARD_IDS.length) {
    fail(`Wands Phase 3 scope must contain exactly ${REQUIRED_WANDS_CARD_IDS.length} wands cards, found ${wandsCardIds.length}.`);
  }
  if (swordsCardIds.length !== REQUIRED_SWORDS_CARD_IDS.length) {
    fail(`Swords Phase 3 scope must contain exactly ${REQUIRED_SWORDS_CARD_IDS.length} swords cards, found ${swordsCardIds.length}.`);
  }
  if (pentaclesCardIds.length !== REQUIRED_PENTACLES_CARD_IDS.length) {
    fail(`Pentacles Phase 4 scope must contain exactly ${REQUIRED_PENTACLES_CARD_IDS.length} pentacles cards, found ${pentaclesCardIds.length}.`);
  }

  for (const requiredCardId of REQUIRED_MAJOR_CARD_IDS) {
    if (!database.cards[requiredCardId]) fail(`Missing major thinking card: ${requiredCardId}`);
  }
  for (const requiredCardId of REQUIRED_CUPS_CARD_IDS) {
    if (!database.cards[requiredCardId]) fail(`Missing cups thinking card: ${requiredCardId}`);
  }
  for (const requiredCardId of REQUIRED_WANDS_CARD_IDS) {
    if (!database.cards[requiredCardId]) fail(`Missing wands thinking card: ${requiredCardId}`);
  }
  for (const requiredCardId of REQUIRED_SWORDS_CARD_IDS) {
    if (!database.cards[requiredCardId]) fail(`Missing swords thinking card: ${requiredCardId}`);
  }
  for (const requiredCardId of REQUIRED_PENTACLES_CARD_IDS) {
    if (!database.cards[requiredCardId]) fail(`Missing pentacles thinking card: ${requiredCardId}`);
  }

  for (const [cardId, entry] of Object.entries(database.cards)) {
    if (!ALLOWED_CARD_IDS.includes(cardId)) fail(`Unexpected thinking card in current phase: ${cardId}`);
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
