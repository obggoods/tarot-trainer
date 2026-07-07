import { evaluateWithMock } from "./mockEvaluator";
import { sanitizeEvaluationForDisplay } from "./evaluationSanitizer";
import { evaluateWithServer } from "./serverEvaluator";
import type { EvaluationInput } from "./types";
import type { EvaluationResult } from "../../types/tarot";

export async function evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult> {
  if (shouldUseMock()) {
    return sanitizeEvaluationForDisplay(evaluateWithMock(input));
  }

  try {
    return sanitizeEvaluationForDisplay(await evaluateWithServer(input));
  } catch (error) {
    console.warn("AI evaluator failed. Falling back to mock evaluator.", error);
    return sanitizeEvaluationForDisplay(evaluateWithMock(input));
  }
}

function shouldUseMock() {
  return import.meta.env.VITE_USE_MOCK !== "false";
}
