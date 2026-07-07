import { sanitizeEvaluationForDisplay } from "./evaluationSanitizer";
import { CORRECTION_PROMPT_VERSION } from "./prompt/correctionPrompt";
import type { AnalysisResult, EvaluationInput } from "./types";
import type { ConceptGraphResolution } from "../tarot/conceptGraphResolver";
import type { EvaluationResult } from "../../types/tarot";

type ComposeFeedbackInput = EvaluationInput & {
  analysis: AnalysisResult;
  graph: ConceptGraphResolution;
  traditionalCorrection: string;
};

export function composeFeedback({ card, meaning, question, analysis, graph, traditionalCorrection, userAnswer }: ComposeFeedbackInput): EvaluationResult {
  const checks = contextualizeChecks(question.category, nonEmpty(graph.recommendedChecks)).slice(0, 5);
  const path = nonEmpty(graph.reasoningPath).slice(0, 5);
  const missingChecks = checks.filter((check) => !includesLoose(userAnswer, check));
  const missingSecondary = graph.secondaryConcepts.map((concept) => concept.name_ko).filter((concept) => !includesLoose(userAnswer, concept));
  const interpretationGraph = buildInterpretationGraph({ card, meaning, question, analysis, graph, checks });

  const strengths = dedupeSentences([
    userAnswer.trim().length >= 30
      ? `사용자 답변은 ${question.position}${objectParticle(question.position)} 단순 키워드가 아니라 실제 고민으로 풀어보려는 방향이 좋았습니다.`
      : analysis.correctPoints[0],
    hasAnyCheck(userAnswer, checks)
      ? `특히 ${checks.filter((check) => includesLoose(userAnswer, check)).slice(0, 2).join(", ")}처럼 확인할 조건을 넣으려 한 점은 질문 적용에 도움이 됩니다.`
      : "",
  ]);
  const missingPoints = buildMissingPoints(missingChecks);
  const sampleAnswer = buildRealityApplication(question.category, checks, interpretationGraph);
  const modelAnswer = avoidTooSimilar(buildModelAnswer(interpretationGraph, path, checks), sampleAnswer, buildStudentStyleAnswer(interpretationGraph, checks));
  const wrongNote = buildWrongNote(missingChecks, path, interpretationGraph, userAnswer);
  const missedKeyPoints = buildMissedKeyPoints(missingChecks, missingSecondary);

  return sanitizeEvaluationForDisplay({
    score: analysis.score,
    grade: analysis.grade,
    rubric: analysis.rubric,
    interpretation_graph: interpretationGraph,
    strengths,
    missing_points: missingPoints,
    traditional_correction: buildStructuredTraditionalCorrection(interpretationGraph, traditionalCorrection),
    sample_answer: sampleAnswer,
    model_answer: modelAnswer,
    missed_key_points: missedKeyPoints,
    differences: missingPoints,
    wrong_note: wrongNote,
    next_reading_tip: buildNextReadingTip(checks),
    promptVersion: `composer:${CORRECTION_PROMPT_VERSION}`,
  });
}

function buildInterpretationGraph({
  card,
  meaning,
  question,
  analysis,
  graph,
  checks,
}: Pick<ComposeFeedbackInput, "card" | "meaning" | "question" | "analysis" | "graph"> & { checks: string[] }): EvaluationResult["interpretation_graph"] {
  const selectedMeanings = nonEmpty(graph.primaryConcepts.map((concept) => concept.name_ko)).slice(0, 4);
  const secondaryMeanings = nonEmpty(graph.secondaryConcepts.map((concept) => concept.name_ko)).slice(0, 3);
  const traditionalMeanings = dedupeKeywords([...meaning.must_include, ...meaning.keywords, ...selectedMeanings, ...secondaryMeanings]).slice(0, 7);
  const selected = selectedMeanings.length > 0 ? selectedMeanings : [analysis.selectedMeaning].filter(Boolean);
  const selectedText = selected.slice(0, 2).join(", ");
  const bridge = joinSentences([
    `이 질문에서 먼저 봐야 하는 것은 ${categoryFocus(question.category)} 안에서 ${selectedText}${subjectParticle(selected[selected.length - 1] ?? "의미")} 어떻게 드러나는지입니다.`,
    `${card.meta.name_ko} ${orientationText(question.orientation)}은 ${traditionalMeanings.slice(0, 3).join(", ")}의 흐름을 근거로 이 선택을 받쳐 줍니다.`,
  ]);

  return {
    card: card.meta.name_ko,
    orientation: question.orientation,
    traditional_meanings: traditionalMeanings,
    question_focus: question.position,
    selected_meanings: selected,
    rejected_meanings: [],
    reasoning_bridge: bridge,
    counseling_sentence: buildCounselingSentence(question.category, selected[0] ?? analysis.selectedMeaning),
  };
}

