import { PROMPT_VERSION } from "./prompt/evaluationPrompt";
import type { EvaluationResult } from "../../types/tarot";

export function parseEvaluationJson(rawText: string): EvaluationResult | null {
  try {
    return normalizeEvaluationResult(JSON.parse(extractJson(rawText)));
  } catch {
    return null;
  }
}

export function normalizeEvaluationResult(value: unknown): EvaluationResult | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<EvaluationResult>;
  const score = Number(candidate.score);

  if (!Number.isFinite(score)) return null;
  if (candidate.grade !== "correct" && candidate.grade !== "partial" && candidate.grade !== "incorrect") return null;
  if (!Array.isArray(candidate.strengths) || !candidate.strengths.every(isString)) return null;
  if (!Array.isArray(candidate.missing_points) || !candidate.missing_points.every(isString)) return null;
  if (!isString(candidate.traditional_correction)) return null;
  if (!isString(candidate.sample_answer)) return null;
  if (!isString(candidate.wrong_note)) return null;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    grade: candidate.grade,
    rubric: normalizeRubric(candidate.rubric, score),
    strengths: candidate.strengths,
    missing_points: candidate.missing_points,
    traditional_correction: candidate.traditional_correction,
    sample_answer: candidate.sample_answer,
    model_answer: isString(candidate.model_answer) ? candidate.model_answer : candidate.sample_answer,
    differences: Array.isArray(candidate.differences) && candidate.differences.every(isString) ? candidate.differences : [],
    wrong_note: candidate.wrong_note,
    next_reading_tip: isString(candidate.next_reading_tip) ? candidate.next_reading_tip : "",
    promptVersion: isString(candidate.promptVersion) ? candidate.promptVersion : PROMPT_VERSION,
  };
}

function normalizeRubric(value: unknown, score: number): EvaluationResult["rubric"] {
  const fallback = Math.max(1, Math.min(5, Math.round(score / 20)));
  if (!value || typeof value !== "object") {
    return {
      traditionalMeaning: fallback,
      questionApplication: fallback,
      counselingExpression: fallback,
      practicalApplication: fallback,
      certaintyControl: fallback,
    };
  }

  const rubric = value as Partial<EvaluationResult["rubric"]>;
  return {
    traditionalMeaning: normalizeStar(rubric.traditionalMeaning, fallback),
    questionApplication: normalizeStar(rubric.questionApplication, fallback),
    counselingExpression: normalizeStar(rubric.counselingExpression, fallback),
    practicalApplication: normalizeStar(rubric.practicalApplication, fallback),
    certaintyControl: normalizeStar(rubric.certaintyControl, fallback),
  };
}

function normalizeStar(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(1, Math.min(5, Math.round(numericValue))) : fallback;
}

function extractJson(rawText: string) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON object not found");
  }

  return trimmed.slice(start, end + 1);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
