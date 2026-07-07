import fs from "node:fs";
import path from "node:path";
import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import { resolveConceptGraph } from "../src/lib/tarot/conceptGraphResolver";
import { getTrainingHint } from "../src/lib/tarot/trainingHints";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import type { EvaluationResult, TarotQuestion } from "../src/types/tarot";

type QualityStatus = "PASS" | "WARNING" | "FAIL";

type QualityCase = {
  label: string;
  card_id: string;
  orientation: TarotQuestion["orientation"];
  category: TarotQuestion["category"];
  position: string;
  question: string;
};

type CaseResult = {
  label: string;
  card_id: string;
  status: QualityStatus;
  warnings: string[];
  failures: string[];
  checks: {
    selectedMeaning: QualityStatus;
    realWorldIssue: QualityStatus;
    concreteChecks: QualityStatus;
    hint: QualityStatus;
    feedback: QualityStatus;
    repetition: QualityStatus;
    sectionRoles: QualityStatus;
    modelAnswer: QualityStatus;
    wrongNote: QualityStatus;
    answerSeed: QualityStatus;
  };
};

const cases: QualityCase[] = [
  buildCase("마법사 역방향 / 재회 장애물", "major_01_magician", "reversed", "reunion", "obstacle", "재회를 어렵게 만드는 흐름은 무엇인가요?"),
  buildCase("세계 정방향 / 사업 조언", "major_21_world", "upright", "business", "advice", "사업에서 다음 단계로 넘어가려면 무엇을 먼저 정리해야 하나요?"),
  buildCase("소드 7 정방향 / 관계 확인 조건", "swords_07", "upright", "relationship", "partnership_check", "이 관계에서 반드시 확인해야 할 조건은 무엇인가요?"),
  buildCase("펜타클 페이지 역방향 / 사업 위험", "pentacles_page", "reversed", "business", "warning", "사업 확장에서 가장 위험한 부분은 무엇인가요?"),
  buildCase("컵 5 정방향 / 연애 현재", "cups_05", "upright", "love", "current", "현재 연애 흐름에서 가장 크게 작용하는 감정은 무엇인가요?"),
  buildCase("완드 10 정방향 / 건강 경고", "wands_10", "upright", "health", "warning", "건강에서 지금 조심해야 할 신호는 무엇인가요?"),
  buildCase("소드 4 역방향 / 연애 조언", "swords_04", "reversed", "love", "advice", "관계를 다시 움직이려면 어떤 태도가 필요한가요?"),
  buildCase("펜타클 3 정방향 / 인간관계 확인", "pentacles_03", "upright", "relationship", "partnership_check", "협력 관계에서 확인해야 할 조건은 무엇인가요?"),
  buildCase("연인 역방향 / 재회 조언", "major_06_lovers", "reversed", "reunion", "advice", "재회를 원한다면 어떤 선택 기준을 먼저 맞춰야 하나요?"),
  buildCase("여사제 정방향 / 연애 현재", "major_02_high_priestess", "upright", "love", "current", "현재 관계에서 겉으로 드러나지 않은 흐름은 무엇인가요?"),
];

const forbiddenFeedbackSentences = [
  "질문 위치에 맞게 적용해야 합니다.",
  "질문의 분야에 맞춰 읽어야 합니다.",
  "결과를 단정하지 않아야 합니다.",
  "카드의 정통 의미를 벗어나지 않아야 합니다.",
  "가능성과 경고를 함께 담고 있습니다.",
  "선택 기준, 운영 방식, 리스크에 맞춰 읽습니다.",
  "현실적으로 읽어야 합니다.",
  "구체적으로 살펴봐야 합니다.",
];

const abstractRealWorldIssues = new Set(["위험 요소", "준비 부족", "현실적으로 봐야 함", "주의 필요", "상황 확인", "문제"]);
const abstractChecks = new Set(["노력", "주의", "관계", "상황", "마음", "흐름", "문제", "확인"]);
const abstractHintPhrases = ["질문에 맞게 적용하세요", "질문 위치에 맞게", "질문의 분야에 맞춰", "현실적으로 읽어야"];

