import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import { buildAnalysisPrompt } from "../src/lib/ai/prompt/analysisPrompt";
import { buildFeedbackPrompt } from "../src/lib/ai/prompt/feedbackPrompt";
import { parseAnalysisJson, parseEvaluationJson } from "../src/lib/ai/validation";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import type { AnalysisResult, EvaluationInput } from "../src/lib/ai/types";
import type { EvaluationResult, TarotQuestion } from "../src/types";

type ChatMessage = {
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

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

  const analysis = await requestAnalysis({ apiKey, model, input });
  if (!analysis) {
    return evaluateWithMock(input);
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[TarotTrainer Analysis]", analysis);
  }

  const feedback = await requestFeedback({ apiKey, model, input, analysis });

  return feedback ? sanitizeEvaluation(applyAnalysisScoring(feedback, analysis), analysis.avoid_topics) : evaluateWithMock(input);
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
    const content = await requestDeepSeekCompletion({
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
    const content = await requestDeepSeekCompletion({
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
  if (forbiddenTerms.length === 0) return evaluation;

  return {
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
  };
}

function applyAnalysisScoring(evaluation: EvaluationResult, analysis: AnalysisResult): EvaluationResult {
  return {
    ...evaluation,
    score: analysis.score,
    grade: analysis.grade,
    rubric: analysis.rubric,
  };
}

function buildForbiddenTerms(avoidTopics: string[]) {
  const terms = new Map<string, string>();

  for (const topic of avoidTopics) {
    for (const token of topic.split(/[,\s/]+/)) {
      const normalized = token.trim();
      if (normalized.length >= 3) {
        terms.set(normalized, "질문과 맞지 않는 대표 키워드");
      }
    }

    if (topic.includes("파트너")) {
      terms.set("파트너십", "질문과 맞지 않는 대표 키워드");
      terms.set("파트너", "결정 대상");
      terms.set("협력자", "결정 대상");
      terms.set("관계", "대표 키워드");
    }

    if (topic.includes("협업") || topic.includes("팀워크")) {
      terms.set("협업", "관리 방식");
      terms.set("팀워크", "관리 방식");
    }
  }

  return [...terms.entries()].sort(([a], [b]) => b.length - a.length);
}

function sanitizeList(items: string[], forbiddenTerms: Array<[string, string]>) {
  return items.map((item) => sanitizeText(item, forbiddenTerms)).filter((item) => item.trim().length > 0);
}

function sanitizeText(value: string, forbiddenTerms: Array<[string, string]>) {
  return forbiddenTerms.reduce((text, [term, replacement]) => text.split(term).join(replacement), value);
}
