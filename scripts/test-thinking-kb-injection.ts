import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { composeAnalysisFromGraph } from "../src/lib/ai/analysisComposer";
import { buildAnalysisPrompt } from "../src/lib/ai/prompt/analysisPrompt";
import { buildCorrectionPrompt } from "../src/lib/ai/prompt/correctionPrompt";
import { parseCorrectionJson } from "../src/lib/ai/validation";
import { resolveConceptGraph } from "../src/lib/tarot/conceptGraphResolver";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import { buildThinkingGuide, formatThinkingGuideForPrompt } from "../src/lib/tarot/thinking/buildThinkingGuide";
import { hasThinkingGuide } from "../src/lib/tarot/thinking/getThinkingGuide";
import { rawMeaningsByCardId } from "../src/data/tarot/meanings/allMeanings";
import type { AnalysisResult, EvaluationInput } from "../src/lib/ai/types";
import type { TarotCategory, TarotQuestion } from "../src/types/tarot";

dotenv.config({ path: ".env.local" });
dotenv.config();

type ThinkingInjectionCase = {
  label: string;
  card_id: string;
  orientation: TarotQuestion["orientation"];
  category: TarotCategory;
  position: string;
  question: string;
  userAnswer: string;
};

type CaseResult = {
  label: string;
  card_id: string;
  orientation: TarotQuestion["orientation"];
  status: "PASS" | "WARNING" | "FAIL";
  prompt: {
    correctionHasThinkingGuide: boolean;
    analysisHasThinkingGuide: boolean;
    includesFirstQuestion: boolean;
    includesFirstFocus: boolean;
    includesSelectedLogic: boolean;
    includesQuestionFirstRules: boolean;
  };
  graph: {
    primaryConcepts: string[];
    reasoningPath: string[];
    recommendedChecks: string[];
    followsThinkingFlow: boolean;
  };
  deepSeek?: {
    status: "SKIPPED" | "PASS" | "WARNING" | "FAIL";
    startsQuestionFirst?: boolean;
    cardFirstPattern?: boolean;
    parsed?: boolean;
    excerpt?: string;
  };
  warnings: string[];
  failures: string[];
};

const cases: ThinkingInjectionCase[] = [
  buildCase("Fool upright / love advice", "major_00_fool", "upright", "love", "advice", "새로운 관계를 시작해도 괜찮을까요?", "새로운 시작이라 좋게 볼 수 있습니다."),
  buildCase("Fool reversed / money warning", "major_00_fool", "reversed", "money", "warning", "이번 투자에서 가장 조심할 점은 무엇인가요?", "바보 역방향이라 조심해야 합니다."),
  buildCase("Magician upright / career advice", "major_01_magician", "upright", "career", "advice", "이직 준비에서 지금 가장 필요한 것은 무엇인가요?", "능력을 잘 쓰면 됩니다."),
  buildCase("Magician reversed / reunion obstacle", "major_01_magician", "reversed", "reunion", "obstacle", "재회를 막는 가장 큰 흐름은 무엇인가요?", "상대가 속일 수도 있습니다."),
  buildCase("Wheel upright / health warning", "major_10_wheel_of_fortune", "upright", "health", "warning", "생활 습관에서 무엇을 바꿔야 할까요?", "운이 바뀌는 카드라 변화가 있습니다."),
  buildCase("Wheel reversed / career advice", "major_10_wheel_of_fortune", "reversed", "career", "advice", "지금 커리어가 막힌 이유를 어떻게 봐야 할까요?", "운이 안 좋아서 멈춘 것 같습니다."),
  buildCase("Two of Cups upright / relationship check", "cups_02", "upright", "relationship", "partnership_check", "이 관계에서 확인해야 할 변화는 무엇인가요?", "서로 좋아하는 관계입니다."),
  buildCase("Two of Cups reversed / love current", "cups_02", "reversed", "love", "current", "현재 관계에서 어긋나는 부분은 무엇인가요?", "이별 가능성이 있어 보입니다."),
  buildCase("Nine of Wands upright / reunion obstacle", "wands_09", "upright", "reunion", "obstacle", "재회를 어렵게 만드는 흐름은 무엇인가요?", "끝까지 버티면 됩니다."),
  buildCase("Nine of Wands reversed / health warning", "wands_09", "reversed", "health", "warning", "건강에서 지금 무리하고 있는 부분은 무엇인가요?", "기운이 빠진 상태입니다."),
];

const liveDeepSeek = process.env.DEEPSEEK_THINKING_LIVE === "true";
const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

