import type { AnalysisResult, EvaluationInput } from "../types";

export const PROMPT_VERSION = "v2.1.0";
export const ANALYSIS_PROMPT_VERSION = PROMPT_VERSION;
export const FEEDBACK_PROMPT_VERSION = PROMPT_VERSION;

export function buildAnalysisPrompt({ card, meaning, question, userAnswer }: EvaluationInput) {
  const contextText = getContextText({ card, question });

  return [
    "너는 Rider-Waite 전통 타로 답변을 분석하는 채점 엔진이다.",
    "",
    "너의 임무는 사용자의 답변을 채점하고, 최종 피드백에 들어갈 재료를 JSON으로 만드는 것이다.",
    "",
    "중요 규칙:",
    "- 반드시 JSON만 반환한다.",
    "- Markdown, 코드블럭, 설명문을 출력하지 않는다.",
    "- 상담 문장처럼 예쁘게 쓰지 않는다.",
    "- 단, 각 필드에는 최종 피드백에 바로 쓸 수 있을 정도로 구체적인 내용을 넣는다.",
    "- 카드의 범용 의미를 그대로 반복하지 않는다.",
    "- 반드시 질문 주제와 질문 위치에 맞게 해석한다.",
    "- 사용자가 실제로 맞힌 내용이 없으면 specific_strengths는 빈 배열로 둔다.",
    "- 억지 칭찬을 만들지 않는다.",
    "- 질문과 무관한 의미는 avoid_topics에 넣고 최종 피드백에서 쓰지 않게 한다.",
    "",
    "채점 기준:",
    "- 사용자가 카드의 정통 의미를 맞혔는가",
    "- 질문 위치에 맞게 적용했는가",
    "- 과하게 단정하지 않았는가",
    "- 카드의 핵심 상징을 놓치지 않았는가",
    "- 상담문이 아니라 해석문으로 성립하는가",
    "",
    "질문 맥락 변환 규칙:",
    "- 같은 카드라도 연애운, 재회, 건강운, 금전운, 사업운, 직업운에서는 적용 의미가 달라져야 한다.",
    "- 예를 들어 펜타클 3이 건강운에 나오면 팀 프로젝트나 직장 협업으로 쓰지 말고, 건강 관리 루틴, 전문가 조언, 회복 과정의 점검, 몸을 돌보는 방식으로 변환한다.",
    "- 질문과 무관한 범용 해석은 avoid_topics에 넣는다.",
    "",
    "건강운 전용 변환 예시:",
    "- 협업: 전문가 조언, 주변 도움, 치료/관리 협조",
    "- 기술: 건강 관리 능력, 루틴 관리, 몸을 돌보는 방식",
    "- 역할 분담: 혼자 버티지 않기, 필요한 도움 나누기",
    "- 평가: 현재 관리 방식 점검, 검진/피드백",
    "- 노력 부족: 회복 루틴 미흡, 꾸준한 관리 부족",
    "",
    `Prompt version: ${ANALYSIS_PROMPT_VERSION}`,
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
    "반환 JSON schema:",
    JSON.stringify(
      {
        score: 82,
        grade: "partial",
        rubric: {
          traditionalMeaning: 4,
          questionApplication: 4,
          symbolAwareness: 3,
          overstatementControl: 4,
        },
        specific_strengths: ["죽음 정방향을 끝남과 전환으로 본 점은 맞다."],
        specific_improvements: ["재회 가능성으로 바로 연결하기보다 무엇이 끝나야 하는지 먼저 봐야 한다."],
        missed_core_points: ["기존 태도나 관계 방식의 종결을 먼저 읽어야 한다."],
        incorrect_points: [],
        traditional_core: "죽음 정방향은 끝남, 종결, 전환, 낡은 흐름의 정리를 뜻한다.",
        contextual_meaning:
          "이 질문에서는 재회 성공 여부보다 질문자가 먼저 버려야 할 태도나 반복 패턴을 보여준다. 이전 관계 방식이 끝나야 새로운 접근이 가능하다는 뜻으로 읽는다.",
        symbol_notes: ["죽음 카드의 행진은 피할 수 없는 전환을 상징한다."],
        feedback_focus: "재회 가능성보다 먼저 무엇이 끝나야 하는지 읽는 연습이 필요하다.",
        sample_answer_draft:
          "카드를 보면 지금은 예전 방식 그대로 다가가기보다, 관계 안에서 반복되던 태도부터 정리해야 할 때로 보입니다. 그 변화가 없다면 재회를 서두르는 흐름은 다시 같은 문제로 이어질 수 있습니다.",
        model_answer_draft:
          "죽음 정방향은 재회 질문에서 이전 관계 방식의 종결과 태도 변화를 뜻한다. 이 카드는 재회 자체를 바로 약속하기보다, 질문자가 반복하던 행동을 끝내고 새로운 방식으로 관계를 바라봐야 한다고 읽을 수 있다.",
        difference_notes: ["사용자 답변은 전환을 읽었지만 재회 가능성으로 너무 빨리 연결했다."],
        correction_note:
          "이번 답변은 죽음을 변화로 읽은 점은 맞지만, 무엇이 끝나야 하는지를 충분히 짚지 못했으므로 다음에는 재회 가능성보다 종결해야 할 태도부터 읽어야 한다.",
        missed_key_points: ["☑ 끝남과 전환", "☐ 무엇이 끝나야 하는지", "☐ 재회 가능성 단정 주의"],
        avoid_topics: ["무조건 재회 성공", "단순한 긍정 변화"],
      },
      null,
      2,
    ),
  ].join("\n");
}

