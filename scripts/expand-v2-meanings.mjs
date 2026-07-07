import fs from "node:fs";
import path from "node:path";

const cards = [
  {
    file: "src/data/tarot/meanings/major/01_magician.json",
    upright: { core: "의지를 실제 행동으로 연결하는 실행력", risk: "말보다 실행 계획이 앞서야 하는 상태", checks: ["실행 주체", "사용 가능한 자원", "첫 행동 일정", "약속 이행 방식"] },
    reversed: { core: "말과 행동의 불일치와 실행력 부족", risk: "그럴듯한 말이나 포장이 실제 변화보다 앞서는 상태", checks: ["말과 행동의 일치", "책임 인정 여부", "실제 실행 기록", "과장된 약속"] },
  },
  {
    file: "src/data/tarot/meanings/major/21_world.json",
    upright: { core: "한 주기의 완성과 다음 단계로 넘어갈 준비", risk: "마무리된 일을 계속 붙잡아 다음 선택이 늦어지는 상태", checks: ["마무리된 범위", "남은 정산", "다음 단계 조건", "완료 기준"] },
    reversed: { core: "완성 지연과 마무리 부족", risk: "끝났다고 생각한 일이 실제로는 정리되지 않은 상태", checks: ["미완료 업무", "정리되지 않은 관계", "종료 조건", "반복되는 지연 사유"] },
  },
  {
    file: "src/data/tarot/meanings/minor/swords/07.json",
    upright: { core: "정보 비대칭과 책임 회피 구조", risk: "드러난 말보다 숨겨진 조건이 판단을 흔드는 상태", checks: ["계약서 문구", "업무 범위", "책임 소재", "정보 공개 방식"] },
    reversed: { core: "숨겨진 문제가 드러나며 솔직한 정리가 필요한 상태", risk: "감춰 둔 조건이나 회피가 노출되어 신뢰가 흔들리는 상태", checks: ["드러난 사실", "해명 내용", "수정 가능한 조건", "재발 방지 약속"] },
  },
  {
    file: "src/data/tarot/meanings/minor/pentacles/page.json",
    upright: { core: "작게 배우며 현실 기반을 다지는 준비성", risk: "가능성은 있지만 검증과 훈련이 아직 필요한 상태", checks: ["학습 계획", "초기 비용", "작은 실험", "반복 가능한 절차"] },
    reversed: { core: "준비 부족과 현실 검증 미흡", risk: "기본 관리가 자리 잡기 전에 일을 넓히는 상태", checks: ["재고 관리 방식", "원가 계산", "업무 프로세스", "일정 관리"] },
  },
  {
    file: "src/data/tarot/meanings/minor/cups/05.json",
    upright: { core: "상실감에 붙잡혀 남은 가능성을 보지 못하는 상태", risk: "후회와 미련이 현재 판단을 좁히는 상태", checks: ["이미 잃은 것", "아직 남은 선택지", "후회가 커진 이유", "회복 가능한 연결"] },
    reversed: { core: "상실감에서 벗어나 현실을 받아들이는 회복 흐름", risk: "회복이 시작됐지만 미련이 다시 판단을 흔들 수 있는 상태", checks: ["받아들인 사실", "남은 미련", "회복 행동", "다시 반복하지 않을 기준"] },
  },
  {
    file: "src/data/tarot/meanings/minor/wands/10.json",
    upright: { core: "감당해야 할 부담이 한계까지 쌓인 상태", risk: "책임을 혼자 짊어져 지속 가능성이 떨어지는 상태", checks: ["맡은 업무량", "분담 가능성", "마감 압박", "소진 신호"] },
    reversed: { core: "부담을 내려놓거나 책임 회피가 드러나는 상태", risk: "필요한 책임 조정과 무책임한 회피를 구분해야 하는 상태", checks: ["내려놓을 일", "계속 맡을 책임", "도움 요청 대상", "회피 중인 의무"] },
  },
  {
    file: "src/data/tarot/meanings/minor/swords/04.json",
    upright: { core: "멈춤과 회복을 통해 판단을 정리해야 하는 상태", risk: "바로 움직이면 피로와 혼란이 결정을 흐리는 상태", checks: ["휴식 필요성", "결정 보류 기간", "회복 자원", "다시 판단할 시점"] },
    reversed: { core: "쉬어도 회복되지 않거나 움직임을 재개해야 하는 상태", risk: "휴식이 회피로 바뀌거나 회복 없이 다시 무리하는 상태", checks: ["회복 정도", "미룬 결정", "재개 시점", "재발하는 피로"] },
  },
  {
    file: "src/data/tarot/meanings/minor/pentacles/03.json",
    upright: { core: "협업과 기술을 맞춰 성과를 만드는 구조", risk: "각자의 역할과 기준을 맞춰야 결과가 안정되는 상태", checks: ["역할 분담", "전문성 수준", "작업 기준", "검수 방식"] },
    reversed: { core: "협업 불균형과 기준 미달", risk: "팀워크보다 역할 혼선과 품질 차이가 문제를 만드는 상태", checks: ["역할 중복", "기준 불일치", "실력 차이", "피드백 방식"] },
  },
  {
    file: "src/data/tarot/meanings/major/06_lovers.json",
    upright: { core: "서로의 선택과 가치가 맞물리는 관계 결정", risk: "감정만으로 선택하면 책임 조건을 놓칠 수 있는 상태", checks: ["상호 선택 의지", "가치관 일치", "관계의 책임", "동의한 기준"] },
    reversed: { core: "선택의 불일치와 관계 조율 실패", risk: "한쪽의 마음이나 기준이 맞지 않아 결정이 흔들리는 상태", checks: ["선택 의지 차이", "기대 불일치", "관계 기준", "회피한 대화"] },
  },
  {
    file: "src/data/tarot/meanings/major/02_high_priestess.json",
    upright: { core: "겉으로 드러나지 않은 진실과 직관적 관찰", risk: "보이는 말보다 숨은 맥락을 더 확인해야 하는 상태", checks: ["말하지 않은 정보", "감정의 거리", "직감의 근거", "확인되지 않은 사실"] },
    reversed: { core: "비밀의 왜곡과 직관 혼란", risk: "추측과 불안이 사실 확인을 대신하는 상태", checks: ["확인된 사실", "소문과 추측", "숨긴 정보", "감정적 과해석"] },
  },
];