const results = await Promise.all(cases.map(runCase));
const coverageResult = runCoverageControl();

printTable(results);
writeReport(results, coverageResult);

const failCount = results.filter((result) => result.status === "FAIL").length + (coverageResult.status === "FAIL" ? 1 : 0);
if (failCount > 0) process.exit(1);

function buildCase(
  label: string,
  card_id: string,
  orientation: TarotQuestion["orientation"],
  category: TarotCategory,
  position: string,
  question: string,
  userAnswer: string,
): ThinkingInjectionCase {
  return { label, card_id, orientation, category, position, question, userAnswer };
}

async function runCase(testCase: ThinkingInjectionCase): Promise<CaseResult> {
  const input = buildInput(testCase);
  const graph = resolveConceptGraph({
    cardId: testCase.card_id,
    orientation: testCase.orientation,
    category: testCase.category,
    position: testCase.position,
  });
  const analysis = composeAnalysisFromGraph({ ...input, graph });
  const correctionPrompt = buildCorrectionPrompt(input, analysis, graph);
  const analysisPrompt = buildAnalysisPrompt(input);
  const guide = buildThinkingGuide({
    cardId: testCase.card_id,
    orientation: testCase.orientation,
    category: testCase.category,
  });
  const guideText = guide ? formatThinkingGuideForPrompt(guide) : "";

  const result: CaseResult = {
    label: testCase.label,
    card_id: testCase.card_id,
    orientation: testCase.orientation,
    status: "PASS",
    prompt: {
      correctionHasThinkingGuide: hasInjectedThinkingSection(correctionPrompt),
      analysisHasThinkingGuide: hasInjectedThinkingSection(analysisPrompt),
      includesFirstQuestion: Boolean(guide?.firstQuestion && correctionPrompt.includes(guide.firstQuestion)),
      includesFirstFocus: Boolean(guide?.firstFocus && correctionPrompt.includes(guide.firstFocus)),
      includesSelectedLogic: Boolean(guide?.selectedLogic && correctionPrompt.includes(guide.selectedLogic)),
      includesQuestionFirstRules: hasQuestionFirstRules(correctionPrompt),
    },
    graph: {
      primaryConcepts: graph.primaryConcepts.map((concept) => concept.name_ko),
      reasoningPath: graph.reasoningPath,
      recommendedChecks: graph.recommendedChecks,
      followsThinkingFlow: Boolean(guideText && graph.reasoningPath.length > 0 && graph.recommendedChecks.length >= 2),
    },
    warnings: [],
    failures: [],
  };

  validatePromptInjection(result);
  validateGraphPayload(result);
  if (liveDeepSeek) result.deepSeek = await runLiveDeepSeek(correctionPrompt, input.card.meta.name_ko);
  else result.deepSeek = { status: "SKIPPED", excerpt: "Set DEEPSEEK_THINKING_LIVE=true to sample live DeepSeek output." };

  finalizeStatus(result);
  return result;
}

function runCoverageControl(): CaseResult {
  const allCardIds = Object.keys(rawMeaningsByCardId);
  const missing = allCardIds.filter((cardId) => !hasThinkingGuide(cardId, "upright") || !hasThinkingGuide(cardId, "reversed"));
  const result: CaseResult = {
    label: "Full-deck Thinking Guide coverage",
    card_id: "all_cards",
    orientation: "upright",
    status: "PASS",
    prompt: {
      correctionHasThinkingGuide: missing.length === 0,
      analysisHasThinkingGuide: missing.length === 0,
      includesFirstQuestion: false,
      includesFirstFocus: false,
      includesSelectedLogic: false,
      includesQuestionFirstRules: true,
    },
    graph: {
      primaryConcepts: [],
      reasoningPath: [],
      recommendedChecks: [],
      followsThinkingFlow: true,
    },
    deepSeek: { status: "SKIPPED", excerpt: "Coverage control does not call DeepSeek." },
    warnings: [],
    failures: [],
  };

  if (missing.length > 0) fail(result, `Missing Thinking Guide coverage: ${missing.join(", ")}`);
  finalizeStatus(result);
  return result;
}

