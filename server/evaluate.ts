import { evaluateWithMock } from "../src/lib/ai/mockEvaluator";
import { buildEvaluationPrompt } from "../src/lib/ai/prompt/evaluationPrompt";
import { parseEvaluationJson } from "../src/lib/ai/validation";
import { getCard, getCardMeaning } from "../src/lib/tarot/getCard";
import type { EvaluationResult, TarotQuestion } from "../src/types";

type NvidiaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function evaluateReading(problem: TarotQuestion, answer: string, apiKey: string | undefined): Promise<EvaluationResult> {
  const card = getCard(problem.card_id);
  const meaning = getCardMeaning(problem.card_id, problem.orientation);
  const input = { card, meaning, question: problem, userAnswer: answer };

  if (!apiKey) {
    return evaluateWithMock(input);
  }

  const model = process.env.NVIDIA_MODEL ?? process.env.VITE_NVIDIA_MODEL ?? "meta/llama-3.1-70b-instruct";
  const prompt = buildEvaluationPrompt(input);
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
      max_tokens: 1400,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API 오류: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("NVIDIA API 응답에 채점 내용이 없습니다.");
  }

  const parsed = parseEvaluationJson(content);
  if (!parsed) {
    return evaluateWithMock(input);
  }

  return parsed;
}