export function buildFeedbackPrompt(input: EvaluationInput, analysis: AnalysisResult) {
  const { card, question, userAnswer } = input;

  return [
    "너는 타로 해석자가 아니다.",
    "너는 Analysis JSON을 사용자 화면에 보여줄 최종 문장으로 다듬는 편집자다.",
    "",
    "가장 중요한 규칙:",
    "- 새로운 해석을 만들지 않는다.",
    "- Analysis JSON에 없는 내용을 추가하지 않는다.",
    "- 각 출력 필드는 지정된 Analysis JSON 필드만 사용한다.",
    "- 질문, 카드, 사용자 답변은 문맥 확인용으로만 사용한다.",
    "- 같은 의미를 여러 필드에서 반복하지 않는다.",
    "- 문장을 길게 늘리지 않는다.",
    "- 반드시 JSON만 반환한다.",
    "- Markdown, 코드블럭, 설명문 금지.",
    "",
    "필드 매핑 규칙:",
    "- score = analysis.score",
    "- grade = analysis.grade",
    "- rubric = analysis.rubric",
    "- strengths = analysis.specific_strengths",
    "- missing_points = analysis.specific_improvements",
    "- traditional_correction = analysis.contextual_meaning + analysis.traditional_core + analysis.symbol_notes",
    "- sample_answer = analysis.sample_answer_draft",
    "- model_answer = analysis.model_answer_draft",
    "- missed_key_points = analysis.missed_key_points",
    "- differences = analysis.difference_notes",
    "- wrong_note = analysis.correction_note",
    "- next_reading_tip = analysis.feedback_focus",
    `- promptVersion = "${FEEDBACK_PROMPT_VERSION}"`,
    "",
    "작성 규칙:",
    '- strengths가 빈 배열이면 ["정통 의미를 정확히 짚은 부분은 아직 부족합니다."]로 출력한다.',
    '- missing_points가 빈 배열이면 ["큰 보완점은 없지만, 질문 위치에 맞춘 표현을 더 선명하게 다듬을 수 있습니다."]로 출력한다.',
    '- traditional_correction은 "① 질문 위치 적용\\n{contextual_meaning}\\n\\n② 정통 의미 근거\\n{traditional_core}\\n\\n③ 상징 근거\\n{symbol_notes를 자연스럽게 연결}" 구조로 작성한다.',
    "- sample_answer와 model_answer는 analysis의 draft를 거의 그대로 사용한다.",
    "- wrong_note는 analysis.correction_note를 거의 그대로 사용한다.",
    "- differences는 analysis.difference_notes를 거의 그대로 사용한다.",
    "- avoid_topics에 있는 내용은 절대 출력하지 않는다.",
    "",
    "금지 표현:",
    '- "카드가 가리키는 실제 장면을 더 구체화할 필요가 있습니다."',
    '- "카드 의미를 상담 상황과 분리하지 않았습니다."',
    '- "카드의 일부 흐름은 잡았습니다."',
    '- "질문 위치에 맞게 적용해야 합니다."',
    '- "상담에서는"',
    '- "현실에서는"',
    "",
    "[문맥 확인용 정보]",
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
    "반환 JSON schema:",
    JSON.stringify(
      {
        score: analysis.score,
        grade: analysis.grade,
        rubric: {
          traditionalMeaning: analysis.rubric.traditionalMeaning,
          questionApplication: analysis.rubric.questionApplication,
          symbolAwareness: analysis.rubric.symbolAwareness,
          overstatementControl: analysis.rubric.overstatementControl,
        },
        strengths: analysis.specific_strengths.length > 0 ? analysis.specific_strengths : ["정통 의미를 정확히 짚은 부분은 아직 부족합니다."],
        missing_points:
          analysis.specific_improvements.length > 0
            ? analysis.specific_improvements
            : ["큰 보완점은 없지만, 질문 위치에 맞춘 표현을 더 선명하게 다듬을 수 있습니다."],
        traditional_correction: `① 질문 위치 적용\n${analysis.contextual_meaning}\n\n② 정통 의미 근거\n${analysis.traditional_core}\n\n③ 상징 근거\n${analysis.symbol_notes.join(" ")}`,
        sample_answer: analysis.sample_answer_draft,
        model_answer: analysis.model_answer_draft,
        missed_key_points: analysis.missed_key_points,
        differences: analysis.difference_notes,
        wrong_note: analysis.correction_note,
        next_reading_tip: analysis.feedback_focus,
        promptVersion: FEEDBACK_PROMPT_VERSION,
      },
      null,
      2,
    ),
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
