import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { composeAnalysisFromGraph } from "../src/lib/ai/analysisComposer";
import { buildFallbackTraditionalCorrection, composeFeedback } from "../src/lib/ai/feedbackComposer";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import { resolveConceptGraph } from "../src/lib/tarot/conceptGraphResolver";
import type { TarotQuestion } from "../src/types/tarot";

type SampleResult = {
  label: string;
  graphResolverMs: number;
  analysisComposerMs: number;
  correctionLlmMs: number;
  feedbackComposerMs: number;
  totalLocalMs: number;
};

const samples: Array<{
  label: string;
  question: TarotQuestion;
  userAnswer: string;
}> = [
  {
    label: "Swords 7 upright / partnership check",
    question: buildQuestion("swords_07", "upright", "relationship", "partnership_check", "파트너십에서 반드시 확인해야 할 조건은 무엇인가?"),
    userAnswer: "정보 공유가 불투명하므로 계약서, 책임 범위, 수익 배분을 먼저 확인해야 합니다.",
  },
  {
    label: "Pentacles Page reversed / business warning",
    question: buildQuestion("pentacles_page", "reversed", "business", "warning", "사업 확장에서 가장 위험한 부분은 무엇인가?"),
    userAnswer: "준비가 덜 된 상태라 초기 비용, 고정비, 운영 체계를 확인한 뒤 확장해야 합니다.",
  },
  {
    label: "Wands 10 upright / health warning",
    question: buildQuestion("wands_10", "upright", "health", "warning", "건강에서 지금 조절해야 할 신호는 무엇인가?"),
    userAnswer: "과부하가 누적되어 수면 시간, 통증과 피로 신호, 회복 시간을 확인해야 합니다.",
  },
];

const results = samples.map(measureSample);
writeReport(results);

function measureSample(sample: (typeof samples)[number]): SampleResult {
  const card = getCard(sample.question.card_id);
  const meaning = getCardMeaning(sample.question.card_id, sample.question.orientation);
  const input = { card, meaning, question: sample.question, userAnswer: sample.userAnswer };
  const startedAt = performance.now();

  const graphStartedAt = performance.now();
  const graph = resolveConceptGraph({
    cardId: sample.question.card_id,
    orientation: sample.question.orientation,
    category: sample.question.category,
    position: sample.question.position,
  });
  const graphResolverMs = performance.now() - graphStartedAt;

  const analysisStartedAt = performance.now();
  const analysis = composeAnalysisFromGraph({ ...input, graph });
  const analysisComposerMs = performance.now() - analysisStartedAt;

  const correctionStartedAt = performance.now();
  const traditionalCorrection = buildFallbackTraditionalCorrection(analysis, graph, card.meta.name_ko);
  const correctionLlmMs = performance.now() - correctionStartedAt;

  const feedbackStartedAt = performance.now();
  composeFeedback({ ...input, analysis, graph, traditionalCorrection });
  const feedbackComposerMs = performance.now() - feedbackStartedAt;

  return {
    label: sample.label,
    graphResolverMs,
    analysisComposerMs,
    correctionLlmMs,
    feedbackComposerMs,
    totalLocalMs: performance.now() - startedAt,
  };
}

function buildQuestion(
  card_id: string,
  orientation: TarotQuestion["orientation"],
  category: TarotQuestion["category"],
  position: string,
  question: string,
): TarotQuestion {
  return {
    question_id: `feedback_composer_perf_${card_id}_${orientation}_${category}_${position}`,
    card_id,
    orientation,
    spread: category,
    position,
    difficulty: "beginner",
    category,
    question,
    persona: {
      age: "테스트 사용자",
      background: "품질 검증용 샘플입니다.",
      concern: "답변 품질과 처리 시간을 확인합니다.",
    },
  };
}

function writeReport(sampleResults: SampleResult[]) {
  const reportPath = path.join(process.cwd(), "reports", "feedback-composer-performance.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, buildReport(sampleResults));
  console.log(`Report written: ${reportPath}`);
}

function buildReport(sampleResults: SampleResult[]) {
  const average = averageResult(sampleResults);
  const rows = sampleResults
    .map(
      (result) =>
        `| ${result.label} | ${format(result.graphResolverMs)} | ${format(result.analysisComposerMs)} | ${format(result.correctionLlmMs)} | ${format(result.feedbackComposerMs)} | ${format(result.totalLocalMs)} |`,
    )
    .join("\n");

  return `# Feedback Composer Performance

Generated: ${new Date().toISOString()}

## Architecture Change

| Item | Before | After |
| --- | ---: | ---: |
| LLM calls per evaluation | 2 | 1 |
| Analysis generation | LLM JSON | Graph Resolver + code composer |
| Feedback sections | LLM JSON | Code composer, except traditional correction |
| traditional_correction | LLM | LLM |
| sample_answer/model_answer/wrong_note | LLM | Code composer |

## Local Composer Timing

The local timing below measures deterministic engine work. The correction LLM column uses the local fallback correction builder so the report can run without an API key; in production this slot is the single remaining external LLM call.

| Sample | graphResolverMs | analysisComposerMs | correctionLlmMs* | feedbackComposerMs | totalLocalMs |
| --- | ---: | ---: | ---: | ---: | ---: |
${rows}
| Average | ${format(average.graphResolverMs)} | ${format(average.analysisComposerMs)} | ${format(average.correctionLlmMs)} | ${format(average.feedbackComposerMs)} | ${format(average.totalLocalMs)} |

*Local report placeholder. Server logs now emit the real correctionLlmMs value when DeepSeek is called.

## Cost Impact

- Previous structure: 2 LLM calls, Analysis JSON + Feedback JSON.
- Current structure: 1 LLM call, traditional_correction JSON only.
- Expected API call reduction: 50%.
- Expected output-token reduction: high, because sample_answer, model_answer, wrong_note, missing_points, missed_key_points, and next_reading_tip are generated by code.

## Server Timing Log

The server now logs these fields in development:

- graphResolverMs
- analysisComposerMs
- correctionLlmMs
- feedbackComposerMs
- totalMs
- llmCalls: 1
`;
}

function averageResult(sampleResults: SampleResult[]): SampleResult {
  const base: SampleResult = {
    label: "Average",
    graphResolverMs: 0,
    analysisComposerMs: 0,
    correctionLlmMs: 0,
    feedbackComposerMs: 0,
    totalLocalMs: 0,
  };

  for (const result of sampleResults) {
    base.graphResolverMs += result.graphResolverMs;
    base.analysisComposerMs += result.analysisComposerMs;
    base.correctionLlmMs += result.correctionLlmMs;
    base.feedbackComposerMs += result.feedbackComposerMs;
    base.totalLocalMs += result.totalLocalMs;
  }

  const count = sampleResults.length || 1;
  base.graphResolverMs /= count;
  base.analysisComposerMs /= count;
  base.correctionLlmMs /= count;
  base.feedbackComposerMs /= count;
  base.totalLocalMs /= count;
  return base;
}

function format(value: number) {
  return value.toFixed(2);
}
