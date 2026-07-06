export type {
  EvaluationResult,
  Orientation,
  RandomProblemResponse,
  CardMeaning,
  CardOrientationMeaning,
  TarotCard,
  TarotCategory,
  TarotQuestion,
  TarotSuit,
  WrongNote,
} from "./types/tarot";

export type TarotProblem = import("./types/tarot").TarotQuestion;

export type EvaluateResponse =
  | {
      ok: true;
      evaluation: import("./types/tarot").EvaluationResult;
    }
  | {
      ok: false;
      error: string;
      rawText?: string;
    };