export function buildFallbackTraditionalCorrection(analysis: AnalysisResult, graph: ConceptGraphResolution, cardName: string) {
  const concept = graph.primaryConcepts[0]?.name_ko || analysis.selectedMeaning;
  const path = nonEmpty(graph.reasoningPath).slice(0, 3);
  const checks = nonEmpty(graph.recommendedChecks).slice(0, 2);

  return joinSentences([
    `${cardName}은 이 질문에서 ${concept}${objectParticle(concept)} 중심으로 읽는 편이 적절합니다.`,
    path.length > 1 ? `해석 흐름은 ${formatPath(path)} 이어지며, 단순한 결론보다 상황을 확인하는 쪽에 초점이 있습니다.` : "",
    checks.length > 0 ? `따라서 ${checks.join(", ")}를 먼저 확인하도록 안내하면 좋습니다.` : "",
  ]);
}

function buildMissingPoints(missingChecks: string[]) {
  if (missingChecks.length === 0) return [];
  return [`답변에 ${missingChecks.slice(0, 3).join(", ")}처럼 질문에 답하기 위해 확인해야 할 조건이 부족합니다. 의미 설명보다 이 조건을 먼저 잡으면 해석이 더 분명해집니다.`];
}

function buildMissedKeyPoints(missingChecks: string[], missingSecondary: string[]) {
  const points = dedupeKeywords([...missingChecks, ...missingSecondary]).slice(0, 4);
  if (points.length === 0) return [];
  return [`이번 답변에서 가장 보강할 부분은 ${points.join(", ")}를 질문의 실제 확인 항목으로 연결하는 것입니다.`];
}

function buildStructuredTraditionalCorrection(graph: EvaluationResult["interpretation_graph"], llmCorrection: string) {
  const selectedText = graph.selected_meanings.slice(0, 3).join(", ");
  void llmCorrection;
  return joinSentences([
    `이 질문의 답은 ${selectedText}${objectParticle(selectedText)} 중심으로 잡는 것이 좋습니다.`,
    `${graph.card} ${orientationText(graph.orientation)}은 ${graph.traditional_meanings.slice(0, 4).join(", ")}의 흐름으로 그 선택을 뒷받침합니다.`,
  ]);
}

function buildRealityApplication(category: string, checks: string[], graph: EvaluationResult["interpretation_graph"]) {
  const focus = categoryFocus(category);
  const examples = checks.slice(0, 3).join(", ");

  return joinSentences([
    `실제 상담에서는 ${graph.selected_meanings[0] ?? "선택한 의미"}${objectParticle(graph.selected_meanings[0] ?? "선택한 의미")} 단정하기보다, ${focus} 안에서 어디가 흔들리는지 먼저 묻는 정도가 적절합니다.`,
    examples ? `예를 들어 ${examples} 등을 함께 살펴볼 수 있습니다.` : "",
  ]);
}

