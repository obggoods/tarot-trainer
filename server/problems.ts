import { getRandomTarotQuestion, tarotQuestions } from "../src/data/tarotQuestions";

export const tarotProblems = tarotQuestions;

export function getRandomProblem() {
  return getRandomTarotQuestion();
}
