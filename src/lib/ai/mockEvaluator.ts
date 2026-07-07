import { composeAnalysisFromGraph } from "./analysisComposer";
import { buildFallbackTraditionalCorrection, composeFeedback } from "./feedbackComposer";
import { CORRECTION_PROMPT_VERSION } from "./prompt/correctionPrompt";
import type { EvaluationInput } from "./types";
import type { EvaluationResult } from "../../types/tarot";
import { resolveConceptGraph } from "../tarot/conceptGraphResolver";

export function evaluateWithMock({ card, meaning, question, userAnswer }: EvaluationInput): EvaluationResult {
  const graph = resolveConceptGraph({
    cardId: card.meta.card_id,
    orientation: question.orientation,
    category: question.category,
    position: question.position,
  });
  const input = { card, meaning, question, userAnswer };
  const analysis = composeAnalysisFromGraph({ ...input, graph });

  return {
    ...composeFeedback({
      ...input,
      analysis,
      graph,
      traditionalCorrection: buildFallbackTraditionalCorrection(analysis, graph, card.meta.name_ko),
    }),
    promptVersion: `mock-composer:${CORRECTION_PROMPT_VERSION}`,
  };
}
