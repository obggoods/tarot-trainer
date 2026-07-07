import type { CardOrientationMeaning, EvaluationResult, TarotCard, TarotCategory, TarotQuestion } from "../../types/tarot";
import { resolveConceptGraph } from "./conceptGraphResolver";

type HintComposerInput = {
  question: TarotQuestion;
  card: TarotCard;
  meaning: CardOrientationMeaning;
};

const categoryCheckFallbacks: Partial<Record<TarotCategory, string[]>> = {
  health: ["수면 상태", "피로 누적", "감정 기복", "업무 부담", "휴식 가능 시간"],
  love: ["상대의 현재 태도", "내 감정의 기준", "관계 속도", "반복되는 대화 패턴", "실제로 확인된 행동"],
  reunion: ["연락의 목적", "과거 갈등의 원인", "상대의 책임 있는 행동", "재회 후 달라질 조건", "감정 정리 상태"],
  relationship: ["역할 분담", "정보 공유 방식", "책임 범위", "기대치 차이", "실제 약속 이행"],
  business: ["비용 구조", "역할 분담", "일정", "계약 조건", "운영 체계"],
  money: ["수입과 지출", "현금 흐름", "고정비", "투자 위험", "비상 자금"],
  career: ["업무 범위", "일정", "역량 준비", "조직의 기대", "다음 단계"],
};

const categoryActionFallbacks: Partial<Record<TarotCategory, string[]>> = {
  health: ["휴식 계획", "업무 조정", "수면 루틴 점검"],
  love: ["감정 기준 정리", "대화 속도 조절", "확인된 행동 관찰"],
  reunion: ["연락 목적 확인", "과거 문제 정리", "재회 조건 합의"],
  relationship: ["역할 조율", "기대치 확인", "책임 범위 합의"],
  business: ["계획 재점검", "계약 확인", "운영 기준 정리"],
  money: ["지출 점검", "현금 흐름 정리", "위험 한도 설정"],
  career: ["우선순위 정리", "일정 조정", "역량 보강"],
};

export function composeHintInterpretation({ question, card, meaning }: HintComposerInput): EvaluationResult["interpretation_graph"] {
  const graph = resolveConceptGraph({
    cardId: question.card_id,
    orientation: question.orientation,
    category: question.category,
    position: question.position,
  });
  const selectedMeanings = graph.primaryConcepts.map((concept) => concept.name_ko).filter(Boolean);
  const selected = selectedMeanings.length > 0 ? selectedMeanings : [meaning.must_include[0] ?? meaning.keywords[0] ?? card.meta.name_ko];
  const secondary = graph.secondaryConcepts.map((concept) => concept.name_ko).filter(Boolean);
  const traditionalMeanings = unique([...meaning.must_include, ...meaning.keywords, ...selected, ...secondary]).slice(0, 7);
  const rejected = traditionalMeanings
    .filter((item) => !selected.some((selectedMeaning) => includesLoose(selectedMeaning, item) || includesLoose(item, selectedMeaning)))
    .slice(0, 3);
  const checks = contextualizeChecks(question, graph.recommendedChecks).slice(0, 3);
  const actions = contextualizeActions(question, graph.recommendedActions).slice(0, 2);
  const counselingSentence = buildCounselingSentence(selected[0], checks, actions);

  return {
    card: card.meta.name_ko,
    orientation: question.orientation,
    traditional_meanings: traditionalMeanings,
    question_focus: question.position,
    selected_meanings: selected,
    rejected_meanings: rejected.map((meaningItem) => ({
      meaning: meaningItem,
      reason: `${question.position}${subjectParticle(question.position)} 핵심이므로, 이번 힌트에서는 ${meaningItem}${objectParticle(meaningItem)} 전면에 두기보다 ${selected[0]}${objectParticle(selected[0])} 먼저 선택합니다.`,
    })),
    reasoning_bridge: [
      `${card.meta.name_ko} ${orientationText(question.orientation)}은 정통적으로 ${traditionalMeanings.slice(0, 4).join(", ")}을 뜻합니다.`,
      `이 질문은 "${question.position}"을 묻고 있고, 내담자는 ${question.persona.concern}`,
      `따라서 이 카드에서는 ${selected.slice(0, 3).join(", ")}${objectParticle(selected[selected.length - 1])} 중심으로 읽는 것이 적절합니다.`,
    ].join(" "),
    counseling_sentence: counselingSentence,
  };
}

