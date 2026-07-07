import fs from "node:fs";
import path from "node:path";
import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import { buildDebugAnalysisResult, getQuestionContextV2, getTrainingHint } from "../src/lib/tarot/trainingHints";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import { getTarotConcept, resolveConcepts } from "../src/lib/tarot/conceptResolver";
import { matchSemanticConcepts, type SemanticMatch, type SemanticRequirement } from "../src/lib/testing/semanticMatcher";
import type { EvaluationResult, TarotQuestion } from "../src/types/tarot";

type RegressionFixture = {
  label: string;
  card_id: string;
  orientation: TarotQuestion["orientation"];
  category: TarotQuestion["category"];
  position: string;
  question: string;
  requiredConceptIds: string[];
  requiredChecks: SemanticRequirement[];
  minConceptMatches?: number;
  minCheckMatches?: number;
};

type RegressionResult = {
  label: string;
  card_id: string;
  status: "PASS" | "FAIL";
  semanticScore: number;
  selectedConceptIds: string[];
  matchedConcepts: SemanticMatch[];
  matchedChecks: SemanticMatch[];
  missingConcepts: SemanticMatch[];
  missingChecks: SemanticMatch[];
  matchedAliases: string[];
  failures: string[];
};

const bannedPhrases = [
  "질문 위치에 맞게 적용해야 합니다.",
  "질문의 분야에 맞춰 읽어야 합니다.",
  "결과를 단정하지 않아야 합니다.",
  "카드의 정통 의미를 벗어나지 않아야 합니다.",
  "가능성과 경고를 함께 담고 있습니다.",
  "선택 기준, 운영 방식, 리스크에 맞춰 읽습니다.",
  "현실적으로 읽어야 합니다.",
  "구체적으로 살펴봐야 합니다.",
];