const results = cases.map(runCase);
printTable(results);
printFailures(results);
writeReport(results);

const failCount = results.filter((result) => result.status === "FAIL").length;
if (failCount > 0) {
  process.exit(1);
}

function buildCase(
  label: string,
  card_id: string,
  orientation: TarotQuestion["orientation"],
  category: TarotQuestion["category"],
  position: string,
  question: string,
): QualityCase {
  return { label, card_id, orientation, category, position, question };
}

function runCase(testCase: QualityCase): CaseResult {
  const tarotQuestion = buildQuestion(testCase);
  const card = getCard(testCase.card_id);
  const meaning = getCardMeaning(testCase.card_id, testCase.orientation);
  const graph = resolveConceptGraph({
    cardId: testCase.card_id,
    orientation: testCase.orientation,
    category: testCase.category,
    position: testCase.position,
  });
  const hint = getTrainingHint(tarotQuestion, meaning);
  const graphSelectedMeaning = graph.primaryConcepts.map((concept) => concept.name_ko).join(" + ");
  const analysis = {
    selectedMeaning: graphSelectedMeaning,
    realWorldIssue: graph.realWorldIssues[0] ?? `${graph.reasoningPath.slice(0, 3).join(" -> ")} 흐름을 확인해야 합니다.`,
    concreteChecks: graph.recommendedChecks.slice(0, 5),
  };
  const feedback = evaluateWithMock({
    card,
    meaning,
    question: tarotQuestion,
    userAnswer: `${analysis.selectedMeaning} / ${analysis.concreteChecks.slice(0, 3).join(", ")}`,
  });
  const result: CaseResult = {
    label: testCase.label,
    card_id: testCase.card_id,
    status: "PASS",
    warnings: [],
    failures: [],
    checks: {
      selectedMeaning: "PASS",
      realWorldIssue: "PASS",
      concreteChecks: "PASS",
      hint: "PASS",
      feedback: "PASS",
      repetition: "PASS",
      sectionRoles: "PASS",
      modelAnswer: "PASS",
      wrongNote: "PASS",
      answerSeed: "PASS",
    },
  };

  if (graph.primaryConcepts.length === 0) {
    fail(result, "selectedMeaning", "Graph Resolver primaryConcepts가 비었습니다.");
  }
  if (graph.recommendedChecks.length < 3) {
    fail(result, "concreteChecks", `Graph Resolver recommendedChecks가 3개 미만입니다: ${graph.recommendedChecks.length}`);
  }
  if (!meaningMatches(analysis.selectedMeaning, graphSelectedMeaning)) {
    fail(result, "selectedMeaning", `selectedMeaning이 Graph primaryConcepts와 맞지 않습니다: ${analysis.selectedMeaning}`);
  }

  validateRealWorldIssue(result, analysis.realWorldIssue);
  validateConcreteChecks(result, analysis.concreteChecks);
  validateFeedback(result, feedback);
  validateRepetition(result, feedback, analysis.selectedMeaning);
  validateSectionRoles(result, feedback);
  validateModelAnswer(result, feedback);
  validateWrongNote(result, feedback, card.meta.name_ko);
  validateHint(result, hint);
  validateAnswerSeed(result, hint);

  if (result.failures.length > 0) result.status = "FAIL";
  else if (result.warnings.length > 0) result.status = "WARNING";

  return result;
}

function buildQuestion(testCase: QualityCase): TarotQuestion {
  return {
    question_id: `quality_${testCase.card_id}_${testCase.orientation}_${testCase.category}_${testCase.position}`,
    card_id: testCase.card_id,
    orientation: testCase.orientation,
    spread: "quality",
    position: testCase.position,
    difficulty: "practice",
    category: testCase.category,
    question: testCase.question,
    persona: {
      age: "테스트 내담자",
      background: "품질 검증을 위한 대표 상황입니다.",
      concern: "카드 의미가 질문 맥락과 실제 확인 항목으로 연결되는지 확인합니다.",
    },
  };
}

