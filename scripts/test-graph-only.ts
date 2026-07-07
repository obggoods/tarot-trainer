import fs from "node:fs";
import path from "node:path";
import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import type { AnalysisResult } from "../src/lib/ai/types";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import { resolveConceptGraph, type ConceptGraphResolution } from "../src/lib/tarot/conceptGraphResolver";
import { getTarotConcept } from "../src/lib/tarot/conceptResolver";
import { buildDebugAnalysisResult } from "../src/lib/tarot/trainingHints";
import { matchSemanticConcepts, type SemanticRequirement } from "../src/lib/testing/semanticMatcher";
import type { EvaluationResult, TarotQuestion } from "../src/types/tarot";

type ExperimentCase = {
  label: string;
  card_id: string;
  orientation: TarotQuestion["orientation"];
  category: TarotQuestion["category"];
  position: string;
  question: string;
  expectedConceptIds: string[];
  expectedChecks: string[];
};

type VariantResult = {
  analysis: AnalysisResult;
  feedback: EvaluationResult;
  selectedConceptIds: string[];
  concreteCheckCount: number;
  bannedPhraseHits: string[];
  regressionPass: boolean;
  sectionSimilarity: number;
  matchedConcepts: number;
  matchedChecks: number;
};

type ExperimentResult = {
  testCase: ExperimentCase;
  graph: ConceptGraphResolution;
  variantA: VariantResult;
  variantB: VariantResult;
  conceptRetention: number;
  graphOnlyPass: boolean;
  failures: string[];
};

const bannedPhrases = [
  "질문 위치에 맞게 적용해야 합니다.",
  "질문의 분야에 맞춰 읽어야 합니다.",
  "결과를 단정하지 않아야 합니다.",
  "카드의 정통 의미를 벗어나지 않아야 합니다.",
  "가능성과 경고를 함께 담고 있습니다.",
  "선택 기준, 운영 방식, 리스크에 맞춰 읽습니다.",
  "현실적으로 읽어야 합니다.",
  "구체적으로 살펴봐야 합니다.",
];

const cases: ExperimentCase[] = [
  testCase("마법사 역방향 / 재회 장애물", "major_01_magician", "reversed", "reunion", "obstacle", "재회를 어렵게 만드는 흐름은 무엇인가?", ["responsibility", "execution"], ["실제 행동 기록", "다음 일정", "담당자"]),
  testCase("세계 정방향 / 사업 조언", "major_21_world", "upright", "business", "advice", "사업에서 다음 단계로 가려면 무엇을 정리해야 하나?", ["operation_system", "decision_criteria"], ["업무 순서", "우선순위", "검증 가능한 결과"]),
  testCase("연인 역방향 / 재회 조언", "major_06_lovers", "reversed", "reunion", "advice", "재회를 원한다면 어떤 선택 기준을 먼저 맞춰야 하나?", ["boundary", "decision_criteria"], ["거절해야 할 범위", "연락 빈도", "감정 충동 한계"]),
  testCase("소드 7 정방향 / 파트너십 확인", "swords_07", "upright", "relationship", "partnership_check", "이 관계에서 반드시 확인해야 할 조건은 무엇인가?", ["responsibility", "information_asymmetry"], ["역할 범위", "결정 권한", "문제 발생 시 책임자"]),
  testCase("소드 8 정방향 / 진로 심리적 제한", "swords_08", "upright", "career", "advice", "진로에서 나를 묶는 심리적 제한은 무엇이고 무엇부터 봐야 하나?", ["mental_restriction", "boundary"], ["실제 제한 조건", "스스로 금지한 선택지", "작게 시도할 행동"]),
  testCase("펜타클 페이지 역방향 / 사업 위험", "pentacles_page", "reversed", "business", "warning", "사업 확장에서 가장 위험한 부분은 무엇인가?", ["preparation", "operation_system"], ["초기 비용", "월고정비", "운영 체계"]),
  testCase("펜타클 8 정방향 / 직업 훈련", "pentacles_08", "upright", "career", "advice", "직업에서 실력을 올리려면 어떤 반복 훈련이 필요한가?", ["skill_building", "craftsmanship"], ["훈련 시간", "기초 기술", "피드백 방식"]),
  testCase("컵 5 정방향 / 연애 상실 집중", "cups_05", "upright", "love", "current", "현재 연애 흐름에서 상실감이 어디에 고정되어 있나?", ["grief_focus", "remaining_possibility"], ["반복해서 떠올리는 장면", "이미 잃은 것", "상대의 반응"]),
  testCase("컵 7 정방향 / 연애 환상과 선택 혼란", "cups_07", "upright", "love", "current", "이 연애에서 기대와 현실 확인이 엇갈리는 부분은 무엇인가?", ["fantasy_projection", "decision_criteria"], ["확인된 사실", "상상과 실제 행동의 차이", "선택 기준"]),
  testCase("완드 8 정방향 / 직업 빠른 진행", "wands_08", "upright", "career", "advice", "빠른 진행을 관리하려면 무엇을 먼저 정리해야 하나?", ["rapid_progress", "execution"], ["마감 일정", "응답 기한", "실행 순서"]),
];

