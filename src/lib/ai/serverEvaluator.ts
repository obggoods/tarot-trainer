import type { EvaluationInput } from "./types";
import type { EvaluationResult } from "../../types/tarot";

export async function evaluateWithServer(input: EvaluationInput): Promise<EvaluationResult> {
  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      problem: input.question,
      answer: input.userAnswer,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; evaluation?: EvaluationResult; error?: string } | null;

  if (!response.ok || !payload?.ok || !payload.evaluation) {
    throw new Error(payload?.error ?? `Server evaluation API error: ${response.status}`);
  }

  return payload.evaluation;
}
