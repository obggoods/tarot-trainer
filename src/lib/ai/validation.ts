import { PROMPT_VERSION } from "./prompt/feedbackPrompt";
import { hasInternalLeak, sanitizeText } from "./evaluationSanitizer";
import type { AnalysisResult, PipelineSelfCheck } from "./types";
import type { EvaluationResult } from "../../types/tarot";

export function parseEvaluationJson(rawText: string): EvaluationResult | null {
  try {
    return normalizeEvaluationResult(JSON.parse(extractJson(rawText)));
  } catch {
    return null;
  }
}

export function parseCorrectionJson(rawText: string): { traditional_correction: string } | null {
  try {
    const candidate = JSON.parse(extractStrictJson(rawText)) as { traditional_correction?: unknown };
    if (Object.keys(candidate).some((key) => key !== "traditional_correction")) return null;
    if (typeof candidate.traditional_correction !== "string") return null;

    const correction = sanitizeText(candidate.traditional_correction);
    if (!isValidCorrection(correction)) return null;

    return { traditional_correction: correction };
  } catch {
    return null;
  }
}

export function normalizeEvaluationResult(value: unknown): EvaluationResult | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<EvaluationResult>;
  const score = Number(candidate.score);
  const strengths = normalizeStringList(candidate.strengths);
  const missingPoints = normalizeStringList(candidate.missing_points);
  const missedKeyPoints = normalizeStringList(candidate.missed_key_points);
  const differences = normalizeStringList(candidate.differences);

  if (!Number.isFinite(score)) return null;
  if (candidate.grade !== "correct" && candidate.grade !== "partial" && candidate.grade !== "incorrect") return null;
  if (!strengths) return null;
  if (!missingPoints) return null;
  if (!isString(candidate.traditional_correction)) return null;
  if (!isString(candidate.sample_answer)) return null;
  if (!isString(candidate.wrong_note)) return null;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    grade: candidate.grade,
    rubric: normalizeRubric(candidate.rubric, score),
    interpretation_graph: normalizeInterpretationGraph(candidate.interpretation_graph),
    strengths,
    missing_points: missingPoints,
    traditional_correction: candidate.traditional_correction,
    sample_answer: candidate.sample_answer,
    model_answer: isString(candidate.model_answer) ? candidate.model_answer : candidate.sample_answer,
    missed_key_points: missedKeyPoints ?? missingPoints,
    differences: differences ?? [],
    wrong_note: candidate.wrong_note,
    next_reading_tip: isString(candidate.next_reading_tip) ? candidate.next_reading_tip : "",
    promptVersion: isString(candidate.promptVersion) ? candidate.promptVersion : PROMPT_VERSION,
  };
}

