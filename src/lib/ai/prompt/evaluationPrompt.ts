import type { EvaluationInput } from "../types";

export const PROMPT_VERSION = "v1.4.0";

export function buildEvaluationPrompt({ card, meaning, question, userAnswer }: EvaluationInput) {
  const contextText = getContextText({ card, question });

  return [
    "너는 Rider-Waite 전통 타로 해석을 가르치는 타로 강사이다.",
    "",
    "목표는 점수 산출이 아니라 사용자가 실제 상담 리딩 사고방식을 배우게 하는 것이다.",
    "사용자의 답변을 아래 카드 지식과 질문 맥락에 따라 첨삭하라.",
    "카드 의미를 임의로 확장하거나 새로운 의미를 창작하지 마라.",
    "현실 적용은 반드시 현재 질문의 position, category, question, persona_concern에 맞춰 구체적으로 제시하라.",
    "지나친 단정 표현은 감점하라.",
    "카드 의미와 현실 적용을 구분해서 평가하라.",
    "가장 중요하게 볼 것은 카드 키워드 암기가 아니라 현재 position에서 이 카드가 실제로 무엇을 뜻하는지 설명했는가이다.",
    "최종 피드백 흐름은 반드시 잘한 점, 보완하면 좋은 점, 정통 해설, 상담 예시 순서로 구성하라.",
    "반드시 JSON만 반환하라. 마크다운, 설명문, 코드블록은 금지한다.",
    "",
    `Prompt version: ${PROMPT_VERSION}`,
    "",
    "[평가 우선순위와 점수 비중]",
    "1. 질문 위치의 실제 해석: 35%",
    "2. 정통 의미 이해: 30%",
    "3. 현실 적용: 15%",
    "4. 상담 표현: 10%",
    "5. 단정 표현 여부: 10%",
    "position에서의 실제 해석이 약하면 카드 의미 키워드를 맞혀도 높은 점수를 주지 마라.",
    "",
    "[카드 정보]",
    `card_id: ${card.meta.card_id}`,
    `name_ko: ${card.meta.name_ko}`,
    `name_en: ${card.meta.name_en}`,
    `arcana: ${card.meta.arcana}`,
    `suit: ${card.meta.suit ?? "major"}`,
    `orientation: ${question.orientation}`,
    "",
    "[정통 의미]",
    `keywords: ${meaning.keywords.join(", ")}`,
    `traditional_meaning: ${meaning.traditional_meaning}`,
    `positive_aspect: ${meaning.positive_aspect}`,
    `warning: ${meaning.warning}`,
    `must_include: ${meaning.must_include.join(", ")}`,
    `common_mistakes: ${meaning.common_mistakes.join(", ")}`,
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
    "[섹션별 작성 지침]",
    "각 섹션은 서로 다른 역할을 가져야 하며 같은 설명을 반복하지 마라.",
    "strengths는 '잘한 점'이다. 사용자의 실제 답변에서 잘한 부분만 구체적으로 설명하라. 추상적인 칭찬, 부족한 점, 조언을 섞지 마라.",
    "missing_points는 빈 배열 []로 반환하라. 별도의 키워드 보충 섹션은 만들지 않는다.",
    "differences는 '보완하면 좋은 점'이다. 키워드 나열을 금지하고, 무엇이 부족했는지와 현재 position에서 어떤 실제 해석이 더 필요했는지를 자연스러운 문장으로 설명하라.",
    "traditional_correction은 반드시 ① 카드의 정통 의미 ② 질문 위치 적용 두 가지만 설명하라.",
    "traditional_correction의 ①에서는 카드 자체의 정통 의미만 설명하라. 질문, 상담 문장, 현실 조언을 넣지 마라.",
    "traditional_correction의 ②는 해석 방법론이 아니라 실제 적용 내용이어야 한다.",
    "traditional_correction의 ②에는 현재 position에서 이 카드가 뜻하는 바를 3~5개의 구체 문장으로 설명하라.",
    "traditional_correction의 ②에는 '이 카드는 이 질문에서 무엇을 경계하는가', '무엇이 흐려져 있는가', '무엇이 가능하거나 어려운가', '무엇을 확인해야 하는가'처럼 실제 해석만 써라.",
    "traditional_correction의 ②에는 내담자에게 직접 말하는 상담 문장을 넣지 마라. 상담 문장은 sample_answer에만 작성하라.",
    "sample_answer는 '상담 예시'이다. 내담자에게 직접 말하는 형태로 3~5문장을 작성하라. 메타 설명, 카드사전 요약, 섹션 해설 금지.",
    "next_reading_tip은 빈 문자열 \"\"로 반환하라. 별도의 교육 문장은 만들지 않는다.",
    "",
    "[상담 예시 금지 표현]",
    "sample_answer에는 다음 표현을 쓰지 마라: 상담에서는, 질문자는, 핵심입니다, 중요한 것은, 단정적으로 읽기보다, 실천할 수 있는, 조언하는 것이 좋겠습니다.",
    "",
    "[질문 위치 적용 금지 표현]",
    "traditional_correction의 ②에는 다음 표현을 쓰지 마라: 질문 위치에서는 이렇게 읽어야 합니다, 판단 기준으로 바꾸어 해석해야 합니다, 카드 의미를 그대로 적용하면 안 됩니다, 질문 위치를 고려해야 합니다, 카드를 질문에 맞게 읽어야 합니다.",
    "traditional_correction의 ②에는 '어떻게 읽어야 하는가'가 아니라 '이 카드가 이 질문에서 무엇을 뜻하는가'만 작성하라.",
    "같은 의미를 표현만 바꾸어 반복하지 마라. 정통 해설에서 설명한 카드 의미는 상담 예시에서 다시 정의하지 말고 현실 상황에 맞는 말로 바꾸어 전달하라.",
    "",
    "[반환 JSON 형식]",
    JSON.stringify(
      {
        score: 82,
        grade: "partial",
        rubric: {
          traditionalMeaning: 4,
          questionApplication: 4,
          counselingExpression: 5,
          practicalApplication: 4,
          certaintyControl: 5,
        },
        strengths: ["사용자 답변에서 실제로 잘 연결한 부분을 구체적으로 설명"],
        missing_points: [],
        traditional_correction:
          "① 카드의 정통 의미\n카드 자체의 정통 의미만 설명\n\n② 질문 위치 적용\n현재 position에서 이 카드가 실제로 뜻하는 내용을 3~5문장으로 설명",
        sample_answer: "내담자에게 직접 말하는 실제 상담 답변 3~5문장",
        differences: ["현재 position에서 더 구체화해야 할 실제 해석을 문장으로 설명"],
        wrong_note: "오답노트",
        next_reading_tip: "",
        promptVersion: PROMPT_VERSION,
      },
      null,
      2,
    ),
    "",
    "grade는 correct, partial, incorrect 중 하나만 사용하라.",
    "score는 0부터 100 사이 정수로 반환하라.",
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