function validateRealWorldIssue(result: CaseResult, issue: string) {
  const normalized = normalize(issue);
  if (!issue.trim()) fail(result, "realWorldIssue", "realWorldIssue가 비어 있습니다.");
  if (issue.trim().length <= 20) warn(result, "realWorldIssue가 20자 이하입니다.");
  if (abstractRealWorldIssues.has(normalized)) fail(result, "realWorldIssue", `realWorldIssue가 추상어입니다: ${issue}`);
}

function validateConcreteChecks(result: CaseResult, checks: string[]) {
  if (checks.length < 2) fail(result, "concreteChecks", "concreteChecks가 2개 미만입니다.");

  for (const check of checks) {
    const normalized = normalize(check);
    if (abstractChecks.has(normalized) || check.trim().length <= 2) {
      fail(result, "concreteChecks", `추상 concreteCheck 발견: ${check}`);
    }
  }
}

function validateFeedback(result: CaseResult, feedback: EvaluationResult) {
  const text = feedbackText(feedback);
  for (const sentence of forbiddenFeedbackSentences) {
    if (text.includes(sentence)) fail(result, "feedback", `금지 문장 발견: ${sentence}`);
  }
}

function validateRepetition(result: CaseResult, feedback: EvaluationResult, selectedMeaning: string | undefined) {
  const text = feedbackText(feedback);
  const phrases = selectedMeaning ? [selectedMeaning, ...splitMeaningPhrases(selectedMeaning)] : [];

  for (const phrase of new Set(phrases)) {
    const count = countOccurrences(text, phrase);
    if (count >= 3) {
      fail(result, "repetition", `같은 키워드 3회 이상 반복: ${phrase} (${count}회)`);
      return;
    }
  }
}

function validateSectionRoles(result: CaseResult, feedback: EvaluationResult) {
  const sections = [feedback.traditional_correction, feedback.sample_answer, feedback.model_answer, feedback.wrong_note];
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const similarity = jaccardSimilarity(sections[i], sections[j]);
      if (similarity >= 0.72) {
        fail(result, "sectionRoles", `섹션 유사도 과다: ${sectionName(i)} / ${sectionName(j)} (${similarity.toFixed(2)})`);
      }
    }
  }
}

function validateModelAnswer(result: CaseResult, feedback: EvaluationResult) {
  const similarity = jaccardSimilarity(feedback.traditional_correction, feedback.model_answer);
  if (similarity >= 0.68) fail(result, "modelAnswer", `모범답안이 정통해설과 너무 유사합니다 (${similarity.toFixed(2)}).`);
}

function validateWrongNote(result: CaseResult, feedback: EvaluationResult, cardName: string) {
  const wrongNote = feedback.wrong_note;
  if (wrongNote.includes(`${cardName}은`) || wrongNote.includes(`${cardName} 정방향`) || wrongNote.includes(`${cardName} 역방향`)) {
    fail(result, "wrongNote", "오답노트에 카드 설명이 들어 있습니다.");
  }
}

function validateHint(result: CaseResult, hint: ReturnType<typeof getTrainingHint>) {
  if (!hint) return;
  if (hint.hint_body.trim().length <= 50) warn(result, "hint_body가 50자 이하입니다.");
  for (const phrase of abstractHintPhrases) {
    if (hint.hint_body.includes(phrase)) fail(result, "hint", `힌트 추상 문장 발견: ${phrase}`);
  }
}

function validateAnswerSeed(result: CaseResult, hint: ReturnType<typeof getTrainingHint>) {
  if (!hint?.answer_seed?.trim()) warn(result, "answer_seed가 비어 있습니다.");
}

function fail(result: CaseResult, key: keyof CaseResult["checks"], message: string) {
  result.checks[key] = "FAIL";
  result.failures.push(message);
}

