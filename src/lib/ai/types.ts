import type { CardOrientationMeaning, EvaluationResult, TarotCard, TarotQuestion } from "../../types/tarot";

export type EvaluationInput = {
  card: TarotCard;
  meaning: CardOrientationMeaning;
  question: TarotQuestion;
  userAnswer: string;
};

export type Evaluator = (input: EvaluationInput) => Promise<EvaluationResult> | EvaluationResult;
