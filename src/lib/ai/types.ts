import type { CardOrientationMeaning, EvaluationResult, TarotCard, TarotQuestion } from "../../types/tarot";

export type EvaluationInput = {
  card: TarotCard;
  meaning: CardOrientationMeaning;
  question: TarotQuestion;
  userAnswer: string;
};

export type AnalysisResult = {
  score: number;
  matched_points: string[];
  partial_points: string[];
  missing_points: string[];
  incorrect_points: string[];
  traditional_summary: {
    core_meaning: string;
    question_position_meaning: string;
    important_symbols: string[];
  };
  feedback_focus: string[];
  must_include: string[];
};

export type Evaluator = (input: EvaluationInput) => Promise<EvaluationResult> | EvaluationResult;