function buildInput(testCase: ThinkingInjectionCase): EvaluationInput {
  const question: TarotQuestion = {
    question_id: `thinking_${testCase.card_id}_${testCase.orientation}_${testCase.category}_${testCase.position}`,
    card_id: testCase.card_id,
    orientation: testCase.orientation,
    spread: "thinking_kb_test",
    position: testCase.position,
    difficulty: "practice",
    category: testCase.category,
    question: testCase.question,
    persona: {
      age: "학습자",
      background: "Thinking KB 주입 테스트용 샘플입니다.",
      concern: "카드 설명보다 질문에 먼저 답하는지 확인합니다.",
    },
  };

  return {
    card: getCard(testCase.card_id),
    meaning: getCardMeaning(testCase.card_id, testCase.orientation),
    question,
    userAnswer: testCase.userAnswer,
  };
}

function validatePromptInjection(result: CaseResult) {
  if (!result.prompt.correctionHasThinkingGuide) fail(result, "Correction prompt does not include [THINKING GUIDE].");
  if (!result.prompt.analysisHasThinkingGuide) fail(result, "Analysis prompt does not include [THINKING GUIDE].");
  if (!result.prompt.includesFirstQuestion) fail(result, "Thinking firstQuestion is missing from correction prompt.");
  if (!result.prompt.includesFirstFocus) fail(result, "Thinking firstFocus is missing from correction prompt.");
  if (!result.prompt.includesSelectedLogic) fail(result, "Thinking selectedLogic is missing from correction prompt.");
  if (!result.prompt.includesQuestionFirstRules) fail(result, "Question-first opening rules are missing from correction prompt.");
}

function validateGraphPayload(result: CaseResult) {
  if (result.graph.primaryConcepts.length === 0) fail(result, "Graph primary concepts are empty.");
  if (result.graph.reasoningPath.length === 0) fail(result, "Graph reasoning path is empty.");
  if (result.graph.recommendedChecks.length < 2) fail(result, "Graph recommended checks are fewer than 2.");
  if (!result.graph.followsThinkingFlow) warn(result, "Graph payload is present, but the Thinking flow alignment needs human review.");
}

async function runLiveDeepSeek(prompt: string, cardName: string): Promise<CaseResult["deepSeek"]> {
  if (!apiKey) return { status: "SKIPPED", excerpt: "DEEPSEEK_API_KEY is missing." };

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return { status: "FAIL", parsed: false, excerpt: `DeepSeek API error: ${response.status} ${await response.text()}` };
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const correction = parseCorrectionJson(content);
    const text = correction?.traditional_correction ?? content;
    const startsQuestionFirst = startsWithQuestionFirst(text);
    const cardFirstPattern = hasCardFirstPattern(text, cardName);

    return {
      status: correction && startsQuestionFirst && !cardFirstPattern ? "PASS" : "WARNING",
      startsQuestionFirst,
      cardFirstPattern,
      parsed: Boolean(correction),
      excerpt: excerpt(text),
    };
  } catch (error) {
    return { status: "FAIL", parsed: false, excerpt: error instanceof Error ? error.message : String(error) };
  }
}

function hasQuestionFirstRules(prompt: string) {
  return [
    "Never start by explaining the card.",
    "Always answer the question first.",
    "Start with what this question is really asking.",
    "Use the card only as evidence",
    "Teach why this meaning is selected for this question.",
  ].every((rule) => prompt.includes(rule));
}

function hasInjectedThinkingSection(prompt: string) {
  return /^\[THINKING GUIDE\]\nUse this compact guide/m.test(prompt);
}

function startsWithQuestionFirst(text: string) {
  const opening = text.trim().slice(0, 80);
  return ["이 질문", "이 위치", "여기서", "먼저", "이번 질문"].some((phrase) => opening.includes(phrase));
}

function hasCardFirstPattern(text: string, cardName: string) {
  const opening = text.trim().slice(0, 100);
  return (
    opening.includes("이 카드는") ||
    opening.includes("정통적으로") ||
    opening.includes("카드는 보통") ||
    opening.startsWith(cardName) ||
    new RegExp(`${escapeRegExp(cardName)}.{0,20}(뜻합니다|의미합니다)`).test(opening)
  );
}

function fail(result: CaseResult, message: string) {
  result.failures.push(message);
}

function warn(result: CaseResult, message: string) {
  result.warnings.push(message);
}

function finalizeStatus(result: CaseResult) {
  if (result.failures.length > 0 || result.deepSeek?.status === "FAIL") result.status = "FAIL";
  else if (result.warnings.length > 0 || result.deepSeek?.status === "WARNING") result.status = "WARNING";
  else result.status = "PASS";
}

function printTable(results: CaseResult[]) {
  console.table(
    results.map((result) => ({
      Case: result.label,
      Thinking: result.prompt.correctionHasThinkingGuide ? "PASS" : "FAIL",
      Graph: result.graph.followsThinkingFlow ? "PASS" : "REVIEW",
      DeepSeek: result.deepSeek?.status ?? "SKIPPED",
      Status: result.status,
    })),
  );
}

