import type { EvaluationResult, TarotQuestion, WrongNote } from "../../types/tarot";
import { getCard } from "../tarot/getCard";

export const WRONG_NOTES_STORAGE_KEY = "tarot_trainer_wrong_notes";

export function loadWrongNotes(): WrongNote[] {
  const raw = localStorage.getItem(WRONG_NOTES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWrongNote(
  question: TarotQuestion,
  userAnswer: string,
  evaluation: EvaluationResult,
  viewedAnswer = false,
): WrongNote {
  const card = getCard(question.card_id);
  const note: WrongNote = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    card_id: question.card_id,
    card_name_ko: card.meta.name_ko,
    orientation: question.orientation,
    category: question.category,
    question: question.question,
    user_answer: userAnswer,
    evaluation,
    viewedAnswer,
  };

  const nextNotes = [note, ...loadWrongNotes()];
  localStorage.setItem(WRONG_NOTES_STORAGE_KEY, JSON.stringify(nextNotes));
  return note;
}