function normalizeInterpretationGraph(value: unknown): EvaluationResult["interpretation_graph"] {
  const fallback = {
    card: "카드",
    orientation: "upright" as const,
    traditional_meanings: [],
    question_focus: "질문 초점",
    selected_meanings: [],
    rejected_meanings: [],
    reasoning_bridge: "카드의 정통 의미 중 질문에 가장 직접적으로 답하는 의미를 선택해 읽습니다.",
    counseling_sentence: "지금은 결론보다 먼저 확인해야 할 조건을 차분히 점검해보는 것이 좋습니다.",
  };

  if (!value || typeof value !== "object") return fallback;

  const candidate = value as Partial<EvaluationResult["interpretation_graph"]>;
  return {
    card: isString(candidate.card) ? candidate.card : fallback.card,
    orientation: candidate.orientation === "reversed" ? "reversed" : "upright",
    traditional_meanings: normalizeStringList(candidate.traditional_meanings) ?? [],
    question_focus: isString(candidate.question_focus) ? candidate.question_focus : fallback.question_focus,
    selected_meanings: normalizeStringList(candidate.selected_meanings) ?? [],
    rejected_meanings: Array.isArray(candidate.rejected_meanings)
      ? candidate.rejected_meanings
          .filter((item): item is { meaning: string; reason: string } => Boolean(item) && typeof item === "object" && isString((item as { meaning?: unknown }).meaning) && isString((item as { reason?: unknown }).reason))
          .slice(0, 4)
      : [],
    reasoning_bridge: isString(candidate.reasoning_bridge) ? candidate.reasoning_bridge : fallback.reasoning_bridge,
    counseling_sentence: isString(candidate.counseling_sentence) ? candidate.counseling_sentence : fallback.counseling_sentence,
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
  if (!isString(candidate.realWorldIssue)) return null;
  if (!isString(candidate.specificRisk)) return null;
  if (!Array.isArray(candidate.concreteChecks) || !candidate.concreteChecks.every(isString) || candidate.concreteChecks.length < 2) return null;
  if (!isString(candidate.clientFacingAdvice)) return null;
  if (!isString(candidate.whyUserAnswerIsInsufficient)) return null;
  if (!Array.isArray(candidate.correctPoints) || !candidate.correctPoints.every(isString)) return null;
  if (!Array.isArray(candidate.missingPoints) || !candidate.missingPoints.every(isString)) return null;
  if (!Array.isArray(candidate.incorrectPoints) || !candidate.incorrectPoints.every(isString)) return null;
  if (!isString(candidate.thinkingGap)) return null;
  if (!Array.isArray(candidate.recommendedAddition) || !candidate.recommendedAddition.every(isString)) return null;
  if (!isString(candidate.commonMisreading)) return null;
  if (!isString(candidate.consultingDirection)) return null;
  if (!isString(candidate.traditionalSummary)) return null;
  if (!isString(candidate.modelAnswerOutline)) return null;
  if (!Number.isFinite(Number(candidate.score))) return null;
  if (candidate.grade !== "correct" && candidate.grade !== "partial" && candidate.grade !== "incorrect") return null;
  if (!candidate.rubric || typeof candidate.rubric !== "object") return null;
  if (!Array.isArray(avoidTopics) || !avoidTopics.every(isString)) return null;
  if (!isSelfCheck(candidate.selfCheck)) return null;

  const score = Number(candidate.score);
  const rubric = candidate.rubric as Partial<AnalysisResult["rubric"]>;

  return {
    questionFocus: candidate.questionFocus,
    questionArea: candidate.questionArea,
    selectedMeaning: candidate.selectedMeaning,
    reversalMode: candidate.reversalMode,
    selectedReason: candidate.selectedReason,
    realWorldIssue: candidate.realWorldIssue,
    specificRisk: candidate.specificRisk,
    concreteChecks: candidate.concreteChecks.slice(0, 5),
    clientFacingAdvice: candidate.clientFacingAdvice,
    whyUserAnswerIsInsufficient: candidate.whyUserAnswerIsInsufficient,
    correctPoints: candidate.correctPoints,
    missingPoints: candidate.missingPoints,
    incorrectPoints: candidate.incorrectPoints,
    thinkingGap: candidate.thinkingGap,
    recommendedAddition: candidate.recommendedAddition,
    commonMisreading: candidate.commonMisreading,
    consultingDirection: candidate.consultingDirection,
    traditionalSummary: candidate.traditionalSummary,
    modelAnswerOutline: candidate.modelAnswerOutline,
    score: Math.max(0, Math.min(100, Math.round(score))),
    grade: candidate.grade,
    rubric: {
      traditionalMeaning: normalizeStar(rubric.traditionalMeaning, 3),
      questionApplication: normalizeStar(rubric.questionApplication, 3),
      counselingExpression: normalizeStar(rubric.counselingExpression, 3),
      practicalApplication: normalizeStar(rubric.practicalApplication, 3),
      certaintyControl: normalizeStar(rubric.certaintyControl, 3),
    },
    avoid_topics: avoidTopics,
    avoidTopics,
    selfCheck: candidate.selfCheck,
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

function normalizeStringList(value: unknown): string[] | null {
  if (Array.isArray(value) && value.every(isString)) return value;
  if (isString(value)) return value.trim().length > 0 ? [value] : [];
  if (value === undefined) return null;
  return null;
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

function isValidCorrection(value: string) {
  if (!value.trim()) return false;
  if (value.trim().length < 40) return false;
  if (hasInternalLeak(value)) return false;
  if (/```|#{1,6}\s|^\s*[-*]\s/m.test(value)) return false;
  return true;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isReversalMode(value: unknown): value is AnalysisResult["reversalMode"] {
  return value === "" || value === "부족" || value === "과잉" || value === "지연" || value === "왜곡" || value === "내면화";
}

function isSelfCheck(value: unknown): value is PipelineSelfCheck {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PipelineSelfCheck>;
  const values = Object.values(candidate);
  return values.length > 0 && values.every((item) => item === undefined || isYesNo(item));
}

function isYesNo(value: unknown): value is "YES" | "NO" {
  return value === "YES" || value === "NO";
}
