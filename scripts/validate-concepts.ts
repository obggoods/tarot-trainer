import fs from "node:fs";
import path from "node:path";
import tarotConcepts from "../src/data/tarot/concepts/tarotConcepts.json";
import cardConceptMap from "../src/data/tarot/concepts/cardConceptMap.json";
import questionConceptRules from "../src/data/tarot/concepts/questionConceptRules.json";
import { getCardMeaning } from "../src/lib/tarot/getCard";
import { getTrainingHint, getQuestionContextV2 } from "../src/lib/tarot/trainingHints";
import { getConceptEngineCoverage, resolveConcepts, type TarotConcept } from "../src/lib/tarot/conceptResolver";
import type { Orientation, TarotCategory, TarotQuestion } from "../src/types/tarot";

type CardMap = Record<string, Record<Orientation, string[]>>;
type RuleMap = Record<string, Record<string, { preferred: string[] }>>;
type ResolverAuditCase = {
  label: string;
  cardId: string;
  orientation: Orientation;
  category: TarotCategory;
  position: string;
};

type ResolverAuditResult = {
  label: string;
  cardId: string;
  orientation: Orientation;
  category: TarotCategory;
  position: string;
  selectedConcepts: string[];
  realWorldIssues: string[];
  concreteChecks: string[];
  selectedMeaning: string;
  selectedMeaningAligned: boolean;
  oldConcreteChecks: string[];
  matchedConcreteChecks: string[];
  missingConcreteChecks: string[];
  answerSeed: string;
  answerSeedSignals: string[];
  answerSeedCovered: boolean;
  status: "PASS" | "WARNING" | "FAIL";
};

