import { composeAnalysisFromGraph } from "../src/lib/ai/analysisComposer";
import { sanitizeEvaluationForDisplay, sanitizeText as sanitizeDisplayText } from "../src/lib/ai/evaluationSanitizer";
import { buildFallbackTraditionalCorrection, composeFeedback } from "../src/lib/ai/feedbackComposer";
import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import { buildCorrectionPrompt } from "../src/lib/ai/prompt/correctionPrompt";
import { parseCorrectionJson } from "../src/lib/ai/validation";
import { resolveConceptGraph } from "../src/lib/tarot/conceptGraphResolver";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import type { AnalysisResult, EvaluationInput } from "../src/lib/ai/types";
import type { EvaluationResult, TarotQuestion } from "../src/types";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_CORRECTION_RETRIES = 2;

export async function evaluateReading(problem: TarotQuestion, answer: string, apiKey: string | undefined): Promise<EvaluationResult> {
  const card = getCard(problem.card_id);
  const meaning = getCardMeaning(problem.card_id, problem.orientation);
  const input = { card, meaning, question: problem, userAnswer: answer };

  if (!apiKey) {
    logAiDebug("missing-api-key", {
      card_id: problem.card_id,
      category: problem.category,
      position: problem.position,
    });
    return sanitizeEvaluationForDisplay(evaluateWithMock(input));
  }

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const startedAt = Date.now();
  logAiDebug("start", {
    model,
    card_id: problem.card_id,
    orientation: problem.orientation,
    category: problem.category,
    position: problem.position,
  });

  const graphStartedAt = Date.now();
  const graph = resolveConceptGraph({
    cardId: problem.card_id,
    orientation: problem.orientation,
    category: problem.category,
    position: problem.position,
  });
  const graphResolverMs = Date.now() - graphStartedAt;

  const analysisStartedAt = Date.now();
  const analysis = composeAnalysisFromGraph({ ...input, graph });
  const analysisComposerMs = Date.now() - analysisStartedAt;

  if (process.env.NODE_ENV !== "production") {
    console.debug("[TarotTrainer Analysis]", analysis);
  }

  const correctionStartedAt = Date.now();
  const traditionalCorrection =
    (await requestCorrection({ apiKey, model, input, analysis, graph })) ??
    buildFallbackTraditionalCorrection(analysis, graph, card.meta.name_ko);
  const correctionLlmMs = Date.now() - correctionStartedAt;

  const feedbackStartedAt = Date.now();
  const feedback = composeFeedback({
    ...input,
    analysis,
    graph,
    traditionalCorrection,
  });
  const feedbackComposerMs = Date.now() - feedbackStartedAt;
  const totalMs = Date.now() - startedAt;

  logAiDebug("timings", {
    graphResolverMs,
    analysisComposerMs,
    correctionLlmMs,
    feedbackComposerMs,
    totalMs,
    llmCalls: 1,
  });

  return sanitizeEvaluation(feedback, analysis.avoid_topics);
}

async function requestCorrection({
  apiKey,
  model,
  input,
  analysis,
  graph,
}: {
  apiKey: string;
  model: string;
  input: EvaluationInput;
  analysis: AnalysisResult;
  graph: ReturnType<typeof resolveConceptGraph>;
}): Promise<string | null> {
  const prompt = buildCorrectionPrompt(input, analysis, graph);

  for (let attempt = 0; attempt <= MAX_CORRECTION_RETRIES; attempt += 1) {
    logAiDebug("correction-request", buildRequestDebugPayload(model, prompt, 800, attempt));
    const content = await requestDeepSeekCompletion({
      apiKey,
      model,
      prompt,
      maxTokens: 800,
    });
    const correction = parseCorrectionJson(content);

    if (correction) return correction.traditional_correction;
    logAiDebug("correction-parse-failed", {
      attempt,
      contentExcerpt: excerpt(content),
    });
  }

  return null;
}

async function requestDeepSeekCompletion({
  apiKey,
  model,
  prompt,
  maxTokens,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
}) {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  const payload = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: maxTokens,
  };

  const response = await fetchDeepSeekCompletion(apiKey, {
    ...payload,
    response_format: { type: "json_object" },
  });

  if (!response.ok) {
    const fallbackResponse = await fetchDeepSeekCompletion(apiKey, payload);
    if (!fallbackResponse.ok) {
      const errorText = await fallbackResponse.text();
      throw new Error(`DeepSeek API error: ${fallbackResponse.status} ${errorText}`);
    }

    return readDeepSeekContent(fallbackResponse);
  }

  return readDeepSeekContent(response);
}

async function fetchDeepSeekCompletion(apiKey: string, body: object) {
  return fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readDeepSeekContent(response: Response) {
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API response did not include evaluation content.");
  }

  return content;
}

function sanitizeEvaluation(evaluation: EvaluationResult, avoidTopics: string[]): EvaluationResult {
  const forbiddenTerms = buildForbiddenTerms(avoidTopics);
  if (forbiddenTerms.length === 0) return sanitizeEvaluationForDisplay(evaluation);

  return sanitizeEvaluationForDisplay({
    ...evaluation,
    strengths: sanitizeList(evaluation.strengths, forbiddenTerms),
    missing_points: sanitizeList(evaluation.missing_points, forbiddenTerms),
    traditional_correction: sanitizeText(evaluation.traditional_correction, forbiddenTerms),
    sample_answer: sanitizeText(evaluation.sample_answer, forbiddenTerms),
    model_answer: sanitizeText(evaluation.model_answer, forbiddenTerms),
    missed_key_points: sanitizeList(evaluation.missed_key_points, forbiddenTerms),
    differences: sanitizeList(evaluation.differences, forbiddenTerms),
    wrong_note: sanitizeText(evaluation.wrong_note, forbiddenTerms),
    next_reading_tip: sanitizeText(evaluation.next_reading_tip, forbiddenTerms),
  });
}

function buildForbiddenTerms(avoidTopics: string[]) {
  return [...new Set(avoidTopics.map((topic) => topic.trim()).filter((topic) => topic.length >= 8))].map((term) => [term, ""] as [string, string]);
}

function sanitizeList(items: string[], forbiddenTerms: Array<[string, string]>) {
  return items.map((item) => sanitizeText(item, forbiddenTerms)).filter((item) => item.trim().length > 0);
}

function sanitizeText(value: string, forbiddenTerms: Array<[string, string]>) {
  const stripped = forbiddenTerms.reduce((text, [term, replacement]) => text.split(term).join(replacement), value);
  return sanitizeDisplayText(stripped);
}

function buildRequestDebugPayload(model: string, prompt: string, maxTokens: number, attempt: number) {
  return {
    attempt,
    payload: {
      model,
      messages: [{ role: "user", contentLength: prompt.length, contentExcerpt: excerpt(prompt) }],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    },
  };
}

function excerpt(value: string) {
  return value.length > 600 ? `${value.slice(0, 600)}...` : value;
}

function logAiDebug(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;

  console.debug(`[TarotTrainer AI] ${event}`, payload);
}
