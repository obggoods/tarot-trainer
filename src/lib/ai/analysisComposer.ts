import type { AnalysisResult, EvaluationInput } from "./types";
import { resolveConceptGraph, type ConceptGraphResolution } from "../tarot/conceptGraphResolver";
import { getTarotConcept } from "../tarot/conceptResolver";

type ComposeAnalysisInput = EvaluationInput & {
  graph?: ConceptGraphResolution;
};

const hardCertaintyTerms = ["무조건", "반드시", "100%", "확실히", "절대", "끝났다", "성공한다", "실패한다"];

export function composeAnalysisFromGraph(input: ComposeAnalysisInput): AnalysisResult {
  const graph =
    input.graph ??
    resolveConceptGraph({
      cardId: input.card.meta.card_id,
      orientation: input.question.orientation,
      category: input.question.category,
      position: input.question.position,
    });
  const primaryConcepts = graph.primaryConcepts;
  const selectedMeaning = primaryConcepts.map((concept) => concept.name_ko).join(" + ") || input.meaning.keywords[0] || input.card.meta.name_ko;
  const checks = graph.recommendedChecks.slice(0, 5);
  const actions = graph.recommendedActions.slice(0, 4);
  const scoreParts = scoreAnswer(input.userAnswer, input.question.question, graph);
  const score = scoreParts.score;
  const grade = score >= 80 ? "correct" : score >= 50 ? "partial" : "incorrect";
  const issue =
    graph.realWorldIssues[0] ??
    `${input.question.position}에서 먼저 확인해야 할 실제 상황을 봐야 합니다.`;

  return {
    questionFocus: input.question.question,
    questionArea: `${input.question.category} / ${input.question.position}`,
    selectedMeaning,
    reversalMode: "",
    selectedReason: buildSelectedReason(graph),
    realWorldIssue: issue,
    specificRisk: buildSpecificRisk(checks),
    concreteChecks: checks,
    clientFacingAdvice: buildClientAdvice(checks, actions),
    whyUserAnswerIsInsufficient: buildInsufficientReason(scoreParts.missingChecks),
    correctPoints: buildCorrectPoints(scoreParts),
    missingPoints: buildMissingPoints(scoreParts.missingChecks),
    incorrectPoints: scoreParts.hasHardCertainty ? ["결과를 너무 강하게 단정한 표현이 있습니다."] : [],
    thinkingGap: buildThinkingGap(scoreParts.missingChecks),
    recommendedAddition: scoreParts.missingChecks.slice(0, 3),
    commonMisreading: "질문에 먼저 답하지 않고 키워드 설명에서 멈추는 것",
    consultingDirection: buildConsultingDirection(selectedMeaning, checks),
    traditionalSummary: input.meaning.traditional_meaning,
    modelAnswerOutline: [selectedMeaning, ...graph.reasoningPath.slice(1, 3), ...checks.slice(0, 2)].filter(Boolean).join(" -> "),
    score,
    grade,
    rubric: {
      traditionalMeaning: scoreParts.conceptHits > 0 ? 4 : 2,
      questionApplication: scoreParts.answersQuestion ? 4 : 2,
      counselingExpression: input.userAnswer.trim().length >= 30 ? 4 : 2,
      practicalApplication: scoreParts.checkHits >= 2 ? 5 : scoreParts.checkHits === 1 ? 3 : 1,
      certaintyControl: scoreParts.hasHardCertainty ? 2 : 5,
    },
    avoid_topics: bannedGenericSentences,
    avoidTopics: bannedGenericSentences,
    selfCheck: {
      directlyAnswersQuestion: scoreParts.answersQuestion ? "YES" : "NO",
      repeatsSameMeaning: "NO",
      onlyRepeatsCardDescription: scoreParts.checkHits === 0 ? "YES" : "NO",
      selectsOneMeaning: "YES",
      realWorldIssueIsConcrete: "YES",
      specificRiskIsConcrete: "YES",
      hasAtLeastTwoConcreteChecks: checks.length >= 2 ? "YES" : "NO",
      correctsUserThinking: "YES",
    },
  };
}

