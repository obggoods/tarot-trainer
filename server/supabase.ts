import { createClient } from "@supabase/supabase-js";
import type { EvaluationResult, TarotProblem } from "../src/types";

export async function saveReadingResult(problem: TarotProblem, answer: string, evaluation: EvaluationResult) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return false;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("reading_attempts").insert({
    problem,
    user_answer: answer,
    ai_feedback: evaluation,
    score: evaluation.score,
  });

  if (error) {
    console.warn("Supabase 저장 실패:", error.message);
    return false;
  }

  return true;
}
