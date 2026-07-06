import { PROMPT_VERSION } from "./prompt/evaluationPrompt";
import type { AnalysisResult } from "./types";
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
    missed_key_points:
      Array.isArray(candidate.missed_key_points) && candidate.missed_key_points.every(isString) ? candidate.missed_key_points : candidate.missing_points,
    differences: Array.isArray(candidate.differences) && candidate.differences.every(isString) ? candidate.differences : [],
    wrong_note: candidate.wrong_note,
    next_reading_tip: isString(candidate.next_reading_tip) ? candidate.next_reading_tip : "",
    promptVersion: isString(candidate.promptVersion) ? candidate.promptVersion : PROMPT_VERSION,
  };
}

export function parseAnalysisJson(rawText: string): AnalysisResult | null {
  try {
    return normalizeAnalysisResult(JSON.parse(extractStrictJson(rawText)));
  } catch {
    return null;
  }
}

function normalizeAnalysisResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<AnalysisResult>;
  const score = Number(candidate.score);

  if (!Number.isFinite(score)) return null;
  if (candidate.grade !== "correct" && candidate.grade !== "partial" && candidate.grade !== "incorrect") return null;
  if (!candidate.rubric || typeof candidate.rubric !== "object") return null;
  if (!Array.isArray(candidate.specific_strengths) || !candidate.specific_strengths.every(isString)) return null;
  if (!Array.isArray(candidate.specific_improvements) || !candidate.specific_improvements.every(isString)) return null;
  if (!Array.isArray(candidate.missed_core_points) || !candidate.missed_core_points.every(isString)) return null;
  if (!Array.isArray(candidate.incorrect_points) || !candidate.incorrect_points.every(isString)) return null;
  if (!isString(candidate.traditional_core)) return null;
  if (!isString(candidate.contextual_meaning)) return null;
  if (!Array.isArray(candidate.symbol_notes) || !candidate.symbol_notes.every(isString)) return null;
  if (!isString(candidate.feedback_focus)) return null;
  if (!isString(candidate.sample_answer_draft)) return null;
  if (!isString(candidate.model_answer_draft)) return null;
  if (!Array.isArray(candidate.difference_notes) || !candidate.difference_notes.every(isString)) return null;
  if (!isString(candidate.correction_note)) return null;
  if (!Array.isArray(candidate.missed_key_points) || !candidate.missed_key_points.every(isString)) return null;
  if (!Array.isArray(candidate.avoid_topics) || !candidate.avoid_topics.every(isString)) return null;

  const rubric = candidate.rubric as Partial<AnalysisResult["rubric"]>;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    grade: candidate.grade,
    rubric: {
      traditionalMeaning: normalizeStar(rubric.traditionalMeaning, 3),
      questionApplication: normalizeStar(rubric.questionApplication, 3),
      symbolAwareness: normalizeStar(rubric.symbolAwareness, 3),
      overstatementControl: normalizeStar(rubric.overstatementControl, 3),
    },
    specific_strengths: candidate.specific_strengths,
    specific_improvements: candidate.specific_improvements,
    missed_core_points: candidate.missed_core_points,
    incorrect_points: candidate.incorrect_points,
    traditional_core: candidate.traditional_core,
    contextual_meaning: candidate.contextual_meaning,
    symbol_notes: candidate.symbol_notes,
    feedback_focus: candidate.feedback_focus,
    sample_answer_draft: candidate.sample_answer_draft,
    model_answer_draft: candidate.model_answer_draft,
    difference_notes: candidate.difference_notes,
    correction_note: candidate.correction_note,
    missed_key_points: candidate.missed_key_points,
    avoid_topics: candidate.avoid_topics,
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

  const rubric = value as Partial<
    EvaluationResult["rubric"] & {
      symbolAwareness: number;
      overstatementControl: number;
    }
  >;
  return {
    traditionalMeaning: normalizeStar(rubric.traditionalMeaning, fallback),
    questionApplication: normalizeStar(rubric.questionApplication, fallback),
    counselingExpression: normalizeStar(rubric.counselingExpression ?? rubric.symbolAwareness, fallback),
    practicalApplication: normalizeStar(rubric.practicalApplication ?? rubric.questionApplication, fallback),
    certaintyControl: normalizeStar(rubric.certaintyControl ?? rubric.overstatementControl, fallback),
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

function extractStrictJson(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new Error("Strict JSON object not found");
  }

  return trimmed;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
