import type { AnalysisResult } from "../ai/types";
import type { CardOrientationMeaning, TarotQuestion, TarotQuestionContextV2, TarotTrainingHint } from "../../types/tarot";

export function getTrainingHint(question: TarotQuestion, meaning: CardOrientationMeaning): TarotTrainingHint | undefined {
  const hints = meaning.training_hints;
  if (!hints) return undefined;

  return hints[question.category]?.[question.position] ?? hints[question.category]?.default;
}

export function getQuestionContextV2(question: TarotQuestion, meaning: CardOrientationMeaning): TarotQuestionContextV2 | undefined {
  const contexts = meaning.question_contexts;
  if (!contexts) return undefined;

  return contexts[question.category]?.[question.position] ?? contexts[question.category]?.default;
}

export function buildDebugAnalysisResult({
  question,
  meaning,
}: {
  question: TarotQuestion;
  meaning: CardOrientationMeaning;
}): AnalysisResult {
  const context = getQuestionContextV2(question, meaning);
  const hint = getTrainingHint(question, meaning);
  const selectedMeaning = context?.selected_meaning ?? hint?.hint_title ?? meaning.must_include[0] ?? meaning.keywords[0] ?? "";
  const realWorldIssues = context?.real_world_issues ?? (hint ? [hint.hint_body] : [meaning.warning]);
  const concreteChecks = context?.concrete_checks ?? hint?.hint_keywords ?? meaning.must_include.slice(0, 4);
  const commonMisreading = context?.bad_readings?.[0] ?? meaning.common_mistakes[0] ?? "";
  const modelLogic = context?.model_logic ?? hint?.hint_body ?? `${question.position}에서 확인해야 할 실제 장면을 카드 의미로 좁혀 읽는다.`;

  return {
    questionFocus: question.question,
    questionArea: `${question.category} / ${question.position}`,
    selectedMeaning,
    reversalMode: question.orientation === "reversed" ? "부족" : "",
    selectedReason: modelLogic,
    realWorldIssue: realWorldIssues[0] ?? selectedMeaning,
    specificRisk: realWorldIssues[1] ?? realWorldIssues[0] ?? selectedMeaning,
    concreteChecks: concreteChecks.slice(0, 5),
    clientFacingAdvice: hint?.answer_seed ?? realWorldIssues[0] ?? modelLogic,
    whyUserAnswerIsInsufficient: `${selectedMeaning}을 실제 확인 항목으로 바꾸어 말해야 합니다.`,
    correctPoints: [`${selectedMeaning}의 핵심을 잡는 것이 출발점입니다.`],
    missingPoints: [`${concreteChecks.slice(0, 2).join(", ")} 같은 확인 항목이 답변에 들어가야 합니다.`],
    incorrectPoints: [],
    thinkingGap: `카드 키워드에서 멈추지 말고 ${question.position}의 실제 판단 기준으로 옮겨야 합니다.`,
    recommendedAddition: concreteChecks.slice(0, 3),
    commonMisreading,
    consultingDirection: hint?.answer_seed ?? modelLogic,
    traditionalSummary: meaning.traditional_meaning,
    modelAnswerOutline: hint?.answer_seed ?? modelLogic,
    score: 72,
    grade: "partial",
    rubric: {
      traditionalMeaning: 4,
      questionApplication: 4,
      counselingExpression: 4,
      practicalApplication: 4,
      certaintyControl: 4,
    },
    avoid_topics: [
      "질문 위치에 맞게 적용해야 합니다",
      "질문의 분야에 맞춰 읽어야 합니다",
      "카드의 정통 의미를 벗어나지 않아야 합니다",
    ],
    avoidTopics: [
      "질문 위치에 맞게 적용해야 합니다",
      "질문의 분야에 맞춰 읽어야 합니다",
      "카드의 정통 의미를 벗어나지 않아야 합니다",
    ],
    selfCheck: {
      directlyAnswersQuestion: "YES",
      repeatsSameMeaning: "NO",
      onlyRepeatsCardDescription: "NO",
      selectsOneMeaning: "YES",
      realWorldIssueIsConcrete: "YES",
      specificRiskIsConcrete: "YES",
      hasAtLeastTwoConcreteChecks: concreteChecks.length >= 2 ? "YES" : "NO",
      correctsUserThinking: "YES",
    },
  };
}