const fixtures: RegressionFixture[] = [
  fixture("마법사 역방향 / 재회 장애물", "major_01_magician", "reversed", "reunion", "obstacle", "재회를 어렵게 만드는 흐름은 무엇인가?", ["responsibility", "execution"], ["역할 범위", "문제 발생 시 책임자", "합의 위반 시 처리 방식"]),
  fixture("세계 정방향 / 사업 조언", "major_21_world", "upright", "business", "advice", "사업에서 다음 단계로 가려면 무엇을 정리해야 하나?", ["operation_system", "decision_criteria"], ["업무 순서", "우선순위", "검증 가능한 결과"]),
  fixture("소드 7 정방향 / 파트너십 확인", "swords_07", "upright", "relationship", "partnership_check", "이 관계에서 반드시 확인해야 할 조건은 무엇인가?", ["responsibility", "information_asymmetry"], ["계약서", "책임 범위", "정보 공유"]),
  fixture("펜타클 페이지 역방향 / 사업 위험", "pentacles_page", "reversed", "business", "warning", "사업 확장에서 가장 위험한 부분은 무엇인가?", ["preparation", "operation_system"], ["초기 비용", "월 고정비", "운영 체계"]),
  fixture("컵 5 정방향 / 연애 현재", "cups_05", "upright", "love", "current", "현재 연애 흐름에서 가장 크게 작용하는 감정은 무엇인가?", ["grief_focus", "remaining_possibility"], ["반복해서 떠올리는 장면", "아직 남은 연락 가능성", "감정 안정도"]),
  fixture("완드 10 정방향 / 건강 경고", "wands_10", "upright", "health", "warning", "건강에서 지금 조심해야 할 신호는 무엇인가?", ["overload"], ["수면 시간", "통증과 피로 신호", "회복 시간"]),
  fixture("소드 4 역방향 / 연애 조언", "swords_04", "reversed", "love", "advice", "관계를 다시 움직이려면 어떤 태도가 필요한가?", ["recovery", "execution"], ["연락 재개 시점", "작게 다시 시작할 행동", "다음 일정"]),
  fixture("펜타클 3 정방향 / 인간관계 확인", "pentacles_03", "upright", "relationship", "partnership_check", "협력 관계에서 확인해야 할 조건은 무엇인가?", ["responsibility", "operation_system"], ["역할 범위", "담당자별 권한", "정보 공유"]),
  fixture("연인 역방향 / 재회 조언", "major_06_lovers", "reversed", "reunion", "advice", "재회를 원한다면 어떤 선택 기준을 먼저 맞춰야 하나?", ["boundary", "decision_criteria"], ["거절해야 할 범위", "연락 빈도", "감정 노동 한계"]),
  fixture("여사제 정방향 / 연애 현재", "major_02_high_priestess", "upright", "love", "current", "현재 관계에서 겉으로 드러나지 않은 흐름은 무엇인가?", ["boundary", "information_asymmetry"], ["거절해야 할 범위", "연락 빈도", "업무 외 요청"]),
  fixture("소드 3 정방향 / 연애 감정 상처", "swords_03", "upright", "love", "current", "이 관계에서 지금 가장 아픈 감정의 핵심은 무엇인가?", ["emotional_wound", "mental_clarity"], ["상처가 된 말", "감정 회복 시간", "확인된 사실"]),
  fixture("소드 5 정방향 / 인간관계 갈등", "swords_05", "upright", "relationship", "partnership_check", "이 갈등 관계에서 확인해야 할 손상 지점은 무엇인가?", ["responsibility", "conflict_cost"], ["갈등의 쟁점", "내가 잃는 것", "역할 범위"]),
  fixture("소드 8 정방향 / 진로 심리적 제한", "swords_08", "upright", "career", "advice", "진로에서 나를 묶는 심리적 제한은 무엇이고 무엇부터 풀어야 하나?", ["mental_restriction", "boundary"], ["실제 제한 조건", "스스로 금지한 선택지", "작게 시도할 행동"]),
  fixture("펜타클 2 정방향 / 금전 수입·지출 균형", "pentacles_02", "upright", "money", "warning", "수입과 지출 균형에서 지금 확인해야 할 것은 무엇인가?", ["balance_juggling", "resource_management"], ["수입일과 지출일", "고정비", "현금 흐름"]),
  fixture("펜타클 6 정방향 / 사업 공정한 교환·정산", "pentacles_06", "upright", "business", "advice", "사업 관계에서 공정한 교환과 정산을 위해 무엇을 확인해야 하나?", ["fair_exchange", "responsibility"], ["정산 기준", "수익 배분", "권한 범위"]),
  fixture("펜타클 8 정방향 / 직업 기술 숙련·반복 훈련", "pentacles_08", "upright", "career", "advice", "직업에서 실력을 올리려면 어떤 반복 훈련이 필요한가?", ["craftsmanship", "skill_building"], ["반복 훈련 루틴", "품질 기준", "훈련 시간"]),
  fixture("컵 5 정방향 / 연애 상실 집중", "cups_05", "upright", "love", "current", "현재 연애 흐름에서 상실감이 어디에 고정되어 있나?", ["grief_focus", "remaining_possibility"], ["반복해서 떠올리는 장면", "아직 남은 연락 가능성", "감정 안정도"]),
  fixture("컵 7 정방향 / 연애 환상과 선택 혼란", "cups_07", "upright", "love", "current", "이 연애에서 기대와 현실 확인이 엇갈리는 부분은 무엇인가?", ["fantasy_projection", "decision_criteria"], ["확인된 사실", "상상과 실제 행동의 차이", "선택 기준"]),
  fixture("컵 8 정방향 / 재회 감정적 이탈", "cups_08", "upright", "reunion", "obstacle", "재회 흐름에서 마음이 이미 떠난 부분은 무엇인가?", ["emotional_departure", "emotional_direction_reset"], ["떠나고 싶은 이유", "대화로 조정 가능한 부분", "새 방향의 조건"]),
  fixture("완드 5 정방향 / 사업 경쟁과 갈등", "wands_05", "upright", "business", "warning", "사업에서 경쟁과 갈등이 어디에서 소모전으로 번질 수 있나?", ["competition_tension", "conflict_cost"], ["갈등 지점", "경쟁자 또는 이해관계자", "조율 기준"]),
  fixture("완드 8 정방향 / 직업 빠른 진행과 일정 관리", "wands_08", "upright", "career", "advice", "직업 흐름에서 빠른 진행을 관리하려면 무엇을 정리해야 하나?", ["rapid_progress", "execution"], ["마감 일정", "응답 기한", "실행 순서"]),
  fixture("완드 10 정방향 / 건강 과부하와 책임 분산", "wands_10", "upright", "health", "warning", "건강에서 과부하와 책임 분산을 어떻게 확인해야 하나?", ["overload", "burden_overload"], ["수면 시간", "책임 분산", "회복 시간"]),
];

const results = fixtures.map(runFixture);
printResults(results);
writeReport(results);

if (results.some((result) => result.status === "FAIL")) {
  process.exit(1);
}

function fixture(
  label: string,
  card_id: string,
  orientation: TarotQuestion["orientation"],
  category: TarotQuestion["category"],
  position: string,
  question: string,
  requiredConceptIds: string[],
  requiredChecks: Array<string | SemanticRequirement>,
): RegressionFixture {
  return {
    label,
    card_id,
    orientation,
    category,
    position,
    question,
    requiredConceptIds,
    requiredChecks: requiredChecks.map(toRequirement),
    minConceptMatches: Math.min(2, requiredConceptIds.length),
    minCheckMatches: Math.min(2, requiredChecks.length),
  };
}

