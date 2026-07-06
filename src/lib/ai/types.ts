import type { CardOrientationMeaning, EvaluationResult, TarotCard, TarotQuestion } from "../../types/tarot";

export type EvaluationInput = {
  card: TarotCard;
  meaning: CardOrientationMeaning;
  question: TarotQuestion;
  userAnswer: string;
};

export type AnalysisResult = {
  score: number;
  grade: "correct" | "partial" | "incorrect";
  rubric: {
    traditionalMeaning: number;
    questionApplication: number;
    symbolAwareness: number;
    overstatementControl: number;
  };
  question_category: string;
  question_goal: string;
  card_primary_meaning: string;
  specific_strengths: string[];
  specific_improvements: string[];
  missed_core_points: string[];
  incorrect_points: string[];
  traditional_core: string;
  contextual_meaning: string;
  symbol_notes: string[];
  feedback_focus: string;
  sample_answer_draft: string;
  model_answer_draft: string;
  difference_notes: string[];
  correction_note: string;
  missed_key_points: string[];
  avoid_topics: string[];
};

export type Evaluator = (input: EvaluationInput) => Promise<EvaluationResult> | EvaluationResult;
