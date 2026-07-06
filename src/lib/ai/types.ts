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
  reversalMode: "" | "부족" | "과잉" | "왜곡" | "지연" | "내면화";
  selectedReason: string;
  correctPoints: string[];
  missingPoints: string[];
  incorrectPoints: string[];
  recommendedAddition: string[];
  commonMisreading: string;
  consultingDirection: string;
  traditionalSummary: string;
  modelAnswerOutline: string;
  avoid_topics: string[];
  avoidTopics: string[];
};

export type Evaluator = (input: EvaluationInput) => Promise<EvaluationResult> | EvaluationResult;