function writeReport(results: CaseResult[], coverageResult: CaseResult) {
  const reportPath = path.join(process.cwd(), "reports", "thinking-kb-injection-report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(results, coverageResult), "utf8");
  console.log(`\nReport written: ${reportPath}`);
}

function buildReport(results: CaseResult[], coverageResult: CaseResult) {
  const passCount = results.filter((result) => result.status === "PASS").length;
  const warningCount = results.filter((result) => result.status === "WARNING").length;
  const failCount = results.filter((result) => result.status === "FAIL").length;
  const liveMode = liveDeepSeek ? "enabled" : "skipped";

  return [
    "# Thinking KB Injection Report",
    "",
    "This report checks whether the initial Tarot Thinking Knowledge Base is injected into DeepSeek-facing prompts and whether the prompt nudges output toward question-first tarot teaching.",
    "",
    "## Summary",
    "",
    `- Test cases: ${results.length}`,
    `- PASS: ${passCount}`,
    `- WARNING: ${warningCount}`,
    `- FAIL: ${failCount}`,
    `- Live DeepSeek sampling: ${liveMode}`,
    "",
    "## What Was Checked",
    "",
    "- Correction prompt contains `[THINKING GUIDE]` for the 5 KB cards.",
    "- Analysis prompt contains the same guide for compatibility.",
    "- Full-deck Thinking Guide coverage is present; legacy fallback remains available in code but is no longer expected for registry cards.",
    "- The prompt contains question-first opening rules.",
    "- Graph resolver output remains present beside the Thinking Guide.",
    "- Optional live DeepSeek output is checked for card-first opening patterns.",
    "",
    "## Cases",
    "",
    "| Case | Status | Prompt Injection | Graph Payload | DeepSeek | Issues |",
    "| --- | --- | --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.label} | ${result.status} | ${formatPromptStatus(result)} | ${formatGraphStatus(result)} | ${formatDeepSeek(result)} | ${formatIssues(result)} |`,
    ),
    "",
    "## Coverage Control",
    "",
    `- Case: ${coverageResult.label}`,
    `- Status: ${coverageResult.status}`,
    `- Full-deck guide coverage: ${coverageResult.prompt.correctionHasThinkingGuide ? "YES" : "NO"}`,
    `- Issues: ${formatIssues(coverageResult)}`,
    "",
    "## DeepSeek Review Notes",
    "",
    liveDeepSeek
      ? "Live DeepSeek sampling was enabled. Review WARNING rows for responses that still start from card exposition."
      : "Live DeepSeek sampling was skipped. To sample actual DeepSeek output, run `DEEPSEEK_THINKING_LIVE=true npm run test:thinking-kb` with `DEEPSEEK_API_KEY` configured.",
    "",
    "## Current Conclusion",
    "",
    "The Thinking KB is now prompt-consumable across the full 78-card registry. It is still a human-review draft, so PASS means the guide is injected and structurally usable, not that the interpretation philosophy is final.",
    "",
  ].join("\n");
}

function formatPromptStatus(result: CaseResult) {
  const values = result.prompt;
  return [
    values.correctionHasThinkingGuide ? "correction" : "missing correction",
    values.analysisHasThinkingGuide ? "analysis" : "missing analysis",
    values.includesSelectedLogic ? "selectedLogic" : "missing selectedLogic",
  ].join(", ");
}

function formatGraphStatus(result: CaseResult) {
  return `${result.graph.followsThinkingFlow ? "PASS" : "REVIEW"} / path ${result.graph.reasoningPath.length} / checks ${result.graph.recommendedChecks.length}`;
}

function formatDeepSeek(result: CaseResult) {
  if (!result.deepSeek) return "SKIPPED";
  return [result.deepSeek.status, result.deepSeek.startsQuestionFirst === undefined ? "" : `questionFirst=${result.deepSeek.startsQuestionFirst}`, result.deepSeek.cardFirstPattern === undefined ? "" : `cardFirst=${result.deepSeek.cardFirstPattern}`]
    .filter(Boolean)
    .join(", ");
}

function formatIssues(result: CaseResult) {
  const issues = [...result.failures, ...result.warnings];
  return issues.length > 0 ? issues.join("<br>") : "-";
}

function excerpt(value: string) {
  return value.length > 500 ? `${value.slice(0, 500)}...` : value;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
