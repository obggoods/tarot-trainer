import businessQuestions from "./tarot/questions/business.json";
import careerQuestions from "./tarot/questions/career.json";
import healthQuestions from "./tarot/questions/health.json";
import loveQuestions from "./tarot/questions/love.json";
import { allMeaningCardIds } from "./tarot/meanings/allMeanings";
import moneyQuestions from "./tarot/questions/money.json";
import reunionQuestions from "./tarot/questions/reunion.json";
import type { ConsultationQuestion, Orientation, TarotQuestion } from "../types/tarot";

export const consultationQuestions: ConsultationQuestion[] = [
  ...loveQuestions,
  ...reunionQuestions,
  ...careerQuestions,
  ...businessQuestions,
  ...moneyQuestions,
  ...healthQuestions,
] as ConsultationQuestion[];

export const trainingCardPool = allMeaningCardIds;

const orientations: Orientation[] = ["upright", "reversed"];

export const tarotQuestions: TarotQuestion[] = consultationQuestions.map((question, index) =>
  buildTrainingQuestion(question, trainingCardPool[index % trainingCardPool.length], orientations[index % orientations.length]),
);

export function getRandomTarotQuestion(currentQuestionId?: string) {
  const candidates =
    consultationQuestions.length > 1
      ? consultationQuestions.filter((question) => question.question_id !== currentQuestionId?.split("__")[0])
      : consultationQuestions;
  const index = Math.floor(Math.random() * candidates.length);
  const cardId = trainingCardPool[Math.floor(Math.random() * trainingCardPool.length)];
  const orientation = orientations[Math.floor(Math.random() * orientations.length)];
  return buildTrainingQuestion(candidates[index], cardId, orientation);
}

function buildTrainingQuestion(question: ConsultationQuestion, cardId: string, orientation: Orientation): TarotQuestion {
  return {
    ...question,
    question_id: `${question.question_id}__${cardId}_${orientation}`,
    card_id: cardId,
    orientation,
  };
}