const results = cases.map(runExperiment);
printSummary(results);
writeReport(results);

if (results.some((result) => !result.graphOnlyPass)) {
  process.exit(1);
}

function testCase(
  label: string,
  card_id: string,
  orientation: TarotQuestion["orientation"],
  category: TarotQuestion["category"],
  position: string,
  question: string,
  expectedConceptIds: string[],
  expectedChecks: string[],
): ExperimentCase {
  return { label, card_id, orientation, category, position, question, expectedConceptIds, expectedChecks };
}

function runExperiment(testCaseItem: ExperimentCase): ExperimentResult {
  const question = buildQuestion(testCaseItem);
  const card = getCard(testCaseItem.card_id);
  const meaning = getCardMeaning(testCaseItem.card_id, testCaseItem.orientation);
  const graph = resolveConceptGraph({
    cardId: testCaseItem.card_id,
    orientation: testCaseItem.orientation,
    category: testCaseItem.category,
    position: testCaseItem.position,
  });
  const variantAAnalysis = buildDebugAnalysisResult({ question, meaning });
  const variantAFeedback = evaluateWithMock({
    card,
    meaning,
    question,
    userAnswer: variantAAnalysis.clientFacingAdvice,
  });
  const variantBAnalysis = buildGraphOnlyAnalysis(question, meaning.traditional_meaning, graph);
  const variantBFeedback = buildGraphOnlyFeedback(question, card.meta.name_ko, graph, variantBAnalysis);
  const variantA = buildVariantResult(variantAAnalysis, variantAFeedback, graph, testCaseItem);
  const variantB = buildVariantResult(variantBAnalysis, variantBFeedback, graph, testCaseItem);
  const conceptRetention = retention(variantA.selectedConceptIds, variantB.selectedConceptIds);
  const failures = buildGraphOnlyFailures(variantB, conceptRetention);

  return {
    testCase: testCaseItem,
    graph,
    variantA,
    variantB,
    conceptRetention,
    graphOnlyPass: failures.length === 0,
    failures,
  };
}

function buildGraphOnlyAnalysis(question: TarotQuestion, traditionalMeaning: string, graph: ConceptGraphResolution): AnalysisResult {
  const primaryNames = graph.primaryConcepts.map((concept) => concept.name_ko);
  const secondaryNames = graph.secondaryConcepts.map((concept) => concept.name_ko);
  const selectedMeaning = primaryNames.join(" + ");
  const checks = graph.recommendedChecks.slice(0, 5);
  const firstPath = graph.reasoningPath.slice(0, 4).join(" -> ");
  const actions = graph.recommendedActions.slice(0, 3);
  const realWorldIssue = `${primaryNames[0]}이 ${secondaryNames[0] ?? graph.reasoningPath[1] ?? "다음 판단"}로 이어져 ${checks.slice(0, 2).join(", ")}를 확인해야 하는 장면입니다.`;
  const modelLogic = `${firstPath} 흐름으로 읽고, 답변에는 ${checks.slice(0, 3).join(", ")}를 확인 항목으로 넣습니다.`;

  return {
    questionFocus: question.question,
    questionArea: `${question.category} / ${question.position}`,
    selectedMeaning,
    reversalMode: question.orientation === "reversed" ? "역방향 보정" : "",
    selectedReason: modelLogic,
    realWorldIssue,
    specificRisk: `${checks[0] ?? selectedMeaning}가 빠지면 카드 뜻은 맞아도 내담자가 실제로 무엇을 확인해야 하는지 모호해집니다.`,
    concreteChecks: checks,
    clientFacingAdvice: `${selectedMeaning}을 중심으로 보고, ${checks.slice(0, 3).join(", ")}를 먼저 확인하세요.`,
    whyUserAnswerIsInsufficient: `${selectedMeaning}을 실제 확인 항목으로 바꾸지 않으면 답변이 카드 설명에 머뭅니다.`,
    correctPoints: [`${selectedMeaning}을 핵심 개념으로 잡는 방향은 맞습니다.`],
    missingPoints: [`${checks.slice(0, 2).join(", ")}를 답변에 넣어야 합니다.`],
    incorrectPoints: [],
    thinkingGap: "개념 흐름을 실제 장면과 확인 항목으로 번역해야 합니다.",
    recommendedAddition: checks.slice(0, 3),
    commonMisreading: "카드 키워드만 반복하고 확인할 현실 조건을 말하지 않는 것",
    consultingDirection: `${actions.length > 0 ? actions.join(", ") : checks.slice(0, 2).join(", ")} 중심으로 다음 행동을 좁힙니다.`,
    traditionalSummary: traditionalMeaning,
    modelAnswerOutline: modelLogic,
    score: 78,
    grade: "partial",
    rubric: {
      traditionalMeaning: 4,
      questionApplication: 4,
      counselingExpression: 4,
      practicalApplication: 4,
      certaintyControl: 4,
    },
    avoid_topics: bannedPhrases,
    avoidTopics: bannedPhrases,
    selfCheck: {
      directlyAnswersQuestion: "YES",
      repeatsSameMeaning: "NO",
      onlyRepeatsCardDescription: "NO",
      selectsOneMeaning: "YES",
      realWorldIssueIsConcrete: "YES",
      specificRiskIsConcrete: "YES",
      hasAtLeastTwoConcreteChecks: checks.length >= 2 ? "YES" : "NO",
      correctsUserThinking: "YES",
    },
  };
}