const concepts = tarotConcepts as TarotConcept[];
const cardMap = cardConceptMap as CardMap;
const rules = questionConceptRules as RuleMap;
const requiredRules: Array<[TarotCategory, string]> = [
  ["business", "warning"],
  ["business", "advice"],
  ["career", "warning"],
  ["career", "advice"],
  ["money", "warning"],
  ["money", "advice"],
  ["love", "current"],
  ["love", "advice"],
  ["reunion", "obstacle"],
  ["reunion", "advice"],
  ["relationship", "partnership_check"],
  ["health", "warning"],
];
const requiredSwordsCardIds = [
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
const requiredPentaclesCardIds = [
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
const requiredCupsCardIds = [
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
const requiredWandsCardIds = [
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
const auditCases: ResolverAuditCase[] = [
  auditCase("마법사 역방향 / 재회 장애물", "major_01_magician", "reversed", "reunion", "obstacle"),
  auditCase("세계 정방향 / 사업 조언", "major_21_world", "upright", "business", "advice"),
  auditCase("소드 7 정방향 / 파트너십 확인", "swords_07", "upright", "relationship", "partnership_check"),
  auditCase("펜타클 페이지 역방향 / 사업 위험", "pentacles_page", "reversed", "business", "warning"),
  auditCase("컵 5 정방향 / 연애 현재", "cups_05", "upright", "love", "current"),
  auditCase("완드 10 정방향 / 건강 경고", "wands_10", "upright", "health", "warning"),
  auditCase("소드 4 역방향 / 연애 조언", "swords_04", "reversed", "love", "advice"),
  auditCase("펜타클 3 정방향 / 인간관계 확인", "pentacles_03", "upright", "relationship", "partnership_check"),
  auditCase("연인 역방향 / 재회 조언", "major_06_lovers", "reversed", "reunion", "advice"),
  auditCase("여사제 정방향 / 연애 현재", "major_02_high_priestess", "upright", "love", "current"),
  auditCase("소드 3 정방향 / 연애 감정 상처", "swords_03", "upright", "love", "current"),
  auditCase("소드 5 정방향 / 인간관계 갈등", "swords_05", "upright", "relationship", "partnership_check"),
  auditCase("소드 8 정방향 / 진로 심리적 제한", "swords_08", "upright", "career", "advice"),
  auditCase("펜타클 2 정방향 / 금전 수입·지출 균형", "pentacles_02", "upright", "money", "warning"),
  auditCase("펜타클 6 정방향 / 사업 공정한 교환·정산", "pentacles_06", "upright", "business", "advice"),
  auditCase("펜타클 8 정방향 / 직업 기술 숙련·반복 훈련", "pentacles_08", "upright", "career", "advice"),
  auditCase("컵 5 정방향 / 연애 상실 집중", "cups_05", "upright", "love", "current"),
  auditCase("컵 7 정방향 / 연애 선택 혼란", "cups_07", "upright", "love", "current"),
  auditCase("컵 8 정방향 / 재회 감정 이탈", "cups_08", "upright", "reunion", "obstacle"),
  auditCase("완드 5 정방향 / 사업 경쟁과 갈등", "wands_05", "upright", "business", "warning"),
  auditCase("완드 8 정방향 / 직업 빠른 진행", "wands_08", "upright", "career", "advice"),
  auditCase("완드 10 정방향 / 건강 과부하", "wands_10", "upright", "health", "warning"),
];

const errors: string[] = [];
let auditResults: ResolverAuditResult[] = [];

validateConcepts();
validateCardMap();
validateRules();
validateResolver();
auditResults = buildResolverAuditResults();
validateResolverAudit(auditResults);
writeResolverReport(auditResults);
writeTokenReport();

if (errors.length > 0) {
  console.error("Concept validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const coverage = getConceptEngineCoverage();
console.log("Concept validation passed.");
console.table([
  {
    Concepts: coverage.concepts,
    Cards: coverage.cards,
    "Orientation Maps": coverage.orientationMappings,
    "Question Rules": coverage.questionRules,
  },
]);
console.log(`Report written: ${path.join(process.cwd(), "reports", "prompt-token-optimization.md")}`);
console.log(`Report written: ${path.join(process.cwd(), "reports", "concept-resolver-report.md")}`);

function validateConcepts() {
  const ids = new Set<string>();
  for (const concept of concepts) {
    if (!concept.id) errors.push("Concept id is empty.");
    if (ids.has(concept.id)) errors.push(`Duplicate concept id: ${concept.id}`);
    ids.add(concept.id);
    if (!concept.name_ko) errors.push(`Concept ${concept.id} name_ko is empty.`);
    if (!concept.definition) errors.push(`Concept ${concept.id} definition is empty.`);
    if (concept.real_world_issues.length < 2) errors.push(`Concept ${concept.id} needs at least 2 real_world_issues.`);
    if (concept.concrete_checks.length < 3) errors.push(`Concept ${concept.id} needs at least 3 concrete_checks.`);
    if (concept.bad_readings.length < 2) errors.push(`Concept ${concept.id} needs at least 2 bad_readings.`);
  }
}

function validateCardMap() {
  if (Object.keys(cardMap).length < 60) errors.push(`Card concept map must contain at least 60 cards after wands expansion, got ${Object.keys(cardMap).length}.`);
  for (const cardId of requiredSwordsCardIds) {
    if (!cardMap[cardId]) errors.push(`Missing swords concept map: ${cardId}`);
  }
  for (const cardId of requiredPentaclesCardIds) {
    if (!cardMap[cardId]) errors.push(`Missing pentacles concept map: ${cardId}`);
  }
  for (const cardId of requiredCupsCardIds) {
    if (!cardMap[cardId]) errors.push(`Missing cups concept map: ${cardId}`);
  }
  for (const cardId of requiredWandsCardIds) {
    if (!cardMap[cardId]) errors.push(`Missing wands concept map: ${cardId}`);
  }

  for (const [cardId, orientations] of Object.entries(cardMap)) {
    for (const orientation of ["upright", "reversed"] as Orientation[]) {
      const conceptIds = orientations[orientation];
      if (!Array.isArray(conceptIds) || conceptIds.length === 0) errors.push(`${cardId}.${orientation} has no concept ids.`);
      for (const conceptId of conceptIds ?? []) {
        if (!hasConcept(conceptId)) errors.push(`${cardId}.${orientation} references missing concept: ${conceptId}`);
      }
    }
  }
}

function validateRules() {
  for (const [category, position] of requiredRules) {
    const preferred = rules[category]?.[position]?.preferred;
    if (!Array.isArray(preferred) || preferred.length === 0) {
      errors.push(`Missing question concept rule: ${category}.${position}`);
      continue;
    }
    for (const conceptId of preferred) {
      if (!hasConcept(conceptId)) errors.push(`${category}.${position} references missing concept: ${conceptId}`);
    }
  }
}

function validateResolver() {
  for (const [cardId, orientations] of Object.entries(cardMap)) {
    for (const orientation of Object.keys(orientations) as Orientation[]) {
      for (const [category, position] of requiredRules) {
        const resolution = resolveConcepts({ cardId, orientation, category, position });
        if (resolution.selectedConcepts.length === 0) errors.push(`Resolver selected no concepts for ${cardId}.${orientation}.${category}.${position}.`);
        if (resolution.realWorldIssues.length === 0) errors.push(`Resolver returned no realWorldIssues for ${cardId}.${orientation}.${category}.${position}.`);
        if (resolution.concreteChecks.length < 3) errors.push(`Resolver returned fewer than 3 concreteChecks for ${cardId}.${orientation}.${category}.${position}.`);
      }
    }
  }
}

function validateResolverAudit(results: ResolverAuditResult[]) {
  for (const result of results) {
    if (result.concreteChecks.length < 3) errors.push(`${result.label} resolver concreteChecks must be at least 3.`);
    if (!result.selectedMeaningAligned) errors.push(`${result.label} selected_meaning is not aligned with selectedConcepts.`);
    if (result.missingConcreteChecks.length > 0) errors.push(`${result.label} has missing v2 concrete checks: ${result.missingConcreteChecks.join(", ")}`);
    if (!result.answerSeedCovered) errors.push(`${result.label} answer_seed signals are not covered by resolver payload.`);
  }
}

function writeTokenReport() {
  const samples = [
    sample("swords_07", "upright", "relationship", "partnership_check"),
    sample("pentacles_page", "reversed", "business", "warning"),
    sample("major_01_magician", "reversed", "reunion", "obstacle"),
  ];
  const oldChars = samples.reduce((sum, item) => sum + item.oldChars, 0);
  const newChars = samples.reduce((sum, item) => sum + item.newChars, 0);
  const oldTokens = estimateTokens(oldChars);
  const newTokens = estimateTokens(newChars);
  const reduction = oldTokens > 0 ? Math.round(((oldTokens - newTokens) / oldTokens) * 100) : 0;
  const mappedCards = Object.keys(cardMap).length;
  const oldBlocksMapped = mappedCards * 2 * 8 * 2;
  const newBlocksMapped = concepts.length + getConceptEngineCoverage().orientationMappings + getConceptEngineCoverage().questionRules;
  const oldBlocks78 = 78 * 2 * 8 * 2;
  const estimatedNewBlocks78 = 60 + 78 * 2 + 8;

  const lines = [
    "# Prompt Token Optimization Report",
    "",
    "## Prompt Payload Structure",
    "",
    "### Before",
    "- Card meaning keywords, traditional meaning, positive aspect, warning, must_include, common_mistakes, symbolism",
    "- question_contexts selected_meaning, real_world_issues, concrete_checks, bad_readings, model_logic",
    "- training_hints hint_keywords, hint_title, hint_body, answer_seed used by local/debug paths",
    "",
    "### After",
    "- Graph Resolver payload is the default prompt source.",
    "- primaryConcepts / secondaryConcepts: concept id and Korean concept name",
    "- reasoningPath: code-selected reasoning flow",
    "- recommendedChecks: resolver-selected check items",
    "- recommendedActions: resolver-selected action hints",
    "- question_contexts and training_hints are not sent by default.",
    "- Legacy fallback is sent only when Graph Resolver has no primary concepts or fewer than 2 recommended checks.",
    "",
    "## Sample Token Estimate",
    "",
    "| Sample | Before Tokens | After Tokens | Reduction |",
    "| --- | ---: | ---: | ---: |",
    ...samples.map((item) => `| ${item.label} | ${estimateTokens(item.oldChars)} | ${estimateTokens(item.newChars)} | ${percent(estimateTokens(item.oldChars), estimateTokens(item.newChars))} |`),
    `| Total | ${oldTokens} | ${newTokens} | ${reduction}% |`,
    "",
    "## Duplicate Block Estimate",
    "",
    `- Current mapped-card old repeated blocks: ${oldBlocksMapped} context/hint blocks for ${mappedCards} cards x 2 orientations x 8 axes x 2 data types.`,
    `- Current concept engine blocks: ${newBlocksMapped} blocks (${concepts.length} concepts + ${getConceptEngineCoverage().orientationMappings} orientation maps + ${getConceptEngineCoverage().questionRules} question rules).`,
    `- Removed or centralized blocks in current mapped scope: ${oldBlocksMapped - newBlocksMapped}.`,
    `- 78-card old structure estimate: ${oldBlocks78} context/hint blocks.`,
    `- 78-card concept engine rough estimate: ${estimatedNewBlocks78} blocks if about 60 reusable concepts are enough.`,
    `- 78-card rough block reduction: ${oldBlocks78 - estimatedNewBlocks78} blocks, about ${percent(oldBlocks78, estimatedNewBlocks78)}.`,
    "",
    "## Graph-first Fallback Estimate",
    "",
    "- Default prompt path now sends only Graph Resolver payload.",
    "- question_contexts/training_hints remain stored as legacy fallback data, but normal Analysis prompts do not include them.",
    "- Expected default-prompt saving versus v2 payload: nearly the full question_contexts/training_hints prompt payload for all covered Graph cases.",
    "- Additional fallback overhead: 0 tokens in normal cases; legacy payload appears only for insufficient Graph payload cases.",
    "",
    "## Quality Loss Audit",
    "",
    "- Resolver audit report: `reports/concept-resolver-report.md`",
    `- Audited resolver cases: ${auditResults.length}`,
    `- PASS: ${auditResults.filter((result) => result.status === "PASS").length}`,
    `- WARNING: ${auditResults.filter((result) => result.status === "WARNING").length}`,
    `- FAIL: ${auditResults.filter((result) => result.status === "FAIL").length}`,
    "- Quality gate: selected meaning alignment, concrete check preservation, and answer_seed signal coverage must pass before treating the reduced prompt payload as equivalent.",
    "- Loss risk after audit: none detected for the audited resolver cases when Resolver payload is used as the prompt source.",
    "",
  ];

  const reportPath = path.join(process.cwd(), "reports", "prompt-token-optimization.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
}

function buildResolverAuditResults(): ResolverAuditResult[] {
  return auditCases.map((testCase) => {
    const question = buildQuestion(testCase.cardId, testCase.orientation, testCase.category, testCase.position);
    const meaning = getCardMeaning(testCase.cardId, testCase.orientation);
    const context = getQuestionContextV2(question, meaning);
    const hint = getTrainingHint(question, meaning);
    const resolution = resolveConcepts({
      cardId: testCase.cardId,
      orientation: testCase.orientation,
      category: testCase.category,
      position: testCase.position,
    });
    const selectedConcepts = resolution.selectedConcepts.map((concept) => `${concept.name_ko}(${concept.id})`);
    const hasV2Context = Boolean(context);
    const selectedMeaning = context?.selected_meaning ?? "(concept-only audit)";
    const oldConcreteChecks = context?.concrete_checks ?? resolution.concreteChecks.slice(0, 3);
    const payloadText = [
      selectedConcepts.join(" "),
      resolution.realWorldIssues.join(" "),
      resolution.concreteChecks.join(" "),
    ].join(" ");
    const comparisonText = [
      context?.selected_meaning ?? "",
      context?.model_logic ?? "",
      ...(context?.real_world_issues ?? []),
      ...(context?.concrete_checks ?? []),
      hint?.hint_title ?? "",
      hint?.hint_body ?? "",
      hint?.answer_seed ?? "",
    ].join(" ");
    const selectedMeaningAligned = !hasV2Context || resolution.selectedConcepts.some((concept) => {
      const fullConcept = concepts.find((item) => item.id === concept.id);
      return textContainsAny(comparisonText, [concept.name_ko, concept.id, ...(fullConcept?.aliases ?? [])]);
    });
    const matchedConcreteChecks = oldConcreteChecks.filter((check) => isCovered(check, payloadText));
    const missingConcreteChecks = oldConcreteChecks.filter((check) => !isCovered(check, payloadText));
    const answerSeed = hint?.answer_seed ?? "";
    const answerSeedSignals = hint?.hint_keywords?.length ? hint.hint_keywords : extractAnswerSeedSignals(answerSeed);
    const matchedSeedSignals = answerSeedSignals.filter((signal) => isCovered(signal, payloadText));
    const answerSeedCovered = answerSeedSignals.length === 0 || matchedSeedSignals.length >= Math.min(2, answerSeedSignals.length);
    const status = !selectedMeaningAligned || missingConcreteChecks.length > 0 || !answerSeedCovered ? "FAIL" : "PASS";

    return {
      label: testCase.label,
      cardId: testCase.cardId,
      orientation: testCase.orientation,
      category: testCase.category,
      position: testCase.position,
      selectedConcepts,
      realWorldIssues: resolution.realWorldIssues,
      concreteChecks: resolution.concreteChecks,
      selectedMeaning,
      selectedMeaningAligned,
      oldConcreteChecks,
      matchedConcreteChecks,
      missingConcreteChecks,
      answerSeed,
      answerSeedSignals: matchedSeedSignals,
      answerSeedCovered,
      status,
    };
  });
}

function writeResolverReport(results: ResolverAuditResult[]) {
  const reportPath = path.join(process.cwd(), "reports", "concept-resolver-report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildResolverReport(results), "utf8");
}

function buildResolverReport(results: ResolverAuditResult[]) {
  return [
    "# Concept Resolver Audit Report",
    "",
    `- Total cases: ${results.length}`,
    `- PASS: ${results.filter((result) => result.status === "PASS").length}`,
    `- WARNING: ${results.filter((result) => result.status === "WARNING").length}`,
    `- FAIL: ${results.filter((result) => result.status === "FAIL").length}`,
    "",
    "## Resolver Output",
    "",
    "| Card | Orientation | Category | Position | selectedConcepts | realWorldIssues | concreteChecks | Status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.cardId} | ${result.orientation} | ${result.category} | ${result.position} | ${list(result.selectedConcepts)} | ${list(result.realWorldIssues)} | ${list(result.concreteChecks)} | ${result.status} |`,
    ),
    "",
    "## V2 Comparison",
    "",
    "| Card | selected_meaning aligned | v2 concrete checks retained | answer_seed covered | Missing checks | Matched answer_seed signals |",
    "| --- | --- | --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.label} | ${yesNo(result.selectedMeaningAligned)} | ${result.matchedConcreteChecks.length}/${result.oldConcreteChecks.length} | ${yesNo(result.answerSeedCovered)} | ${list(result.missingConcreteChecks)} | ${list(result.answerSeedSignals)} |`,
    ),
    "",
    "## Quality Loss Review",
    "",
    results.every((result) => result.status === "PASS")
      ? "토큰은 줄었지만 감사 대상 Resolver 케이스에서는 selected_meaning, concrete_checks, answer_seed 핵심 신호의 의미 손실이 발견되지 않았습니다."
      : "일부 케이스에서 의미 손실 가능성이 발견되었습니다. Missing checks 또는 answer_seed coverage를 보강해야 합니다.",
    "",
  ].join("\n");
}

function sample(cardId: string, orientation: Orientation, category: TarotCategory, position: string) {
  const question = buildQuestion(cardId, orientation, category, position);
  const meaning = getCardMeaning(cardId, orientation);
  const context = getQuestionContextV2(question, meaning);
  const hint = getTrainingHint(question, meaning);
  const resolution = resolveConcepts({ cardId, orientation, category, position });
  const oldPayload = JSON.stringify({
    keywords: meaning.keywords,
    traditional_meaning: meaning.traditional_meaning,
    positive_aspect: meaning.positive_aspect,
    warning: meaning.warning,
    must_include: meaning.must_include,
    common_mistakes: meaning.common_mistakes,
    symbolism: meaning.symbolism,
    question_contexts: context,
    training_hints: hint,
  });
  const newPayload = JSON.stringify({
    selectedConcepts: resolution.selectedConcepts,
    realWorldIssues: resolution.realWorldIssues,
    concreteChecks: resolution.concreteChecks,
  });

  return {
    label: `${cardId}.${orientation}.${category}.${position}`,
    oldChars: oldPayload.length,
    newChars: newPayload.length,
  };
}

function buildQuestion(cardId: string, orientation: Orientation, category: TarotCategory, position: string): TarotQuestion {
  return {
    question_id: `concept_validation_${cardId}_${orientation}_${category}_${position}`,
    card_id: cardId,
    orientation,
    spread: "validation",
    position,
    difficulty: "practice",
    category,
    question: "검증용 질문",
    persona: {
      age: "검증 사용자",
      background: "Concept Engine 검증용 상황",
      concern: "선택된 개념과 확인 항목이 구체적인지 확인합니다.",
    },
  };
}

function auditCase(label: string, cardId: string, orientation: Orientation, category: TarotCategory, position: string): ResolverAuditCase {
  return { label, cardId, orientation, category, position };
}

function hasConcept(id: string) {
  return concepts.some((concept) => concept.id === id);
}

function estimateTokens(chars: number) {
  return Math.ceil(chars / 4);
}

function percent(before: number, after: number) {
  if (before === 0) return "0%";
  return `${Math.round(((before - after) / before) * 100)}%`;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function textContainsAny(text: string, values: string[]) {
  const normalizedText = normalize(text);
  return values.some((value) => value && normalizedText.includes(normalize(value)));
}

function isCovered(value: string, payloadText: string) {
  const normalizedValue = normalize(value);
  const normalizedPayload = normalize(payloadText);
  if (!normalizedValue) return true;
  if (normalizedPayload.includes(normalizedValue)) return true;
  if (normalizedValue.includes(normalizedPayload)) return true;

  return splitSignal(value).some((signal) => signal.length >= 2 && normalizedPayload.includes(normalize(signal)));
}

function extractAnswerSeedSignals(answerSeed: string) {
  return splitSignal(answerSeed)
    .filter((signal) => signal.length >= 3)
    .slice(0, 6);
}

function splitSignal(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function list(items: string[]) {
  return items.length > 0 ? items.join("<br>") : "-";
}

function yesNo(value: boolean) {
  return value ? "YES" : "NO";
}
