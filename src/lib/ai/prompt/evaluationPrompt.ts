import type { AnalysisResult, EvaluationInput } from "../types";

export const PROMPT_VERSION = "v2.0.0";

export function buildAnalysisPrompt({ card, meaning, question, userAnswer }: EvaluationInput) {
  const contextText = getContextText({ card, question });

  return [
    "너는 Rider-Waite 전통 타로 리딩 답변을 분석하는 채점 엔진이다.",
    "너의 역할은 사용자의 답변을 객관적으로 분석하는 것이다.",
    "사람이 읽는 피드백, 상담 문장, 조언, 예시, 위로 문장을 절대로 작성하지 마라.",
    "문장을 예쁘게 만들려고 하지 말고 판단만 수행하라.",
    "반드시 JSON만 반환하라. Markdown, 코드블럭, JSON 뒤 설명문은 금지한다.",
    "",
    `Prompt version: ${PROMPT_VERSION}`,
    "",
    "[카드 정보]",
    `card_id: ${card.meta.card_id}`,
    `name_ko: ${card.meta.name_ko}`,
    `name_en: ${card.meta.name_en}`,
    `arcana: ${card.meta.arcana}`,
    `suit: ${card.meta.suit ?? "major"}`,
    `orientation: ${question.orientation}`,
    "",
    "[정통 의미 데이터]",
    `keywords: ${meaning.keywords.join(", ")}`,
    `traditional_meaning: ${meaning.traditional_meaning}`,
    `positive_aspect: ${meaning.positive_aspect}`,
    `warning: ${meaning.warning}`,
    `must_include: ${meaning.must_include.join(", ")}`,
    `common_mistakes: ${meaning.common_mistakes.join(", ")}`,
    `symbolism: ${(meaning.symbolism ?? []).join(", ")}`,
    "",
    "[질문]",
    `category: ${question.category}`,
    `position: ${question.position}`,
    `question: ${question.question}`,
    `persona_age: ${question.persona.age}`,
    `persona_background: ${question.persona.background}`,
    `persona_concern: ${question.persona.concern}`,
    `context_for_category: ${contextText}`,
    "",
    "[사용자 답변]",
    userAnswer,
    "",
    "[분석해야 할 항목]",
    "1. 사용자가 정확히 맞춘 정통 의미",
    "2. 부분적으로 맞춘 의미",
    "3. 놓친 핵심 의미",
    "4. 정통 의미와 다른 해석",
    "5. 질문 위치에서 가장 중요한 의미",
    "6. 카드 이미지에서 중요한 상징",
    "7. Feedback AI가 중심으로 설명해야 할 포인트",
    "8. 모범답안에 반드시 포함되어야 하는 내용",
    "",
    "[절대 하지 말 것]",
    "장문 작성 금지",
    "상담 금지",
    "조언 금지",
    "예시 작성 금지",
    "사용자를 위로하는 문장 금지",
    "자연스러운 교육 문장 작성 금지",
    "",
    "[반환 JSON Schema]",
    JSON.stringify(
      {
        score: 82,
        matched_points: ["사용자가 정확히 맞춘 의미"],
        partial_points: ["부분적으로 맞춘 의미"],
        missing_points: ["놓친 핵심 의미"],
        incorrect_points: ["정통 의미와 다른 해석"],
        traditional_summary: {
          core_meaning: "카드 자체의 핵심 정통 의미",
          question_position_meaning: "이 질문 위치에서 가장 중요한 의미",
          important_symbols: ["카드 이미지에서 중요한 상징"],
        },
        feedback_focus: ["최종 피드백에서 중심으로 설명할 포인트"],
        must_include: ["모범답안에 반드시 포함할 내용"],
      },
      null,
      2,
    ),
  ].join("\n");
}