const axes = [
  { category: "business", position: "warning", label: "사업 위험", focus: "사업에서 조심해야 할 위험", checks: ["비용 구조", "계약 조건", "운영 부담"] },
  { category: "business", position: "advice", label: "사업 조언", focus: "사업에서 먼저 취할 태도", checks: ["우선순위", "실행 순서", "검증 기준"] },
  { category: "love", position: "current", label: "연애 현재", focus: "현재 관계에서 드러나는 실제 흐름", checks: ["상대의 반응", "감정의 균형", "대화 흐름"] },
  { category: "love", position: "advice", label: "연애 조언", focus: "관계를 다룰 때 필요한 태도", checks: ["표현 방식", "속도 조절", "확인할 마음"] },
  { category: "reunion", position: "obstacle", label: "재회 장애물", focus: "재회를 어렵게 만드는 핵심 장애물", checks: ["과거 갈등", "연락의 목적", "변화의 증거"] },
  { category: "reunion", position: "advice", label: "재회 조언", focus: "재회를 원할 때 먼저 정리할 태도", checks: ["사과와 책임", "대화 조건", "반복 패턴"] },
  { category: "relationship", position: "partnership_check", label: "인간관계 확인 조건", focus: "협력이나 관계에서 확인할 조건", checks: ["역할 경계", "책임 범위", "정보 공유"] },
  { category: "health", position: "warning", label: "건강 경고", focus: "몸과 마음에서 조심해야 할 신호", checks: ["피로 신호", "생활 리듬", "회복 시간"] },
];

function buildContext(cardName, orientationLabel, profile, axis) {
  const checks = unique([...axis.checks, ...profile.checks]).slice(0, 5);
  return {
    selected_meaning: `${axis.label}에서의 ${profile.core}`,
    real_world_issues: [
      `${axis.focus}을 볼 때 ${profile.risk}로 나타날 수 있음`,
      `${cardName} ${orientationLabel}의 핵심을 ${axis.label}의 실제 판단 기준으로 바꾸어 확인해야 함`,
      `${checks[0]}과 ${checks[1]}이 흐리면 내담자가 같은 문제를 반복할 수 있음`,
    ],
    concrete_checks: checks,
    bad_readings: [
      `${cardName}의 대표 키워드만 말하고 ${axis.label}의 실제 확인 항목으로 옮기지 않기`,
      `${profile.core}을 결과 단정이나 성격 판단으로만 말하기`,
      `${checks[0]}을 확인하지 않고 조언으로 바로 넘어가기`,
    ],
    model_logic: `${axis.label} 질문에서는 ${cardName} ${orientationLabel}을 ${profile.core}로만 설명하지 않고, ${axis.focus} 속에서 ${checks.slice(0, 3).join(", ")}를 확인하라는 구조로 좁혀 읽는다.`,
  };
}

function buildHint(cardName, orientationLabel, profile, axis) {
  const checks = unique([...axis.checks, ...profile.checks]).slice(0, 5);
  return {
    hint_keywords: unique([profile.core, profile.risk, ...checks]).slice(0, 5),
    hint_title: `${axis.label}: ${profile.core}`,
    hint_body: `${cardName} ${orientationLabel}은 이 축에서 ${profile.core}을 ${axis.focus}의 언어로 바꾸어 읽습니다. 초보자는 카드 뜻을 설명하고 끝내기 쉬운데, 여기서는 ${checks.slice(0, 3).join(", ")}가 실제로 어떻게 드러나는지까지 말해야 합니다.`,
    answer_seed: `${axis.label}에서는 ${profile.core}이 핵심입니다. 내담자에게는 ${checks.slice(0, 3).join(", ")}를 먼저 확인하라고 말하면 답변이 카드 일반론에 머물지 않습니다.`,
  };
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

for (const card of cards) {
  const filePath = path.join(process.cwd(), card.file);
  const entry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const cardName = entry.name_ko;

  for (const orientation of ["upright", "reversed"]) {
    const orientationLabel = orientation === "upright" ? "정방향" : "역방향";
    const meaning = entry.meanings[orientation];
    const profile = card[orientation];
    meaning.question_contexts ??= {};
    meaning.training_hints ??= {};

    for (const axis of axes) {
      meaning.question_contexts[axis.category] ??= {};
      meaning.training_hints[axis.category] ??= {};
      meaning.question_contexts[axis.category][axis.position] = buildContext(cardName, orientationLabel, profile, axis);
      meaning.training_hints[axis.category][axis.position] = buildHint(cardName, orientationLabel, profile, axis);
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
}

console.log(`Expanded ${cards.length} cards x 2 orientations x ${axes.length} axes.`);