function toRequirement(value: string | SemanticRequirement): SemanticRequirement {
  return typeof value === "string" ? { concept: value } : value;
}

function runFixture(regressionFixture: RegressionFixture): RegressionResult {
  const question = buildQuestion(regressionFixture);
  const card = getCard(regressionFixture.card_id);
  const meaning = getCardMeaning(regressionFixture.card_id, regressionFixture.orientation);
  const context = getQuestionContextV2(question, meaning);
  const hint = getTrainingHint(question, meaning);
  const analysis = buildDebugAnalysisResult({ question, meaning });
  const resolution = resolveConcepts({
    cardId: regressionFixture.card_id,
    orientation: regressionFixture.orientation,
    category: regressionFixture.category,
    position: regressionFixture.position,
  });
  const feedback = evaluateWithMock({
    card,
    meaning,
    question,
    userAnswer: hint?.answer_seed ?? context?.model_logic ?? "확인 항목을 중심으로 답변합니다.",
  });

  const selectedConceptIds = resolution.selectedConcepts.map((concept) => concept.id);
  const conceptRequirements = regressionFixture.requiredConceptIds.map(conceptIdToRequirement);
  const conceptText = [
    resolution.selectedConcepts.map((concept) => `${concept.id} ${concept.name_ko}`).join("\n"),
    resolution.realWorldIssues.join("\n"),
    resolution.concreteChecks.join("\n"),
    analysis.selectedMeaning,
    analysis.selectedReason,
    analysis.realWorldIssue,
    analysis.specificRisk,
    feedback.traditional_correction,
    feedback.sample_answer,
    feedback.model_answer,
    feedback.wrong_note,
  ].join("\n");
  const checksText = [resolution.concreteChecks.join("\n"), analysis.concreteChecks.join("\n"), feedback.missed_key_points.join("\n"), feedback.model_answer, feedback.wrong_note].join("\n");
  const conceptMatches = matchSemanticConcepts(conceptText, conceptRequirements);
  const checkMatches = matchSemanticConcepts(checksText, regressionFixture.requiredChecks);
  const matchedConcepts = conceptMatches.filter((match) => match.matched);
  const matchedChecks = checkMatches.filter((match) => match.matched);
  const missingConcepts = conceptMatches.filter((match) => !match.matched);
  const missingChecks = checkMatches.filter((match) => !match.matched);
  const matchedAliases = [...conceptMatches, ...checkMatches]
    .filter((match) => match.matched && match.source !== "concept" && match.matchedText)
    .map((match) => `${match.concept} -> ${match.matchedText}`);
  const failures: string[] = [];

  const missingConceptIds = regressionFixture.requiredConceptIds.filter((conceptId) => !selectedConceptIds.includes(conceptId));
  if (missingConceptIds.length > 0) failures.push(`Concept ID selection mismatch: ${missingConceptIds.join(", ")}`);
  if (matchedConcepts.length < (regressionFixture.minConceptMatches ?? conceptRequirements.length)) {
    failures.push(`requiredConcepts 부족: ${matchedConcepts.length}/${conceptRequirements.length}`);
  }
  if (matchedChecks.length < (regressionFixture.minCheckMatches ?? regressionFixture.requiredChecks.length)) {
    failures.push(`requiredChecks 부족: ${matchedChecks.length}/${regressionFixture.requiredChecks.length}`);
  }

  const feedbackText = [
    feedback.traditional_correction,
    feedback.sample_answer,
    feedback.model_answer,
    feedback.wrong_note,
    ...feedback.missed_key_points,
  ].join("\n");
  for (const phrase of bannedPhrases) {
    if (feedbackText.includes(phrase)) failures.push(`금지 문장 발견: ${phrase}`);
  }

  const maxSimilarity = maxSectionSimilarity(feedback);
  if (maxSimilarity >= 0.72) failures.push(`section similarity 과다: ${maxSimilarity.toFixed(2)}`);

  const semanticScore = Math.round(((matchedConcepts.length + matchedChecks.length) / (conceptRequirements.length + regressionFixture.requiredChecks.length)) * 100);

  return {
    label: regressionFixture.label,
    card_id: regressionFixture.card_id,
    status: failures.length > 0 ? "FAIL" : "PASS",
    semanticScore,
    selectedConceptIds,
    matchedConcepts,
    matchedChecks,
    missingConcepts,
    missingChecks,
    matchedAliases,
    failures,
  };
}

