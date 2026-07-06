import type { CardOrientationMeaning, EvaluationResult, TarotCard, TarotQuestion } from "../../types/tarot";

export type EvaluationInput = {
  card: TarotCard;
  meaning: CardOrientationMeaning;
  question: TarotQuestion;
  userAnswer: string;
};

export type AnalysisResult = {
  questionFocus: string;
  questionArea: string;
  selectedMeaning: string;
  reversalMode: "" | "부족" | "과잉" | "지연" | "왜곡" | "내면화";
  selectedReason: string;
  realWorldIssue: string;
  specificRisk: string;
  concreteChecks: string[];
  clientFacingAdvice: string;
  whyUserAnswerIsInsufficient: string;
  correctPoints: string[];
  missingPoints: string[];
  incorrectPoints: string[];
  thinkingGap: string;
  recommendedAddition: string[];
  commonMisreading: string;
  consultingDirection: string;
  traditionalSummary: string;
  modelAnswerOutline: string;
  score: number;
  grade: "correct" | "partial" | "incorrect";
  rubric: {
    traditionalMeaning: number;
    questionApplication: number;
    counselingExpression: number;
    practicalApplication: number;
    certaintyControl: number;
  };
  avoid_topics: string[];
  avoidTopics: string[];
  selfCheck: PipelineSelfCheck;
};

export type Evaluator = (input: EvaluationInput) => Promise<EvaluationResult> | EvaluationResult;

export type PipelineSelfCheck = {
  directlyAnswersQuestion?: "YES" | "NO";
  repeatsSameMeaning?: "YES" | "NO";
  onlyRepeatsCardDescription?: "YES" | "NO";
  selectsOneReversalMeaning?: "YES" | "NO";
  selectsOneMeaning?: "YES" | "NO";
  eachParagraphAddsNewInfo?: "YES" | "NO";
  correctsUserThinking?: "YES" | "NO";
  realWorldIssueIsConcrete?: "YES" | "NO";
  specificRiskIsConcrete?: "YES" | "NO";
  hasAtLeastTwoConcreteChecks?: "YES" | "NO";
  traditionalCorrectionHasRealWorldIssue?: "YES" | "NO";
  includesAtLeastTwoConcreteChecks?: "YES" | "NO";
  sampleAnswerIsClientAdvice?: "YES" | "NO";
  modelAnswerDoesNotRepeatCorrection?: "YES" | "NO";
};