function buildModelAnswer(graph: EvaluationResult["interpretation_graph"], path: string[], checks: string[]) {
  const primaryConcept = graph.selected_meanings[0] ?? "선택한 의미";
  if (path.length < 2 && checks.length < 2) {
    return joinSentences([
      `이 질문의 답은 ${primaryConcept}${objectParticle(primaryConcept)} 중심으로 잡는 것이 좋습니다.`,
      `질문자가 묻는 "${graph.question_focus}"에 직접 답하려면, 카드의 모든 뜻을 늘어놓기보다 ${graph.counseling_sentence}`,
    ]);
  }

  return joinSentences([
    `지금 이 질문에서는 ${primaryConcept}${objectParticle(primaryConcept)} 중심으로 읽어야 합니다.`,
    checks.length >= 2 ? `내담자에게는 ${checks[0]}${joinParticle(checks[0])} ${checks[1]}${objectParticle(checks[1])} 먼저 확인해야 한다고 말하면 됩니다.` : "",
    path.length >= 2 ? `이렇게 말하면 질문에 대한 답이 ${formatPath(path.slice(0, 3))} 이어지는 판단 기준으로 정리됩니다.` : "",
  ]);
}

function buildStudentStyleAnswer(graph: EvaluationResult["interpretation_graph"], checks: string[]) {
  const primaryConcept = graph.selected_meanings[0] ?? "선택한 의미";
  return checks.length >= 2
    ? `완성형 답변으로는 먼저 ${primaryConcept}${objectParticle(primaryConcept)} 말한 뒤, ${checks[0]}${joinParticle(checks[0])} ${checks[1]}${objectParticle(checks[1])} 확인해야 한다고 이어가면 좋습니다. ${graph.counseling_sentence}`
    : `완성형 답변으로는 ${primaryConcept}${objectParticle(primaryConcept)} 질문 상황에 연결하고, ${graph.counseling_sentence}`;
}

function buildWrongNote(missingChecks: string[], path: string[], graph: EvaluationResult["interpretation_graph"], userAnswer: string) {
  const selected = graph.selected_meanings[0] ?? "선택한 의미";
  const answerSummary = userAnswer.trim().length >= 30 ? `이번 답변은 "${graph.question_focus}"에 답하려는 방향은 잡았습니다.` : "이번 답변은 아직 카드 의미를 질문에 연결하는 설명이 짧습니다.";
  if (missingChecks.length === 0) {
  return joinSentences([
    answerSummary,
    `다만 다음에는 ${selected}${objectParticle(selected)} 왜 선택했는지 먼저 말하고, 그 의미가 질문에 어떻게 연결되는지 더 분명히 보여주세요.`,
    path.length >= 2 ? `${formatPath(path.slice(0, 3))} 이어지는 흐름을 한 문장으로 연결하면 해석이 더 설득력 있어집니다.` : "",
  ]);
}

  return joinSentences([
    answerSummary,
    `다만 ${selected}${subjectParticle(selected)} 단순히 조심하라는 뜻으로 끝나면 부족합니다. 이 의미가 실제로 무엇을 확인하라는 말인지 구체화해야 합니다.`,
    `다음 답변에서는 ${missingChecks.slice(0, 3).join(", ")} 중 최소 두 가지를 함께 언급하면 질문에 대한 답이 더 선명해집니다.`,
  ]);
}

function buildNextReadingTip(checks: string[]) {
  return checks.length >= 2
    ? `다음에는 카드 키워드 하나를 말한 뒤, ${joinPair(checks[0], checks[1])} 함께 확인하라고 안내하세요.`
    : "다음에는 카드 키워드 하나를 말한 뒤, 내담자가 확인할 현실 조건 두 가지를 함께 제시하세요.";
}

function contextualizeChecks(category: string, checks: string[]) {
  const fallbackByCategory: Record<string, string[]> = {
    health: ["수면 상태", "피로 누적", "감정 기복", "업무 부담", "휴식 가능 시간"],
    love: ["상대의 현재 태도", "내 감정의 기준", "관계 속도", "반복되는 대화 패턴", "실제로 확인된 행동"],
    reunion: ["연락의 목적", "과거 갈등의 원인", "상대의 책임 있는 행동", "재회 후 달라질 조건", "감정 정리 상태"],
    relationship: ["역할 분담", "정보 공유 방식", "책임 범위", "기대치 차이", "실제 약속 이행"],
    business: ["비용 구조", "역할 분담", "일정", "계약 조건", "운영 체계"],
    money: ["수입과 지출", "현금 흐름", "고정비", "투자 위험", "비상 자금"],
    career: ["업무 범위", "일정", "역량 준비", "조직의 기대", "다음 단계"],
  };
  const fallback = fallbackByCategory[category];
  if (!fallback) return checks;
  if (checks.length < 2) return fallback;
  return hasOffTopicTerms(category, checks) ? fallback : checks;
}