function buildGraphOnlyFeedback(question: TarotQuestion, cardName: string, graph: ConceptGraphResolution, analysis: AnalysisResult): EvaluationResult {
  const checks = graph.recommendedChecks.slice(0, 5);
  const path = graph.reasoningPath.slice(0, 5);
  const actions = graph.recommendedActions.slice(0, 4);
  const selected = analysis.selectedMeaning;
  return {
    score: 82,
    grade: "correct",
    rubric: {
      traditionalMeaning: 4,
      questionApplication: 5,
      counselingExpression: 4,
      practicalApplication: 5,
      certaintyControl: 4,
    },
    interpretation_graph: {
      card: cardName,
      orientation: question.orientation,
      traditional_meanings: [selected, ...path].filter(Boolean).slice(0, 6),
      question_focus: question.position,
      selected_meanings: graph.primaryConcepts.map((concept) => concept.name_ko),
      rejected_meanings: graph.secondaryConcepts.slice(0, 2).map((concept) => ({
        meaning: concept.name_ko,
        reason: `${question.position}에서는 ${selected}을 먼저 선택해야 하므로 ${concept.name_ko}은 보조 의미로 둡니다.`,
      })),
      reasoning_bridge: `${cardName}의 정통 의미 중 ${selected}이 ${question.position}에 가장 직접적으로 연결됩니다. 그래서 ${path.join(" -> ")} 흐름으로 읽습니다.`,
      counseling_sentence: `내담자에게는 ${checks.slice(0, 2).join(", ")}를 먼저 확인하라고 말할 수 있습니다.`,
    },
    strengths: [`${selected}을 질문의 핵심 흐름으로 잡았습니다.`, `${checks.slice(0, 2).join(", ")}처럼 확인할 항목이 남아 있습니다.`],
    missing_points: checks.slice(0, 3).map((check) => `확인: ${check}`),
    traditional_correction: `${cardName}은 이 질문에서 ${selected}의 흐름을 보여줍니다. ${path.join(" -> ")} 순서로 보면 카드 의미가 실제 장면으로 좁혀집니다.`,
    sample_answer: `${analysis.realWorldIssue} 내담자에게는 ${checks.slice(0, 3).join(", ")}를 먼저 확인하라고 말할 수 있습니다.`,
    model_answer: `이 리딩은 ${selected}을 중심으로 봅니다. ${path.join(" -> ")} 흐름이므로, 답변에는 ${checks.slice(0, 3).join(", ")}를 넣고 다음 행동은 ${actions.slice(0, 2).join(", ") || "확인과 조정"}으로 좁히면 좋습니다.`,
    missed_key_points: checks.slice(0, 4),
    differences: [`카드 이름보다 ${checks.slice(0, 2).join(", ")}를 실제 확인 질문으로 바꾸는 부분이 중요합니다.`],
    wrong_note: `사고 과정의 핵심은 ${selected}을 바로 결론으로 쓰지 않고, ${path.slice(0, 3).join(" -> ")} 흐름을 따라 확인 항목을 만든다는 점입니다.`,
    next_reading_tip: `다음 답변에는 ${checks.slice(0, 2).join(", ")}를 먼저 넣으세요.`,
    promptVersion: "graph-only-experiment",
  };
}