export function composePositionHint(input: HintComposerInput) {
  const interpretation = composeHintInterpretation(input);
  const selected = interpretation.selected_meanings.join(", ");
  const checks = contextualizeChecks(
    input.question,
    resolveConceptGraph({
      cardId: input.question.card_id,
      orientation: input.question.orientation,
      category: input.question.category,
      position: input.question.position,
    }).recommendedChecks,
  ).slice(0, 3);

  return [
    `${input.question.position}에서는 ${input.card.meta.name_ko}의 모든 뜻을 한꺼번에 쓰지 않습니다.`,
    `내담자의 고민은 "${input.question.persona.concern}"이므로, 먼저 ${selected}${objectParticle(selected)} 선택해 답변의 중심으로 잡으세요.`,
    checks.length > 0 ? `답변에는 ${checks.join(", ")} 중 최소 두 가지를 확인하라는 표현이 들어가면 좋습니다.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function composeTraditionalHint(input: HintComposerInput) {
  const interpretation = composeHintInterpretation(input);
  const selected = interpretation.selected_meanings.join(", ");
  const rejected = interpretation.rejected_meanings.map((item) => item.meaning).join(", ");

  return [
    `${interpretation.card} ${orientationText(interpretation.orientation)}은 정통적으로 ${interpretation.traditional_meanings.slice(0, 4).join(", ")}을 뜻합니다.`,
    `이 질문은 "${interpretation.question_focus}"을 묻고 있으므로, 이 카드에서는 ${selected}${objectParticle(selected)} 중심으로 읽는 것이 적절합니다.`,
    rejected ? `반대로 ${rejected}${subjectParticle(rejected)} 완전히 틀린 뜻은 아니지만, 이번 질문에서는 보조 의미로 두는 편이 좋습니다.` : "",
    `따라서 상담에서는 ${interpretation.counseling_sentence}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function composeReflectionQuestions(input: HintComposerInput) {
  const interpretation = composeHintInterpretation(input);
  const selected = interpretation.selected_meanings[0] ?? input.meaning.keywords[0] ?? input.card.meta.name_ko;
  const rejected = interpretation.rejected_meanings[0]?.meaning ?? interpretation.traditional_meanings.find((item) => !includesLoose(item, selected));
  const contrast = rejected ? `${rejected}보다 ${selected}${objectParticle(selected)}` : `${selected}${objectParticle(selected)}`;
  const alternateQuestion = buildAlternateQuestion(input.question.category);
  const alternatePosition = buildAlternatePosition(input.question.position);

  return unique([
    `이 카드의 여러 의미 중 이번 질문에서는 왜 ${contrast} 먼저 떠올려야 할까요?`,
    alternateQuestion ? `만약 질문이 "${alternateQuestion}"였다면, 이번과 같은 의미를 선택했을까요?` : "",
    alternatePosition ? `이 카드가 "${alternatePosition}" 위치에 나왔다면, 선택하는 의미가 어떻게 달라질까요?` : "",
    rejected ? `${rejected}${subjectParticle(rejected)} 더 중요해지는 질문은 어떤 질문일까요?` : "",
    `이 의미를 내담자에게 말한다면, 딱딱한 키워드 대신 어떤 상담 문장으로 바꿀 수 있을까요?`,
  ])
    .filter((question) => question.length > 0)
    .slice(0, 3);
}

function contextualizeChecks(question: TarotQuestion, checks: string[]) {
  const positionFallback = positionCheckFallback(question.position);
  if (positionFallback) return positionFallback;

  const fallback = categoryCheckFallbacks[question.category];
  if (!fallback) return checks.filter(Boolean);
  if (question.category === "health" || question.category === "reunion" || question.category === "love") return fallback;
  if (checks.length < 2) return fallback;
  return hasOffTopicTerms(question.category, checks) ? fallback : checks.filter(Boolean);
}

function contextualizeActions(question: TarotQuestion, actions: string[]) {
  const positionFallback = positionActionFallback(question.position);
  if (positionFallback) return positionFallback;

  const fallback = categoryActionFallbacks[question.category];
  if (!fallback) return actions.filter(Boolean);
  if (question.category === "health" || question.category === "reunion" || question.category === "love") return fallback;
  if (actions.length === 0) return fallback;
  return hasOffTopicTerms(question.category, actions) ? fallback : actions.filter(Boolean);
}

function positionCheckFallback(position: string) {
  if (position.includes("파트너십") || position.includes("협력")) return ["역할 분담", "책임 범위", "정보 공유 방식", "계약 조건", "수익 배분"];
  if (position.includes("확장")) return ["현재 운영 구조", "비용 부담", "재고 수준", "인력 배분", "일정 여유"];
  if (position.includes("건강") || position.includes("몸") || position.includes("마음") || position.includes("회복")) return ["수면 상태", "피로 누적", "감정 기복", "업무 부담", "휴식 가능 시간"];
  if (position.includes("재회") || position.includes("대화")) return ["연락의 목적", "대화가 끊긴 이유", "상대의 책임 있는 행동", "다시 대화할 조건", "감정 정리 상태"];
  return undefined;
}

function positionActionFallback(position: string) {
  if (position.includes("파트너십") || position.includes("협력")) return ["역할과 책임 합의", "조건 문서화", "정보 공유 방식 확인"];
  if (position.includes("확장")) return ["운영 기준 정리", "비용 재점검", "확장 일정 조정"];
  if (position.includes("건강") || position.includes("몸") || position.includes("마음") || position.includes("회복")) return ["휴식 계획", "업무 조정", "수면 루틴 점검"];
  if (position.includes("재회") || position.includes("대화")) return ["연락 목적 확인", "과거 문제 정리", "대화 조건 합의"];
  return undefined;
}

function hasOffTopicTerms(category: TarotCategory, values: string[]) {
  const text = values.join(" ");
  const offTopicByCategory: Partial<Record<TarotCategory, string[]>> = {
    health: ["계약", "서면", "수익", "정산", "투자금", "비용 대비", "파트너", "재고"],
    love: ["재고", "정산", "계약", "수익", "고정비"],
    reunion: ["재고", "정산", "계약", "수익", "고정비"],
    money: ["상대의 태도", "재회", "감정 정리"],
  };
  return (offTopicByCategory[category] ?? []).some((term) => text.includes(term));
}

function buildAlternateQuestion(category: TarotCategory) {
  const examples: Partial<Record<TarotCategory, string>> = {
    business: "이 사업에서 수익이 바로 날까요?",
    money: "돈이 더 들어올 가능성이 있을까요?",
    health: "지금 당장 쉬어야 할 신호는 무엇일까요?",
    love: "상대가 나에게 호감이 있을까요?",
    reunion: "상대가 다시 연락할 마음이 있을까요?",
    relationship: "이 사람을 믿고 함께해도 될까요?",
    career: "지금 이직을 시도해도 괜찮을까요?",
  };
  return examples[category];
}

function buildAlternatePosition(position: string) {
  if (position.includes("조건")) return "주의해야 할 점";
  if (position.includes("위험")) return "지금 활용할 강점";
  if (position.includes("장애물") || position.includes("방해")) return "도움이 되는 태도";
  if (position.includes("조언")) return "현재 상황";
  if (position.includes("현재")) return "앞으로의 조언";
  if (position.includes("확인")) return "상담 조언";
  return "주의해야 할 점";
}

function buildCounselingSentence(primaryConcept: string, checks: string[], actions: string[]) {
  if (checks.length >= 3) {
    return `${primaryConcept}${subjectParticle(primaryConcept)} 핵심이므로, ${checks[0]}, ${checks[1]}, ${checks[2]}부터 확인해보라고 안내하는 것이 좋습니다.`;
  }
  if (checks.length >= 2) {
    return `${primaryConcept}${subjectParticle(primaryConcept)} 핵심이므로, ${checks[0]}${joinParticle(checks[0])} ${checks[1]}${objectParticle(checks[1])} 먼저 확인해보라고 말하는 것이 좋습니다.`;
  }
  if (actions.length > 0) {
    return `${primaryConcept}${subjectParticle(primaryConcept)} 핵심이므로, 지금은 ${actions[0]} 쪽으로 다음 행동을 좁혀보라고 안내하는 것이 좋습니다.`;
  }
  return `${primaryConcept}${subjectParticle(primaryConcept)} 핵심이므로, 결론보다 현재 상황에서 먼저 확인할 조건을 차분히 점검하라고 말하는 것이 좋습니다.`;
}

function includesLoose(value: string, needle: string) {
  return normalize(value).includes(normalize(needle));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function orientationText(orientation: "upright" | "reversed") {
  return orientation === "reversed" ? "역방향" : "정방향";
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

function hasBatchim(value: string) {
  const last = value.trim().charAt(value.trim().length - 1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 > 0;
}
