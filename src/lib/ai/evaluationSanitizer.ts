import type { EvaluationResult } from "../../types/tarot";

const internalLeakTerms = [
  "질문과 맞지 않는 대표 키워드",
  "질문과 무관한 대표 키워드",
  "부족한 대표 키워드",
  "대표 키워드만 말하고",
  "대표 키워드",
  "핵심 키워드",
  "플레이스홀더",
  "placeholder",
  "fallback_reason",
  "selectedmeaning",
  "realworldissue",
  "concretechecks",
  "recommendedchecks",
  "missingpoints",
  "undefined",
  "null",
  "n/a",
];

export function sanitizeEvaluationForDisplay(evaluation: EvaluationResult): EvaluationResult {
  const strengths = sanitizeList(evaluation.strengths);
  const missingPoints = sanitizeList(evaluation.missing_points);
  const differences = sanitizeList(evaluation.differences.length > 0 ? evaluation.differences : missingPoints);
  const missedKeyPoints = sanitizeList(evaluation.missed_key_points).slice(0, 6);
  const graph = evaluation.interpretation_graph;

  return {
    ...evaluation,
    interpretation_graph: {
      card: sanitizeInlineText(graph?.card) || "카드",
      orientation: graph?.orientation === "reversed" ? "reversed" : "upright",
      traditional_meanings: sanitizeInlineList(graph?.traditional_meanings ?? []),
      question_focus: sanitizeInlineText(graph?.question_focus) || "질문 초점",
      selected_meanings: sanitizeInlineList(graph?.selected_meanings ?? []),
      rejected_meanings: (graph?.rejected_meanings ?? [])
        .map((item) => ({
          meaning: sanitizeInlineText(item.meaning),
          reason: sanitizeText(item.reason),
        }))
        .filter((item) => item.meaning && item.reason)
        .slice(0, 4),
      reasoning_bridge: sanitizeText(graph?.reasoning_bridge) || "카드의 의미를 질문이 묻는 실제 상황에 연결해 읽습니다.",
      counseling_sentence: sanitizeText(graph?.counseling_sentence) || "지금은 결론보다 먼저 확인해야 할 조건을 차분히 점검해보는 것이 좋습니다.",
    },
    strengths: withDefaultList(strengths, ["질문의 실제 고민을 기준으로 답변하려는 방향은 좋았습니다."]),
    missing_points: missingPoints,
    traditional_correction: sanitizeText(evaluation.traditional_correction),
    sample_answer: withDefaultText(
      sanitizeText(evaluation.sample_answer),
      "내담자에게는 카드의 결론을 바로 단정하기보다, 먼저 확인해야 할 조건을 짚어 보라고 안내하는 편이 좋습니다.",
    ),
    model_answer: withDefaultText(
      sanitizeText(evaluation.model_answer),
      "이 답변은 카드의 핵심 개념을 질문 상황에 연결하고, 확인할 항목을 함께 제시하는 방식으로 구성하면 좋습니다.",
    ),
    missed_key_points: missedKeyPoints,
    differences,
    wrong_note: withDefaultText(
      sanitizeText(evaluation.wrong_note),
      "이번 답변은 큰 방향을 잡은 뒤, 확인할 항목을 두 가지 이상 구체적으로 적는 연습이 필요합니다.",
    ),
    next_reading_tip: withDefaultText(
      sanitizeText(evaluation.next_reading_tip),
      "다음에는 카드 키워드 하나를 말한 뒤, 내담자가 확인할 항목 두 가지를 함께 제시하세요.",
    ),
  };
}

export function sanitizeText(value: string | undefined | null): string {
  if (!value) return "";

  const cleaned = removeRepeatedSentences(
    value
      .split(/\n+|(?<=[.!?。！？])\s+/)
      .map(cleanSentence)
      .filter(Boolean),
  ).join(" ");

  return ensureSentenceEnd(cleaned);
}

export function sanitizeList(items: Array<string | undefined | null>): string[] {
  return dedupe(
    items
      .map((item) => sanitizeText(item))
      .filter((item) => item.length > 0)
      .filter((item) => !hasInternalLeak(item)),
  );
}

export function sanitizeInlineText(value: string | undefined | null): string {
  if (!value) return "";

  let next = value.trim();
  if (!next) return "";

  for (const term of internalLeakTerms) {
    next = replaceCaseInsensitive(next, term, "");
  }

  next = next
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[,，]\s*[,，]+/g, ", ")
    .replace(/^[,，.!?。！？\s]+/, "")
    .trim();

  return next && !hasInternalLeak(next) ? next : "";
}

function sanitizeInlineList(items: Array<string | undefined | null>): string[] {
  return dedupe(items.map((item) => sanitizeInlineText(item)).filter(Boolean));
}

export function hasInternalLeak(value: string) {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return internalLeakTerms.some((term) => normalized.includes(term));
}

function cleanSentence(sentence: string) {
  let next = sentence.trim();
  if (!next) return "";

  for (const term of internalLeakTerms) {
    next = replaceCaseInsensitive(next, term, "");
  }

  next = next
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[,，]\s*[,，]+/g, ", ")
    .replace(/^[,，.!?。！？\s]+/, "")
    .replace(/\s+([다요죠])\s+/g, "$1 ")
    .trim();

  if (!next || next.length < 6 || hasInternalLeak(next)) return "";
  return ensureSentenceEnd(next);
}

function ensureSentenceEnd(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?。！？]$/.test(trimmed) || /(다|요|죠|니다|습니다)$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function removeRepeatedSentences(sentences: string[]) {
  return dedupe(sentences).slice(0, 4);
}

function dedupe(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase().replace(/\s+/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withDefaultText(value: string, fallback: string) {
  return value && !hasInternalLeak(value) ? value : fallback;
}

function withDefaultList(values: string[], fallback: string[]) {
  return values.length > 0 ? values : fallback;
}

function replaceCaseInsensitive(value: string, search: string, replacement: string) {
  return value.replace(new RegExp(escapeRegExp(search), "gi"), replacement);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
