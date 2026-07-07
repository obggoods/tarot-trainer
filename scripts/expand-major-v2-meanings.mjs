import fs from "node:fs";
import path from "node:path";

const majorProfiles = [
  {
    file: "src/data/tarot/meanings/major/00_fool.json",
    upright: { core: "새로운 시작과 아직 검증되지 않은 가능성", risk: "경험보다 기대가 앞서 준비 없이 뛰어드는 상태", checks: ["첫 행동의 근거", "예상하지 못한 변수", "안전장치", "주변 조언"] },
    reversed: { core: "무모함과 준비 없는 출발", risk: "위험 신호를 가볍게 보고 같은 실수를 반복하는 상태", checks: ["충동적 결정", "준비 자료", "책임질 범위", "중단 기준"] },
  },
  {
    file: "src/data/tarot/meanings/major/01_magician.json",
    upright: { core: "의지를 실제 행동으로 연결하는 실행력", risk: "말보다 실행 계획이 앞서야 하는 상태", checks: ["실행 주체", "사용 가능한 자원", "첫 행동 일정", "약속 이행 방식"] },
    reversed: { core: "말과 행동의 불일치와 실행력 부족", risk: "그럴듯한 말이나 포장이 실제 변화보다 앞서는 상태", checks: ["말과 행동의 일치", "책임 인정 여부", "실제 실행 기록", "과장된 약속"] },
  },
  {
    file: "src/data/tarot/meanings/major/02_high_priestess.json",
    upright: { core: "겉으로 드러나지 않은 진실과 직관적 관찰", risk: "보이는 말보다 숨은 맥락을 더 확인해야 하는 상태", checks: ["말하지 않은 정보", "감정의 거리", "직감의 근거", "확인되지 않은 사실"] },
    reversed: { core: "비밀의 왜곡과 직관 혼란", risk: "추측과 불안이 사실 확인을 대신하는 상태", checks: ["확인된 사실", "소문과 추측", "숨긴 정보", "감정적 과해석"] },
  },
  {
    file: "src/data/tarot/meanings/major/03_empress.json",
    upright: { core: "성장과 돌봄이 실제 결과로 이어지는 흐름", risk: "가능성이 자라지만 관리가 느슨하면 낭비로 번질 수 있는 상태", checks: ["돌봄의 방식", "자원 사용", "성장 속도", "받는 사람의 반응"] },
    reversed: { core: "과잉 돌봄과 성장 정체", risk: "챙겨주는 마음이 부담이나 의존으로 바뀌는 상태", checks: ["과잉 개입", "자원 소모", "상대의 자율성", "멈춰 있는 성장"] },
  },
  {
    file: "src/data/tarot/meanings/major/04_emperor.json",
    upright: { core: "질서와 책임으로 구조를 세우는 힘", risk: "기준은 필요하지만 유연성이 부족하면 압박으로 느껴지는 상태", checks: ["결정 권한", "규칙의 기준", "책임 범위", "관리 방식"] },
    reversed: { core: "경직된 통제와 책임 구조의 흔들림", risk: "권위가 강압으로 흐르거나 책임자가 제 역할을 하지 못하는 상태", checks: ["통제 방식", "권한 남용", "책임 공백", "규칙의 불공정함"] },
  },
  {
    file: "src/data/tarot/meanings/major/05_hierophant.json",
    upright: { core: "검증된 기준과 조언을 따르는 안정성", risk: "관습이나 전문가 의견을 확인해야 길이 선명해지는 상태", checks: ["공식 기준", "전문가 조언", "윤리적 기준", "공동체 규칙"] },
    reversed: { core: "관습 충돌과 독단적인 기준", risk: "정해진 방식이 맞지 않거나 권위 있는 말이 오히려 판단을 막는 상태", checks: ["낡은 규칙", "타인의 강요", "개인 기준", "규칙을 벗어날 이유"] },
  },
  {
    file: "src/data/tarot/meanings/major/06_lovers.json",
    upright: { core: "서로의 선택과 가치가 맞물리는 관계 결정", risk: "감정만으로 선택하면 책임 조건을 놓칠 수 있는 상태", checks: ["상호 선택 의지", "가치관 일치", "관계의 책임", "동의한 기준"] },
    reversed: { core: "선택의 불일치와 관계 조율 실패", risk: "한쪽의 마음이나 기준이 맞지 않아 결정이 흔들리는 상태", checks: ["선택 의지 차이", "기대 불일치", "관계 기준", "회피한 대화"] },
  },
  {
    file: "src/data/tarot/meanings/major/07_chariot.json",
    upright: { core: "방향을 정하고 밀고 나가는 추진력", risk: "의지가 강하지만 조율 없이 밀어붙이면 충돌이 생기는 상태", checks: ["목표 방향", "추진 속도", "갈등 조율", "통제 가능한 변수"] },
    reversed: { core: "방향 상실과 통제되지 않는 속도", risk: "움직임은 있지만 서로 다른 힘이 엇갈려 결과가 흔들리는 상태", checks: ["목표 불일치", "속도 과잉", "통제력 부족", "중단할 지점"] },
  },
  {
    file: "src/data/tarot/meanings/major/08_strength.json",
    upright: { core: "부드러운 인내와 감정 조절로 상황을 다루는 힘", risk: "힘으로 누르기보다 감정과 욕구를 길들여야 하는 상태", checks: ["감정 조절", "기다릴 수 있는 시간", "상대의 긴장", "부드러운 설득"] },
    reversed: { core: "자신감 저하와 감정 통제의 약화", risk: "불안이나 분노가 앞서 관계와 판단을 흔드는 상태", checks: ["감정 폭발 지점", "자신감 저하", "참는 척하는 태도", "회복할 힘"] },
  },
  {
    file: "src/data/tarot/meanings/major/09_hermit.json",
    upright: { core: "혼자 숙고하며 핵심을 찾는 시간", risk: "외부 반응보다 내 기준을 정리해야 답이 보이는 상태", checks: ["혼자 생각할 시간", "내 기준", "거리 두기", "조언을 구할 사람"] },
    reversed: { core: "고립과 답을 미루는 회피", risk: "생각이 깊어지는 대신 단절이나 침묵으로 굳어지는 상태", checks: ["고립 기간", "피하고 있는 대화", "도움 요청", "생각의 반복"] },
  },
  {
    file: "src/data/tarot/meanings/major/10_wheel_of_fortune.json",
    upright: { core: "흐름의 전환과 타이밍 변화", risk: "상황이 바뀌는 시점이라 고정된 판단보다 흐름 확인이 필요한 상태", checks: ["변화의 신호", "타이밍", "외부 변수", "반복되는 패턴"] },
    reversed: { core: "타이밍 어긋남과 반복되는 불운의 패턴", risk: "기회가 막힌 듯 보여도 같은 방식의 반복이 더 큰 문제인 상태", checks: ["반복된 실수", "놓친 타이밍", "외부 변수", "바꿀 수 있는 습관"] },
  },
  {
    file: "src/data/tarot/meanings/major/11_justice.json",
    upright: { core: "공정한 판단과 책임의 균형", risk: "감정보다 사실과 책임 기준을 확인해야 하는 상태", checks: ["증거 자료", "책임 분담", "공정한 기준", "계약 조건"] },
    reversed: { core: "불공정한 판단과 책임 회피", risk: "한쪽으로 기운 판단이나 숨겨진 책임 문제가 드러나는 상태", checks: ["불리한 조건", "빠진 증거", "책임 회피", "공정성 훼손"] },
  },
  {
    file: "src/data/tarot/meanings/major/12_hanged_man.json",
    upright: { core: "멈춤과 관점 전환이 필요한 지연", risk: "바로 움직이기보다 희생하고 있는 지점을 다시 봐야 하는 상태", checks: ["멈춘 이유", "감수하는 대가", "새로운 관점", "기다릴 가치"] },
    reversed: { core: "헛된 희생과 풀리지 않는 지연", risk: "기다림이 배움보다 소모로 변하고 있는 상태", checks: ["보상 없는 희생", "벗어나지 못한 이유", "미룬 결정", "반복되는 정체"] },
  },
  {
    file: "src/data/tarot/meanings/major/13_death.json",
    upright: { core: "끝내야 새 단계가 열리는 변화", risk: "붙잡고 있는 것을 정리하지 않으면 전환이 늦어지는 상태", checks: ["끝낼 관계나 일", "정리할 기준", "새 시작 조건", "남은 미련"] },
    reversed: { core: "끝을 미루며 변화가 막힌 상태", risk: "이미 달라진 상황을 인정하지 못해 같은 문제가 반복되는 상태", checks: ["변화 거부", "붙잡는 이유", "끝내지 못한 일", "전환을 막는 두려움"] },
  },
  {
    file: "src/data/tarot/meanings/major/14_temperance.json",
    upright: { core: "균형과 조율로 흐름을 회복하는 과정", risk: "극단을 피하고 서로 다른 요소를 맞춰야 안정되는 상태", checks: ["조율할 차이", "속도 균형", "감정 온도", "중간 지점"] },
    reversed: { core: "불균형과 조율 실패", risk: "한쪽으로 치우친 방식이 관계나 운영을 흔드는 상태", checks: ["과한 쪽", "부족한 쪽", "조율 실패 이유", "회복 리듬"] },
  },
  {
    file: "src/data/tarot/meanings/major/15_devil.json",
    upright: { core: "집착과 의존이 판단을 묶는 상태", risk: "욕망이나 두려움 때문에 건강하지 않은 구조를 끊지 못하는 상태", checks: ["집착 대상", "의존 구조", "반복되는 유혹", "끊어야 할 조건"] },
    reversed: { core: "속박에서 벗어나려는 시도와 남은 유혹", risk: "벗어나려 하지만 익숙한 패턴이 다시 끌어당기는 상태", checks: ["벗어날 행동", "재발 유혹", "의존을 줄일 방법", "도움 받을 곳"] },
  },
  {
    file: "src/data/tarot/meanings/major/16_tower.json",
    upright: { core: "숨겨진 문제가 무너지며 드러나는 급격한 변화", risk: "불안정한 구조가 버티지 못하고 한 번에 드러나는 상태", checks: ["이미 균열 난 부분", "숨겨진 문제", "충격의 범위", "다시 세울 기준"] },
    reversed: { core: "붕괴를 미루거나 경고를 무시하는 상태", risk: "문제는 보이지만 결정을 늦춰 충격이 커질 수 있는 상태", checks: ["무시한 경고", "미룬 정리", "피하고 있는 진실", "작게 고칠 기회"] },
  },
  {
    file: "src/data/tarot/meanings/major/17_star.json",
    upright: { core: "회복과 희망을 긴 호흡으로 되찾는 흐름", risk: "즉각 결과보다 신뢰와 회복의 시간을 봐야 하는 상태", checks: ["회복 신호", "장기 목표", "신뢰를 회복할 행동", "기다릴 수 있는 기간"] },
    reversed: { core: "희망 약화와 회복 지연", risk: "기대가 꺾여 작은 회복 신호도 놓치기 쉬운 상태", checks: ["낮아진 기대", "회복을 막는 생각", "작은 진전", "다시 믿을 근거"] },
  },
  {
    file: "src/data/tarot/meanings/major/18_moon.json",
    upright: { core: "불확실성과 두려움 속에서 사실을 구분해야 하는 상태", risk: "상상과 불안이 확인된 사실처럼 느껴지는 상태", checks: ["확인된 사실", "불안의 출처", "숨겨진 정보", "착각 가능성"] },
    reversed: { core: "혼란이 드러나며 진실을 확인하는 과정", risk: "감춰진 두려움이 드러나지만 아직 해석이 흔들릴 수 있는 상태", checks: ["드러난 사실", "오해가 풀린 부분", "남은 불안", "확인할 증거"] },
  },
  {
    file: "src/data/tarot/meanings/major/19_sun.json",
    upright: { core: "명확함과 긍정적 드러남", risk: "좋은 흐름이 보여도 구체 조건을 확인해야 안정되는 상태", checks: ["드러난 성과", "서로의 기대", "공개된 정보", "지속 조건"] },
    reversed: { core: "기쁨의 지연과 과신의 조정", risk: "긍정적으로 보이지만 기대보다 늦거나 일부가 가려진 상태", checks: ["늦어지는 이유", "과한 기대", "아직 부족한 조건", "확인된 성과"] },
  },
  {
    file: "src/data/tarot/meanings/major/20_judgement.json",
    upright: { core: "과거를 재평가하고 부름에 응답하는 전환", risk: "지난 선택을 다시 보고 책임 있게 답해야 하는 상태", checks: ["과거 결정", "다시 온 기회", "책임 있는 응답", "바뀐 기준"] },
    reversed: { core: "응답 회피와 미해결 과제", risk: "불러오는 문제를 피하면서 같은 판단을 반복하는 상태", checks: ["미룬 답변", "해결하지 않은 과제", "책임 회피", "다시 볼 기회"] },
  },
  {
    file: "src/data/tarot/meanings/major/21_world.json",
    upright: { core: "한 주기의 완성과 다음 단계로 넘어갈 준비", risk: "마무리된 일을 계속 붙잡아 다음 선택이 늦어지는 상태", checks: ["마무리된 범위", "남은 정산", "다음 단계 조건", "완료 기준"] },
    reversed: { core: "완성 지연과 마무리 부족", risk: "끝났다고 생각한 일이 실제로는 정리되지 않은 상태", checks: ["미완료 업무", "정리되지 않은 관계", "종료 조건", "반복되는 지연 사유"] },
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

for (const card of majorProfiles) {
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

console.log(`Expanded ${majorProfiles.length} major cards x 2 orientations x ${axes.length} axes.`);