function warn(result: CaseResult, message: string) {
  result.warnings.push(message);
}

function meaningMatches(actual: string, expected: string) {
  return normalize(actual) === normalize(expected) || normalize(actual).includes(normalize(expected)) || normalize(expected).includes(normalize(actual));
}

function feedbackText(feedback: EvaluationResult) {
  return [
    feedback.traditional_correction,
    feedback.sample_answer,
    feedback.model_answer,
    feedback.wrong_note,
    ...feedback.strengths,
    ...feedback.missing_points,
    ...feedback.differences,
    ...feedback.missed_key_points,
  ].join("\n");
}

function splitMeaningPhrases(selectedMeaning: string) {
  const axisLabels = new Set(["사업 위험", "사업 조언", "연애 현재", "연애 조언", "재회 장애물", "재회 조언", "인간관계 확인 조건", "건강 경고"]);
  return selectedMeaning
    .split(/에서의|,|\/| 및 | 그리고 |와 |과 /)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= 4 && !axisLabels.has(phrase));
}

function countOccurrences(text: string, phrase: string) {
  if (!phrase) return 0;
  return text.split(phrase).length - 1;
}

function jaccardSimilarity(left: string, right: string) {
  const leftWords = new Set(words(left));
  const rightWords = new Set(words(right));
  if (leftWords.size === 0 && rightWords.size === 0) return 1;

  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return intersection / union;
}

function words(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map(normalize)
    .filter((word) => word.length >= 2);
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sectionName(index: number) {
  return ["정통해설", "상담예시", "모범답안", "오답노트"][index] ?? `section-${index}`;
}

function printTable(caseResults: CaseResult[]) {
  const rows = caseResults.map((result) => ({
    Card: result.label,
    selectedMeaning: result.checks.selectedMeaning,
    concreteChecks: result.checks.concreteChecks,
    hint: result.checks.hint,
    feedback: result.checks.feedback,
    PASS: result.status,
  }));
  console.table(rows);
}

function printFailures(caseResults: CaseResult[]) {
  const failed = caseResults.filter((result) => result.failures.length > 0);
  if (failed.length === 0) return;

  console.log("\nFAIL");
  for (const result of failed) {
    console.log(`\n${result.label}`);
    for (const failure of result.failures) {
      console.log(`- ${failure}`);
    }
  }
}

function writeReport(caseResults: CaseResult[]) {
  const reportPath = path.join(process.cwd(), "reports", "ai-quality-report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(caseResults), "utf8");
  console.log(`\nReport written: ${reportPath}`);
}

function buildReport(caseResults: CaseResult[]) {
  const passCount = caseResults.filter((result) => result.status === "PASS").length;
  const warningCount = caseResults.filter((result) => result.status === "WARNING").length;
  const failCount = caseResults.filter((result) => result.status === "FAIL").length;

  return [
    "# AI Quality Report",
    "",
    `- Total cards: ${caseResults.length}`,
    `- PASS: ${passCount}`,
    `- WARNING: ${warningCount}`,
    `- FAIL: ${failCount}`,
    "",
    "## Failed Cards",
    "",
    ...buildFailureReport(caseResults),
    "",
    "## Card Details",
    "",
    "| Card | Status | Warnings | Failures |",
    "| --- | --- | --- | --- |",
    ...caseResults.map((result) => `| ${result.label} | ${result.status} | ${joinReportItems(result.warnings)} | ${joinReportItems(result.failures)} |`),
    "",
  ].join("\n");
}

function buildFailureReport(caseResults: CaseResult[]) {
  const failed = caseResults.filter((result) => result.failures.length > 0);
  if (failed.length === 0) return ["No failed cards."];

  return failed.flatMap((result) => [`### ${result.label}`, "", ...result.failures.map((failure) => `- ${failure}`), ""]);
}

function joinReportItems(items: string[]) {
  return items.length > 0 ? items.join("<br>") : "-";
}