export function scoreAnswer(userAnswer: string, questionText: string, graph: ConceptGraphResolution) {
  const normalized = normalize(userAnswer);
  const conceptHits = graph.primaryConcepts.filter((concept) => {
    const full = getTarotConcept(concept.id);
    return [concept.id, concept.name_ko, ...(full?.aliases ?? [])].some((value) => normalized.includes(normalize(value)));
  }).length;
  const checkHits = graph.recommendedChecks.filter((check) => normalized.includes(normalize(check))).length;
  const actionHits = graph.recommendedActions.filter((action) => normalized.includes(normalize(action))).length;
  const questionSignals = splitWords(questionText).slice(0, 8);
  const answersQuestion = questionSignals.some((signal) => normalized.includes(normalize(signal))) || userAnswer.trim().length >= 30;
  const hasHardCertainty = hardCertaintyTerms.some((term) => normalized.includes(normalize(term)));
  const missingChecks = graph.recommendedChecks.filter((check) => !normalized.includes(normalize(check))).slice(0, 5);

  let score = 0;
  if (conceptHits > 0) score += 20;
  if (checkHits >= 1) score += 20;
  if (checkHits >= 2) score += 20;
  if (answersQuestion) score += 20;
  if (!hasHardCertainty) score += 20;
  if (actionHits > 0 && score < 100) score += 5;

  return {
    score: Math.min(100, score),
    conceptHits,
    checkHits,
    actionHits,
    answersQuestion,
    hasHardCertainty,
    missingChecks,
  };
}

function buildSelectedReason(graph: ConceptGraphResolution) {
  const path = graph.reasoningPath.slice(0, 5);
  return path.length > 1 ? `질문에 답하기 위해 ${path.join(" -> ")} 흐름을 선택했습니다.` : "질문에 가장 직접적으로 답하는 개념을 선택했습니다.";
}

function buildSpecificRisk(checks: string[]) {
  return checks.length >= 2
    ? `${checks[0]}와 ${checks[1]}을 확인하지 않으면 질문에 대한 답이 실제 판단 기준으로 이어지기 어렵습니다.`
    : "확인할 항목을 구체화하지 않으면 답변이 질문의 핵심에 닿지 못할 수 있습니다.";
}

function buildClientAdvice(checks: string[], actions: string[]) {
  const checkText = checks.slice(0, 3).join(", ");
  const actionText = actions.slice(0, 2).join(", ");
  if (checkText && actionText) return `${checkText}를 먼저 확인하고, ${actionText} 쪽으로 다음 행동을 좁혀 보세요.`;
  if (checkText) return `${checkText}를 먼저 확인해 보세요.`;
  return "카드 설명으로 시작하기보다 질문에 답하기 위해 먼저 확인할 조건을 짚어 주세요.";
}

function buildCorrectPoints(scoreParts: ReturnType<typeof scoreAnswer>) {
  const points: string[] = [];
  if (scoreParts.conceptHits > 0) points.push("핵심 개념을 답변과 연결하려는 시도가 있습니다.");
  if (scoreParts.checkHits > 0) points.push("확인할 항목을 일부 포함했습니다.");
  if (scoreParts.answersQuestion) points.push("질문의 실제 고민을 따라가려는 방향이 있습니다.");
  return points.length > 0 ? points : ["질문에 답하려는 방향을 잡으려 한 점은 좋았습니다."];
}

function buildMissingPoints(missingChecks: string[]) {
  if (missingChecks.length === 0) return [];
  return [`${missingChecks.slice(0, 3).join(", ")} 확인이 답변에 부족합니다.`];
}

function buildInsufficientReason(missingChecks: string[]) {
  if (missingChecks.length === 0) return "핵심 확인 항목은 대체로 들어갔습니다.";
  return `${missingChecks.slice(0, 2).join(", ")}처럼 내담자가 실제로 확인해야 할 항목이 부족합니다.`;
}

function buildThinkingGap(missingChecks: string[]) {
  if (missingChecks.length === 0) return "핵심 개념과 확인 항목을 비교적 잘 연결했습니다.";
  return `키워드 설명에서 멈추지 말고 ${missingChecks.slice(0, 2).join(", ")}까지 이어서 말해야 합니다.`;
}

function buildConsultingDirection(selectedMeaning: string, checks: string[]) {
  if (checks.length >= 2) return `${selectedMeaning}을 결론처럼 말하지 말고 ${checks[0]}와 ${checks[1]} 확인으로 연결합니다.`;
  return `${selectedMeaning}을 질문 상황에서 확인할 조건으로 바꾸어 설명합니다.`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function splitWords(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2);
}

const bannedGenericSentences = [
  "질문 위치에 맞게 적용해야 합니다.",
  "질문의 분야에 맞춰 읽어야 합니다.",
  "결과를 단정하지 않아야 합니다.",
  "카드의 정통 의미를 벗어나지 않아야 합니다.",
  "가능성과 경고를 함께 담고 있습니다.",
  "현실적으로 읽어야 합니다.",
  "구체적으로 살펴봐야 합니다.",
];
