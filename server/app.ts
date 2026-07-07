import { Hono } from "hono";
import { cors } from "hono/cors";
import { evaluateReading } from "./evaluate";
import { getRandomProblem } from "./problems";
import type { TarotQuestion } from "../src/types";

export const app = new Hono();

app.use("*", cors());

app.get("/api/problems/random", (c) => {
  return c.json({ ok: true, problem: getRandomProblem() });
});

app.post("/api/evaluate", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { problem?: TarotQuestion; answer?: string } | null;
  const problem = body?.problem;
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";

  logApiDebug("request", {
    card_id: problem?.card_id,
    orientation: problem?.orientation,
    category: problem?.category,
    position: problem?.position,
    answerLength: answer.length,
  });

  if (!problem || !answer) {
    return c.json({ ok: false, error: "문제와 답변을 모두 입력해 주세요." }, 400);
  }

  try {
    const evaluation = await evaluateReading(problem, answer, process.env.DEEPSEEK_API_KEY);
    return c.json({ ok: true, evaluation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "채점 중 알 수 없는 오류가 발생했습니다.";
    return c.json({ ok: false, error: message }, 500);
  }
});

function logApiDebug(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;

  console.debug(`[TarotTrainer API] ${event}`, payload);
}