function buildVariantResult(
  analysis: AnalysisResult,
  feedback: EvaluationResult,
  graph: ConceptGraphResolution,
  testCaseItem: ExperimentCase,
): VariantResult {
  const selectedConceptIds = graph.primaryConcepts.map((concept) => concept.id);
  const conceptMatches = matchSemanticConcepts(analysisAndFeedbackText(analysis, feedback), testCaseItem.expectedConceptIds.map(conceptRequirement));
  const checkMatches = matchSemanticConcepts(analysisAndFeedbackText(analysis, feedback), testCaseItem.expectedChecks.map((concept) => ({ concept })));
  const bannedPhraseHits = bannedPhrases.filter((phrase) => analysisAndFeedbackText(analysis, feedback).includes(phrase));

  return {
    analysis,
    feedback,
    selectedConceptIds,
    concreteCheckCount: analysis.concreteChecks.length,
    bannedPhraseHits,
    regressionPass:
      testCaseItem.expectedConceptIds.every((conceptId) => selectedConceptIds.includes(conceptId)) &&
      conceptMatches.filter((match) => match.matched).length >= Math.min(2, testCaseItem.expectedConceptIds.length) &&
      checkMatches.filter((match) => match.matched).length >= Math.min(2, testCaseItem.expectedChecks.length),
    sectionSimilarity: maxSectionSimilarity(feedback),
    matchedConcepts: conceptMatches.filter((match) => match.matched).length,
    matchedChecks: checkMatches.filter((match) => match.matched).length,
  };
}

function conceptRequirement(conceptId: string): SemanticRequirement {
  const concept = getTarotConcept(conceptId);
  return {
    concept: concept?.name_ko ?? conceptId,
    aliases: [conceptId, ...(concept?.aliases ?? [])],
  };
}

function buildGraphOnlyFailures(variant: VariantResult, conceptRetention: number) {
  const failures: string[] = [];
  if (!variant.regressionPass) failures.push("regression fixture FAIL");
  if (variant.concreteCheckCount < 3) failures.push(`concreteChecks 부족: ${variant.concreteCheckCount}`);
  if (variant.bannedPhraseHits.length > 0) failures.push(`금지 문구 발견: ${variant.bannedPhraseHits.join(", ")}`);
  if (variant.sectionSimilarity >= 0.72) failures.push(`section similarity 과다: ${variant.sectionSimilarity.toFixed(2)}`);
  if (conceptRetention < 1) failures.push(`핵심 concept 손실: ${Math.round(conceptRetention * 100)}%`);
  return failures;
}

function buildQuestion(testCaseItem: ExperimentCase): TarotQuestion {
  return {
    question_id: `graph_only_${testCaseItem.card_id}_${testCaseItem.orientation}_${testCaseItem.category}_${testCaseItem.position}`,
    card_id: testCaseItem.card_id,
    orientation: testCaseItem.orientation,
    spread: "graph-only",
    position: testCaseItem.position,
    difficulty: "practice",
    category: testCaseItem.category,
    question: testCaseItem.question,
    persona: {
      age: "테스트 사용자",
      background: "Concept Graph 단독 품질 검증을 위한 샘플 상황입니다.",
      concern: "Graph-only 방식에서도 핵심 의미와 확인 항목이 유지되는지 확인합니다.",
    },
  };
}

function retention(expected: string[], actual: string[]) {
  if (expected.length === 0) return 1;
  return expected.filter((conceptId) => actual.includes(conceptId)).length / expected.length;
}

function analysisAndFeedbackText(analysis: AnalysisResult, feedback: EvaluationResult) {
  return [
    analysis.selectedMeaning,
    analysis.selectedReason,
    analysis.realWorldIssue,
    analysis.specificRisk,
    analysis.concreteChecks.join("\n"),
    analysis.clientFacingAdvice,
    feedback.traditional_correction,
    feedback.sample_answer,
    feedback.model_answer,
    feedback.wrong_note,
    feedback.missed_key_points.join("\n"),
  ].join("\n");
}

function maxSectionSimilarity(feedback: EvaluationResult) {
  const sections = [feedback.traditional_correction, feedback.sample_answer, feedback.model_answer, feedback.wrong_note];
  let max = 0;
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) max = Math.max(max, jaccardSimilarity(sections[i], sections[j]));
  }
  return max;
}

