import { PROMPT_VERSION } from "./prompt/feedbackPrompt";
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
  const avoidTopics = candidate.avoidTopics ?? candidate.avoid_topics;

  if (!isString(candidate.questionFocus)) return null;
  if (!isString(candidate.questionArea)) return null;
  if (!isString(candidate.selectedMeaning)) return null;
  if (!isReversalMode(candidate.reversalMode)) return null;
  if (!isString(candidate.selectedReason)) return null;
  if (!Array.isArray(candidate.correctPoints) || !candidate.correctPoints.every(isString)) return null;
  if (!Array.isArray(candidate.missingPoints) || !candidate.missingPoints.every(isString)) return null;
  if (!Array.isArray(candidate.incorrectPoints) || !candidate.incorrectPoints.every(isString)) return null;
  if (!Array.isArray(candidate.recommendedAddition) || !candidate.recommendedAddition.every(isString)) return null;
  if (!isString(candidate.commonMisreading)) return null;
  if (!isString(candidate.consultingDirection)) return null;
  if (!isString(candidate.traditionalSummary)) return null;
  if (!isString(candidate.modelAnswerOutline)) return null;
  if (!Array.isArray(avoidTopics) || !avoidTopics.every(isString)) return null;

  return {
    questionFocus: candidate.questionFocus,
    questionArea: candidate.questionArea,
    selectedMeaning: candidate.selectedMeaning,
    reversalMode: candidate.reversalMode,
    selectedReason: candidate.selectedReason,
    correctPoints: candidate.correctPoints,
    missingPoints: candidate.missingPoints,
    incorrectPoints: candidate.incorrectPoints,
    recommendedAddition: candidate.recommendedAddition,
    commonMisreading: candidate.commonMisreading,
    consultingDirection: candidate.consultingDirection,
    traditionalSummary: candidate.traditionalSummary,
    modelAnswerOutline: candidate.modelAnswerOutline,
    avoid_topics: avoidTopics,
    avoidTopics,
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

function isReversalMode(value: unknown): value is AnalysisResult["reversalMode"] {
  return value === "" || value === "부족" || value === "과잉" || value === "왜곡" || value === "지연" || value === "내면화";
}