function conceptIdToRequirement(conceptId: string): SemanticRequirement {
  const concept = getTarotConcept(conceptId);
  return {
    concept: concept?.name_ko ?? conceptId,
    aliases: [conceptId, ...(concept?.aliases ?? [])],
  };
}

function buildQuestion(regressionFixture: RegressionFixture): TarotQuestion {
  return {
    question_id: `regression_${regressionFixture.card_id}_${regressionFixture.orientation}_${regressionFixture.category}_${regressionFixture.position}`,
    card_id: regressionFixture.card_id,
    orientation: regressionFixture.orientation,
    spread: "regression",
    position: regressionFixture.position,
    difficulty: "practice",
    category: regressionFixture.category,
    question: regressionFixture.question,
    persona: {
      age: "테스트 사용자",
      background: "AI 의미 보존 여부를 확인하기 위한 회귀 테스트 상황입니다.",
      concern: "같은 의미가 다른 표현으로 유지되는지 확인합니다.",
    },
  };
}

function maxSectionSimilarity(feedback: EvaluationResult) {
  const sections = [feedback.traditional_correction, feedback.sample_answer, feedback.model_answer, feedback.wrong_note];
  let max = 0;
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      max = Math.max(max, jaccardSimilarity(sections[i], sections[j]));
    }
  }
  return max;
}

function jaccardSimilarity(left: string, right: string) {
  const leftWords = new Set(words(left));
  const rightWords = new Set(words(right));
  if (leftWords.size === 0 && rightWords.size === 0) return 1;

  const intersection = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return intersection / union;
}

function words(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length >= 2);
}

function printResults(regressionResults: RegressionResult[]) {
  console.table(
    regressionResults.map((result) => ({
      Card: result.label,
      Concepts: result.selectedConceptIds.join(", "),
      "Semantic Score": result.semanticScore,
      "Matched Concepts": result.matchedConcepts.length,
      "Matched Checks": result.matchedChecks.length,
      PASS: result.status,
    })),
  );

  const failed = regressionResults.filter((result) => result.status === "FAIL");
  if (failed.length === 0) return;

  console.log("\nFAIL");
  for (const result of failed) {
    console.log(`\n${result.label}`);
    for (const failure of result.failures) console.log(`- ${failure}`);
    if (result.missingConcepts.length > 0) console.log(`- Missing Concepts: ${result.missingConcepts.map((match) => match.concept).join(", ")}`);
    if (result.missingChecks.length > 0) console.log(`- Missing Checks: ${result.missingChecks.map((match) => match.concept).join(", ")}`);
  }
}

function writeReport(regressionResults: RegressionResult[]) {
  const reportPath = path.join(process.cwd(), "reports", "ai-regression-report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(regressionResults), "utf8");
  console.log(`\nReport written: ${reportPath}`);
}

function buildReport(regressionResults: RegressionResult[]) {
  const passCount = regressionResults.filter((result) => result.status === "PASS").length;
  const failCount = regressionResults.filter((result) => result.status === "FAIL").length;

  return [
    "# AI Regression Report",
    "",
    `- Total cards: ${regressionResults.length}`,
    `- PASS: ${passCount}`,
    `- FAIL: ${failCount}`,
    "",
    "## Card Details",
    "",
    "| Card | Status | Concept IDs | Semantic Score | Matched Concepts | Matched Aliases | Missing Concepts | Missing Checks |",
    "| --- | --- | --- | ---: | --- | --- | --- | --- |",
    ...regressionResults.map(
      (result) =>
        `| ${result.label} | ${result.status} | ${result.selectedConceptIds.join("<br>")} | ${result.semanticScore} | ${listMatches(result.matchedConcepts)} | ${listText(result.matchedAliases)} | ${listMatches(result.missingConcepts)} | ${listMatches(result.missingChecks)} |`,
    ),
    "",
    "## Failures",
    "",
    ...buildFailureReport(regressionResults),
    "",
  ].join("\n");
}

function buildFailureReport(regressionResults: RegressionResult[]) {
  const failed = regressionResults.filter((result) => result.status === "FAIL");
  if (failed.length === 0) return ["No failed cards."];

  return failed.flatMap((result) => [`### ${result.label}`, "", ...result.failures.map((failure) => `- ${failure}`), ""]);
}

function listMatches(matches: SemanticMatch[]) {
  return matches.length > 0 ? matches.map((match) => `${match.concept}${match.matchedText ? ` (${match.matchedText})` : ""}`).join("<br>") : "-";
}

function listText(items: string[]) {
  return items.length > 0 ? items.join("<br>") : "-";
}