function hasOffTopicTerms(category: string, values: string[]) {
  const text = values.join(" ");
  const offTopicByCategory: Record<string, string[]> = {
    health: ["계약", "서면", "수익", "정산", "투자금", "비용 대비", "파트너", "재고"],
    love: ["재고", "정산", "계약", "수익", "고정비", "남은 체력", "체력", "회복 시간", "수면", "휴식"],
    reunion: ["재고", "정산", "계약", "수익", "고정비", "남은 체력", "체력", "회복 시간", "수면", "휴식"],
    money: ["상대의 태도", "재회", "감정 정리"],
  };
  return (offTopicByCategory[category] ?? []).some((term) => text.includes(term));
}

function buildCounselingSentence(category: string, primaryConcept: string) {
  return `${categoryFocus(category)} 안에서 ${primaryConcept}${subjectParticle(primaryConcept)} 어디에서 드러나는지 먼저 확인합니다.`;
}

function categoryFocus(category: string) {
  const focusByCategory: Record<string, string> = {
    health: "몸과 마음의 리듬",
    love: "관계의 균형과 감정 표현",
    reunion: "연락의 목적과 감정 정리",
    relationship: "서로의 역할과 신뢰",
    business: "운영 구조와 책임 범위",
    money: "수입과 지출의 흐름",
    career: "업무 흐름과 다음 선택",
  };

  return focusByCategory[category] ?? "현재 상황";
}

function orientationText(orientation: EvaluationResult["interpretation_graph"]["orientation"]) {
  return orientation === "reversed" ? "역방향" : "정방향";
}

function joinSentences(sentences: Array<string | undefined | null>) {
  return dedupeSentences(sentences).join(" ");
}

function dedupeSentences(sentences: Array<string | undefined | null>) {
  const seen = new Set<string>();
  return sentences
    .map((sentence) => sentence?.trim() ?? "")
    .filter(Boolean)
    .filter((sentence) => {
      const key = normalize(sentence);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function dedupeKeywords(keywords: string[]) {
  const seen = new Set<string>();
  return keywords.filter((keyword) => {
    const key = normalize(keyword);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function avoidTooSimilar(value: string, other: string, fallback: string) {
  return jaccardSimilarity(value, other) >= 0.68 ? fallback : value;
}

function hasAnyCheck(value: string, checks: string[]) {
  return checks.some((check) => includesLoose(value, check));
}

function includesLoose(value: string, needle: string) {
  return normalize(value).includes(normalize(needle));
}

function nonEmpty(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function jaccardSimilarity(left: string, right: string) {
  const leftWords = new Set(words(left));
  const rightWords = new Set(words(right));
  if (leftWords.size === 0 && rightWords.size === 0) return 1;
  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  return intersection / new Set([...leftWords, ...rightWords]).size;
}

function words(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 2);
}

function subjectParticle(value: string) {
  return hasBatchim(value) ? "이" : "가";
}

function objectParticle(value: string) {
  return hasBatchim(value) ? "을" : "를";
}

function joinParticle(value: string) {
  return hasBatchim(value) ? "과" : "와";
}

function directionParticle(value: string) {
  const batchim = getBatchim(value);
  return batchim === 0 || batchim === 8 ? "로" : "으로";
}

function joinPair(left: string, right: string) {
  return `${left}${joinParticle(left)} ${right}${objectParticle(right)}`;
}

function formatPath(path: string[]) {
  const joined = path.join(" -> ");
  const last = path[path.length - 1] ?? "";
  return `${joined}${directionParticle(last)}`;
}

function hasBatchim(value: string) {
  return getBatchim(value) > 0;
}

function getBatchim(value: string) {
  const last = value.trim().charAt(value.trim().length - 1);
  if (!last) return 0;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return 0;
  return (code - 0xac00) % 28;
}
