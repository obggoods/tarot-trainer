import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import { buildAnalysisPrompt, buildFeedbackPrompt } from "../src/lib/ai/prompt/evaluationPrompt";
import { parseAnalysisJson, parseEvaluationJson } from "../src/lib/ai/validation";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import type { AnalysisResult, EvaluationInput } from "../src/lib/ai/types";
import type { EvaluationResult, TarotQuestion } from "../src/types";

type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_ANALYSIS_RETRIES = 2;
const MAX_FEEDBACK_RETRIES = 2;

export async function evaluateReading(problem: TarotQuestion, answer: string, apiKey: string | undefined): Promise<EvaluationResult> {
  const card = getCard(problem.card_id);
  const meaning = getCardMeaning(problem.card_id, problem.orientation);
  const input = { card, meaning, question: problem, userAnswer: answer };

  if (!apiKey) {
    return evaluateWithMock(input);
  }

  const model = process.env.NVIDIA_MODEL ?? process.env.VITE_NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct";

  const analysis = await requestAnalysis({ apiKey, model, input });
  if (!analysis) {
    return evaluateWithMock(input);
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[TarotTrainer Analysis]", analysis);
  }

  const feedback = await requestFeedback({ apiKey, model, input, analysis });

  return feedback ?? evaluateWithMock(input);
}

async function requestAnalysis({
  apiKey,
  model,
  input,
}: {
  apiKey: string;
  model: string;
  input: EvaluationInput;
}): Promise<AnalysisResult | null> {
  const prompt = buildAnalysisPrompt(input);

  for (let attempt = 0; attempt <= MAX_ANALYSIS_RETRIES; attempt += 1) {
    const content = await requestNvidiaCompletion({
      apiKey,
      model,
      prompt,
      maxTokens: 1200,
    });
    const analysis = parseAnalysisJson(content);

    if (analysis) return analysis;
  }

  return null;
}

async function requestFeedback({
  apiKey,
  model,
  input,
  analysis,
}: {
  apiKey: string;
  model: string;
  input: EvaluationInput;
  analysis: AnalysisResult;
}): Promise<EvaluationResult | null> {
  const prompt = buildFeedbackPrompt(input, analysis);

  for (let attempt = 0; attempt <= MAX_FEEDBACK_RETRIES; attempt += 1) {
    const content = await requestNvidiaCompletion({
      apiKey,
      model,
      prompt,
      maxTokens: 1800,
    });
    const feedback = parseEvaluationJson(content);

    if (feedback) return feedback;
  }

  return null;
}

async function requestNvidiaCompletion({
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
  const messages: NvidiaMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("NVIDIA API response did not include evaluation content.");
  }

  return content;
}