export function buildFeedbackPrompt(input: EvaluationInput, analysis: AnalysisResult) {
  const { card, question, userAnswer } = input;

  return [
    "너는 Rider-Waite 전통 타로 해석을 가르치는 타로 강사이다.",
    "너의 역할은 Analysis JSON을 사람이 읽기 좋은 교육용 피드백으로 바꾸는 것이다.",
    "새로운 해석을 만들지 마라. 반드시 Analysis JSON 안의 내용만 사용하라.",
    "상담 조언보다 정통 의미 학습을 우선하라. 답변 비율은 정통 의미 80%, 사용자 피드백 15%, 상담 적용 5%로 유지하라.",
    "반드시 JSON만 반환하라. Markdown, 코드블럭, 설명문은 금지한다.",
    "",
    `Prompt version: ${PROMPT_VERSION}`,
    "",
    "[질문]",
    `card: ${card.meta.name_ko} / ${card.meta.name_en}`,
    `orientation: ${question.orientation}`,
    `category: ${question.category}`,
    `position: ${question.position}`,
    `question: ${question.question}`,
    `persona_background: ${question.persona.background}`,
    `persona_concern: ${question.persona.concern}`,
    "",
    "[사용자 답변]",
    userAnswer,
    "",
    "[Analysis JSON]",
    JSON.stringify(analysis, null, 2),
    "",
    "[출력 순서]",
    "잘한 점",
    "보완하면 좋은 점",
    "정통 해설",
    "상담 예시",
    "모범 답안",
    "핵심 놓친 포인트",
    "",
    "[작성 규칙]",
    "각 문단은 앞 문단과 자연스럽게 이어져야 한다.",
    "기계적인 첫째, 둘째, 셋째 형식을 피하라.",
    "다만, 또한, 상담에서는, 현실에서는, 주의해야 합니다 같은 표현을 반복하지 마라.",
    "모든 카드가 같은 템플릿처럼 느껴지지 않게 feedback_focus를 중심으로 설명하라.",
    "상담 예시는 정통 의미를 설명한 이후 보조적으로만 작성하라.",
    "모범답안은 설명문이 아니라 사용자가 실제로 작성할 수 있는 답안 형태로 작성하라.",
    "",
    "[필드별 규칙]",
    "strengths는 matched_points만 사용해 작성하라. 추상 칭찬 금지.",
    "differences는 partial_points, missing_points, incorrect_points를 바탕으로 무엇이 부족했는지 구체적으로 설명하라.",
    "traditional_correction은 반드시 ① 이 질문에서의 핵심 해석 ② 근거가 되는 정통 의미 순서로 작성하라.",
    "traditional_correction의 ①은 question_position_meaning과 feedback_focus를 사용해 질문에 직접 답하라.",
    "traditional_correction의 ②는 core_meaning을 2~3문장 이내로 짧게 설명하라.",
    "sample_answer는 실제 상담에서 말할 수 있는 구어체 문장으로 작성하되, 상담 조언이 정통 의미를 덮어쓰지 않게 하라.",
    "model_answer는 must_include를 반영한 3~5문장 답안 형태로 작성하라.",
    "missed_key_points는 matched_points는 ☑, missing_points와 partial_points는 ☐ 로 표시하라.",
    "wrong_note는 정통 의미 반복이 아니라 사용자의 답변이 왜 빗나갔는지 설명하라.",
    "",
    "[반환 JSON 형식]",
    JSON.stringify(
      {
        score: analysis.score,
        grade: "partial",
        rubric: {
          traditionalMeaning: 4,
          questionApplication: 4,
          counselingExpression: 4,
          practicalApplication: 4,
          certaintyControl: 4,
        },
        strengths: ["Analysis JSON의 matched_points를 교육용 문장으로 변환"],
        missing_points: analysis.missing_points,
        traditional_correction:
          "① 이 질문에서의 핵심 해석\nAnalysis JSON의 question_position_meaning을 중심으로 직접 해석\n\n② 근거가 되는 정통 의미\nAnalysis JSON의 core_meaning을 짧게 설명",
        sample_answer: "정통 의미를 바탕으로 한 자연스러운 상담 예시",
        model_answer: "사용자가 실제로 작성할 수 있는 모범 답안",
        missed_key_points: ["☑ 맞게 언급한 핵심", "☐ 빠진 핵심"],
        differences: ["Analysis JSON의 missing_points와 partial_points를 바탕으로 작성"],
        wrong_note: "이번 답변은 A에는 집중했지만 B를 놓쳤습니다.",
        next_reading_tip: "",
        promptVersion: PROMPT_VERSION,
      },
      null,
      2,
    ),
    "",
    "grade는 correct, partial, incorrect 중 하나만 사용하라.",
    "score는 Analysis JSON의 score를 그대로 사용하라.",
  ].join("\n");
}

function getContextText({ card, question }: Pick<EvaluationInput, "card" | "question">) {
  const contexts = card.contexts;
  if (!contexts) return "";

  if (
    question.category === "love" ||
    question.category === "reunion" ||
    question.category === "career" ||
    question.category === "business" ||
    question.category === "money" ||
    question.category === "health"
  ) {
    return contexts[question.category]?.[question.orientation] ?? "";
  }

  return "";
}
