import { PROMPT_VERSION } from "./prompt/evaluationPrompt";
import type { EvaluationInput } from "./types";
import type { EvaluationResult, TarotQuestion } from "../../types/tarot";

const categoryLabel: Record<TarotQuestion["category"], string> = {
  love: "연애운",
  reunion: "재회",
  crush: "썸",
  career: "직업운",
  business: "사업운",
  money: "금전운",
  health: "건강운",
  relationship: "인간관계",
  family: "가족",
  path: "진로운",
  job_change: "이직",
  exam: "시험",
  general: "종합운",
};

export function evaluateWithMock({ card, meaning, question, userAnswer }: EvaluationInput): EvaluationResult {
  const answer = normalize(userAnswer);
  const matches = meaning.must_include.map((keyword) => ({
    keyword,
    matched: matchesConcept(answer, keyword),
  }));
  const matchedKeywords = matches.filter((match) => match.matched).map((match) => match.keyword);
  const missingKeywords = matches.filter((match) => !match.matched).map((match) => match.keyword);
  const traditionalRatio = meaning.must_include.length === 0 ? 1 : matchedKeywords.length / meaning.must_include.length;
  const questionApplicationRatio = getQuestionApplicationRatio(answer, question);
  const semanticFloor = getSemanticFloor(answer, userAnswer, meaning, matchedKeywords.length);
  const weightedScore = Math.round(
    questionApplicationRatio * 35 +
      traditionalRatio * 30 +
      getPracticalRatio(answer) * 15 +
      getCounselingRatio(userAnswer) * 10 +
      getCertaintyRatio(answer) * 10,
  );
  const score = Math.max(weightedScore, semanticFloor);
  const contextText = getContextText({ card, question });

  return {
    score,
    grade: getGrade(score),
    rubric: buildRubric({
      traditionalRatio,
      questionApplicationRatio,
      practicalRatio: getPracticalRatio(answer),
      counselingRatio: getCounselingRatio(userAnswer),
      certaintyRatio: getCertaintyRatio(answer),
    }),
    strengths: buildStrengths(question, card.meta.name_ko, matchedKeywords, questionApplicationRatio),
    missing_points: [],
    traditional_correction: buildTraditionalCorrection(card.meta.name_ko, question, meaning, contextText),
    sample_answer: buildSampleAnswer(question, meaning, contextText),
    differences: buildDifferences(missingKeywords, questionApplicationRatio, question),
    wrong_note: buildWrongNote(card.meta.name_ko, question, meaning),
    next_reading_tip: "",
    promptVersion: PROMPT_VERSION,
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

const conceptAliases: Record<string, string[]> = {
  상실: ["상실", "잃음", "잃어버림", "잃었던것", "잃은것", "잃은", "잃어", "상실감", "실망", "놓친것"],
  후회: ["후회", "미련", "아쉬움", "슬픔", "슬프", "슬퍼", "슬픈", "슬펐", "안타까움", "아깝", "과거에묶", "지나간일"],
  "남은 가능성": ["남은가능성", "희망", "남은것", "남아있는것", "아직가능성", "가능성있", "여지", "남아있", "좋은마음"],
  "관점 전환": ["관점전환", "시선전환", "다르게보기", "다시보기", "남은것에집중", "돌아보", "확인", "시선을옮", "관점을바꾸"],
  끝: ["끝", "종결", "마무리", "끝남", "끝난", "끝에", "한계", "더이상어렵"],
  상처: ["상처", "아픔", "고통", "힘들", "손상", "크게다침"],
  "바닥 이후 회복": ["바닥이후회복", "회복", "다시일어", "새로운시작", "바닥", "회복시간", "정리한뒤"],
  "현실 수용": ["현실수용", "받아들", "인정", "현실을보", "상황을보", "무리하지"],
  속도: ["속도", "빠르게", "빠른", "신속", "급진전", "순식간"],
  진전: ["진전", "진행", "나아가", "움직", "전개", "추진"],
  소식: ["소식", "연락", "메시지", "답변", "승인", "전달"],
  타이밍: ["타이밍", "시기", "기회", "때", "놓치지"],
  보유: ["보유", "지키", "가지고있는", "소유", "붙잡", "유지"],
  절약: ["절약", "아끼", "저축", "낭비하지", "보수적"],
  통제: ["통제", "관리", "조절", "컨트롤", "묶어두"],
  "안정 집착": ["안정집착", "안정", "집착", "불안해서붙잡", "확장보다안정"],
  정지: ["정지", "멈춤", "멈춰", "중단", "보류", "바로움직이기보다"],
  희생: ["희생", "감수", "내려놓", "포기해야", "대가"],
  기다림: ["기다림", "기다려", "시간이필요", "서두르지", "잠시"],
  "상호 호감": ["상호호감", "서로호감", "호감", "쌍방", "서로좋"],
  교감: ["교감", "감정교류", "마음이통", "소통", "반응"],
  균형: ["균형", "동등", "서로주고받", "한쪽만아닌"],
  "관계 형성": ["관계형성", "관계가만들", "가까워", "신뢰", "교류를쌓"],
};

function matchesConcept(normalizedAnswer: string, keyword: string) {
  const aliases = conceptAliases[keyword] ?? [keyword];
  return aliases.some((alias) => normalizedAnswer.includes(normalize(alias)));
}

function getSemanticFloor(
  normalizedAnswer: string,
  userAnswer: string,
  meaning: EvaluationInput["meaning"],
  matchedCount: number,
) {
  if (userAnswer.trim().length < 20) return 0;

  if (matchedCount > 0) {
    return matchedCount === 1 ? 40 : 50;
  }

  const semanticSignals = [
    ...meaning.keywords,
    ...meaning.common_mistakes,
    meaning.traditional_meaning,
    meaning.positive_aspect,
    meaning.warning,
  ];
  const hasAnyMeaningSignal = semanticSignals.some((signal) =>
    signal
      .split(/[,\s.]+/)
      .filter((word) => word.length >= 2)
      .some((word) => normalizedAnswer.includes(normalize(word))),
  );

  return hasAnyMeaningSignal ? 30 : 0;
}

function getGrade(score: number): EvaluationResult["grade"] {
  if (score >= 80) return "correct";
  if (score >= 50) return "partial";
  return "incorrect";
}

function toStars(ratio: number) {
  return Math.max(1, Math.min(5, Math.round(ratio * 5)));
}

function buildRubric({
  traditionalRatio,
  questionApplicationRatio,
  practicalRatio,
  counselingRatio,
  certaintyRatio,
}: {
  traditionalRatio: number;
  questionApplicationRatio: number;
  practicalRatio: number;
  counselingRatio: number;
  certaintyRatio: number;
}): EvaluationResult["rubric"] {
  return {
    traditionalMeaning: toStars(traditionalRatio),
    questionApplication: toStars(questionApplicationRatio),
    counselingExpression: toStars(counselingRatio),
    practicalApplication: toStars(practicalRatio),
    certaintyControl: toStars(certaintyRatio),
  };
}

function getQuestionApplicationRatio(normalizedAnswer: string, question: TarotQuestion) {
  const categoryWords = categoryApplicationSignals[question.category] ?? [];
  const positionWords = splitKoreanPhrase(question.position);
  const questionWords = splitKoreanPhrase(question.question);
  const personaWords = splitKoreanPhrase(`${question.persona.background} ${question.persona.concern}`);
  const signals = [...categoryWords, ...positionWords, ...questionWords, ...personaWords].filter((word) => word.length >= 2);
  if (signals.length === 0) return 0.45;

  const matched = signals.filter((signal) => normalizedAnswer.includes(normalize(signal))).length;
  return Math.max(0.2, Math.min(1, matched / Math.min(signals.length, 5)));
}

function getPracticalRatio(normalizedAnswer: string) {
  const signals = ["조심", "관리", "휴식", "계획", "정리", "무리", "대화", "확인", "기다", "현실", "회복", "선택"];
  return signals.some((signal) => normalizedAnswer.includes(normalize(signal))) ? 0.8 : 0.35;
}

function getCounselingRatio(userAnswer: string) {
  const hasCounselingTone = ["좋겠습니다", "보입니다", "필요합니다", "권합니다", "어렵습니다", "중요합니다"].some((signal) =>
    userAnswer.includes(signal),
  );
  return hasCounselingTone ? 0.85 : 0.45;
}

function getCertaintyRatio(normalizedAnswer: string) {
  const hardClaims = ["무조건", "반드시", "절대", "100%", "확실히", "끝났다", "성공한다", "실패한다"];
  return hardClaims.some((signal) => normalizedAnswer.includes(normalize(signal))) ? 0.35 : 0.9;
}

const categoryApplicationSignals: Partial<Record<TarotQuestion["category"], string[]>> = {
  love: ["관계", "마음", "상대", "연애", "감정"],
  reunion: ["재회", "다시", "연락", "관계", "회복"],
  career: ["직장", "업무", "이직", "커리어", "평가"],
  business: ["사업", "거래", "확장", "협업", "위험"],
  money: ["금전", "돈", "지출", "수입", "관리"],
  health: ["건강", "몸", "마음", "피로", "회복", "무리"],
  relationship: ["관계", "사람", "갈등", "소통", "거리"],
  family: ["가족", "집", "부모", "자녀", "갈등"],
  path: ["진로", "방향", "선택", "미래", "준비"],
  job_change: ["이직", "회사", "직장", "준비", "이동"],
  exam: ["시험", "공부", "준비", "결과", "집중"],
  general: ["흐름", "오늘", "상황", "주의", "조언"],
};

function splitKoreanPhrase(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2)
    .slice(0, 8);
}

function buildDifferences(missingKeywords: string[], questionApplicationRatio: number, question: TarotQuestion) {
  if (missingKeywords.length === 0) {
    if (questionApplicationRatio < 0.6) {
      return [`카드의 기본 의미는 어느 정도 잡았지만, ${question.position}에서 실제로 무엇이 위험하거나 불리한지까지 더 직접적으로 이어지면 좋습니다. 이 답변은 카드 설명은 잡았지만 내담자의 상황에서 드러나는 구체 장면이 아직 약하게 느껴집니다.`];
    }
    return ["전체 방향은 좋습니다. 더 나아가려면 카드 의미를 설명한 뒤 내담자의 실제 상황에서 무엇을 확인하고 조심해야 하는지 한 문장 더 선명하게 잡아보세요."];
  }

  return [
    `${question.position}에서 카드가 가리키는 실제 장면을 더 구체화할 필요가 있습니다. 이번 답변은 카드의 일부 흐름은 잡았지만, 그 의미가 내담자의 상황에서 어떤 주의점이나 가능성으로 드러나는지가 덜 분명하게 느껴집니다.`,
  ];
}

function buildStrengths(question: TarotQuestion, cardName: string, matchedKeywords: string[], questionApplicationRatio: number) {
  if (matchedKeywords.length === 0) {
    return [`${cardName}의 의미를 ${categoryLabel[question.category]} 질문에 연결하려는 방향은 확인됩니다.`];
  }

  const applicationComment =
    questionApplicationRatio >= 0.6
      ? `${categoryLabel[question.category]}의 실제 질문 흐름에 연결하려는 방향도 적절했습니다.`
      : `${question.position}과 연결하려는 시도는 보였지만, 실제 상황 묘사는 아직 짧게 처리되었습니다.`;

  return [
    `${matchedKeywords.join(", ")}의 흐름을 ${cardName}의 정통 의미와 연결한 점은 좋습니다.`,
    applicationComment,
  ];
}

function buildTraditionalCorrection(cardName: string, question: TarotQuestion, meaning: EvaluationInput["meaning"], contextText: string) {
  const positionApplication = buildPositionApplication(question, meaning, contextText);

  return [
    `① 카드의 정통 의미\n${cardName} ${orientationText(question)}은 ${meaning.traditional_meaning}`,
    `② 질문 위치 적용\n${positionApplication}`,
  ].join("\n\n");
}

function buildSampleAnswer(question: TarotQuestion, meaning: EvaluationInput["meaning"], contextText: string) {
  const contextSentence = getOpeningSentence(question, contextText);
  const actionSentence = getActionSentence(question);
  const cautionSentence = meaning.warning || "지금 보이는 흐름을 한쪽으로만 단정하지 않는 편이 좋습니다.";

  return [contextSentence, actionSentence, cautionSentence].join(" ");
}

function buildWrongNote(cardName: string, question: TarotQuestion, meaning: EvaluationInput["meaning"]) {
  return `${cardName}은 ${meaning.must_include.slice(0, 3).join(", ")}를 중심으로 보되, 반드시 "${question.position}" 위치에 맞게 적용해야 합니다. 같은 카드라도 건강운, 연애운, 사업운에서는 답변의 초점이 달라집니다.`;
}

function orientationText(question: TarotQuestion) {
  return question.orientation === "reversed" ? "역방향" : "정방향";
}

function buildPositionApplication(question: TarotQuestion, meaning: EvaluationInput["meaning"], contextText: string) {
  const focus = meaning.must_include.slice(0, 3).join(", ");
  const warning = meaning.warning || "불분명한 흐름을 성급하게 확정하지 않는 태도가 필요하다.";
  const positive = meaning.positive_aspect || "상황을 차분히 파악하면 다음 흐름을 정리할 수 있다.";
  const baseContext = contextText ? `${categoryLabel[question.category]}의 ${question.position}에서는 ${contextText}` : "";
  const sentences = baseContext ? [baseContext] : [];
  const position = question.position;

  if (position.includes("조심") || position.includes("주의")) {
    sentences.push(`이 카드가 가리키는 주의점은 ${focus}의 흐름이 상황 판단을 흐리거나 무리한 선택으로 이어지는 장면이다.`);
    sentences.push(`${warning}`);
    sentences.push(`따라서 ${question.question}에 대해서는 겉으로 보이는 반응보다 확인되지 않은 정보, 감정적 추측, 과도한 부담을 먼저 살펴야 한다.`);
  } else if (position.includes("상대") || position.includes("마음")) {
    sentences.push(`상대의 마음으로 보면 ${focus}가 직접적인 표현을 막거나 속마음을 쉽게 드러내지 않는 상태로 나타난다.`);
    sentences.push(`호감이나 거절을 빠르게 단정하기보다 숨겨진 사정, 말하지 않은 감정, 혼란스러운 태도가 함께 있을 수 있다.`);
    sentences.push(`${warning}`);
  } else if (position.includes("현재")) {
    sentences.push(`현재 상태로는 ${focus}가 지금 상황의 중심 흐름이다.`);
    sentences.push(`겉으로는 움직임이 있어 보여도 내부적으로는 정리되지 않은 감정, 정보, 부담이 남아 있을 수 있다.`);
    sentences.push(`${warning}`);
  } else if (position.includes("가능성") || position.includes("흐름") || position.includes("결과")) {
    sentences.push(`앞으로의 흐름에서는 ${focus}가 결과를 좌우하는 요소로 작용한다.`);
    sentences.push(`${positive}`);
    sentences.push(`${warning}`);
  } else if (position.includes("조언") || position.includes("태도") || position.includes("배울")) {
    sentences.push(`필요한 태도로는 ${focus}를 무시하지 않고 차분히 다루는 자세가 강조된다.`);
    sentences.push(`${positive}`);
    sentences.push(`${warning}`);
  } else {
    sentences.push(`${question.position}에서는 ${focus}가 "${question.question}"의 실제 쟁점으로 드러난다.`);
    sentences.push(`${positive}`);
    sentences.push(`${warning}`);
  }

  return sentences.join("\n");
}

function getOpeningSentence(question: TarotQuestion, contextText: string) {
  if (contextText) {
    return contextText;
  }

  if (question.persona.concern) {
    return `지금 고민은 ${question.persona.concern}`;
  }

  return `지금은 "${question.question}"에 대해 서두르기보다 상황을 차분히 살펴볼 때로 보입니다.`;
}

function getActionSentence(question: TarotQuestion) {
  switch (question.category) {
    case "health":
      return "몸과 마음이 보내는 작은 신호를 넘기지 말고, 쉬어야 할 지점이 있다면 먼저 회복 시간을 확보해보세요.";
    case "business":
      return "계약, 협업, 일정처럼 실제 결과에 영향을 주는 부분은 말로 넘기지 말고 조건을 다시 확인해보세요.";
    case "career":
      return "지금 바로 결론을 내리기보다 업무 흐름과 선택의 부담을 나누어 보면서 다음 움직임을 정해보세요.";
    case "money":
      return "돈의 흐름은 기대보다 확인을 우선하고, 무리한 지출이나 섣부른 약속은 한 번 더 점검해보세요.";
    case "reunion":
      return "상대의 반응만 기다리기보다 지금 관계가 어디에서 멈췄는지 차분히 돌아보는 시간이 필요해 보입니다.";
    case "love":
      return "마음이 앞서더라도 상대와의 실제 흐름을 함께 보면서 관계의 속도를 조절해보세요.";
    case "relationship":
      return "상대의 말과 행동을 추측으로 메우기보다, 확인된 사실과 자신의 불안이 섞이고 있지는 않은지 나누어 보세요.";
    default:
      return `지금 상황에서 가장 먼저 확인해야 할 부분을 차분히 짚어보세요.`;
  }
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