function jaccardSimilarity(left: string, right: string) {
  const leftWords = new Set(words(left));
  const rightWords = new Set(words(right));
  if (leftWords.size === 0 && rightWords.size === 0) return 1;
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  return intersection / new Set([...leftWords, ...rightWords]).size;
}

function words(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 2);
}

function printSummary(experimentResults: ExperimentResult[]) {
  console.table(
    experimentResults.map((result) => ({
      Card: result.testCase.label,
      "A checks": result.variantA.concreteCheckCount,
      "B checks": result.variantB.concreteCheckCount,
      "B regression": result.variantB.regressionPass ? "PASS" : "FAIL",
      "B similarity": result.variantB.sectionSimilarity.toFixed(2),
      Retention: `${Math.round(result.conceptRetention * 100)}%`,
      PASS: result.graphOnlyPass ? "PASS" : "FAIL",
    })),
  );

  const passRate = Math.round((experimentResults.filter((result) => result.graphOnlyPass).length / experimentResults.length) * 100);
  console.log(`Graph-only retention/pass rate: ${passRate}%`);
  console.log(`Report written: ${path.join(process.cwd(), "reports", "graph-only-experiment.md")}`);
}

function writeReport(experimentResults: ExperimentResult[]) {
  const reportPath = path.join(process.cwd(), "reports", "graph-only-experiment.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(experimentResults), "utf8");
}

function buildReport(experimentResults: ExperimentResult[]) {
  const passCount = experimentResults.filter((result) => result.graphOnlyPass).length;
  const passRate = Math.round((passCount / experimentResults.length) * 100);
  return [
    "# Graph-only Experiment",
    "",
    `- Total cases: ${experimentResults.length}`,
    `- Graph-only PASS: ${passCount}`,
    `- Graph-only retention/pass rate: ${passRate}%`,
    `- Recommendation: ${passRate >= 90 ? "question_contexts 축소 실험을 진행할 수 있습니다." : "question_contexts 축소 전 Graph concept/check 보강이 필요합니다."}`,
    `- Transition conclusion: ${passRate >= 90 ? "Concept Graph Resolver를 기본 해석 소스로 전환하고 question_contexts/training_hints는 legacy fallback으로 낮출 수 있습니다." : "Graph-only 유지율이 부족하므로 기본 전환은 보류합니다."}`,
    "",
    "## A/B Summary",
    "",
    "| Case | A selectedMeaning | B selectedMeaning | A checks | B checks | B regression | B banned | B section similarity | Concept retention | PASS |",
    "| --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: | --- |",
    ...experimentResults.map((result) =>
      [
        result.testCase.label,
        result.variantA.analysis.selectedMeaning,
        result.variantB.analysis.selectedMeaning,
        result.variantA.concreteCheckCount,
        result.variantB.concreteCheckCount,
        result.variantB.regressionPass ? "PASS" : "FAIL",
        result.variantB.bannedPhraseHits.length ? result.variantB.bannedPhraseHits.join("<br>") : "-",
        result.variantB.sectionSimilarity.toFixed(2),
        `${Math.round(result.conceptRetention * 100)}%`,
        result.graphOnlyPass ? "PASS" : `FAIL: ${result.failures.join(", ")}`,
      ]
        .map(escapeCell)
        .join(" | ")
        .replace(/^/, "| ")
        .concat(" |"),
    ),
    "",
    "## Case Details",
    "",
    ...experimentResults.flatMap((result) => [
      `### ${result.testCase.label}`,
      "",
      `- Graph primary concepts: ${result.graph.primaryConcepts.map((concept) => `${concept.id}(${concept.name_ko})`).join(", ")}`,
      `- Graph reasoning path: ${result.graph.reasoningPath.join(" -> ")}`,
      `- Graph recommended checks: ${result.graph.recommendedChecks.slice(0, 5).join(", ")}`,
      `- Graph recommended actions: ${result.graph.recommendedActions.slice(0, 4).join(", ") || "-"}`,
      `- B realWorldIssue: ${result.variantB.analysis.realWorldIssue}`,
      `- B sample answer: ${result.variantB.feedback.sample_answer}`,
      `- B wrong note: ${result.variantB.feedback.wrong_note}`,
      "",
    ]),
  ].join("\n");
}

function escapeCell(value: string | number) {
  return String(value).replace(/\n/g, "<br>").replace(/\|/g, "\\|");
}
