import { evaluateWithMock } from "./mockEvaluator";
import { evaluateWithServer } from "./serverEvaluator";
import type { EvaluationInput } from "./types";
import type { EvaluationResult } from "../../types/tarot";

export async function evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult> {
  if (shouldUseMock()) {
    return evaluateWithMock(input);
  }

  try {
    return await evaluateWithServer(input);
  } catch (error) {
    console.warn("AI evaluator failed. Falling back to mock evaluator.", error);
    return evaluateWithMock(input);
  }
}

function shouldUseMock() {
  return import.meta.env.VITE_USE_MOCK !== "false";
}
