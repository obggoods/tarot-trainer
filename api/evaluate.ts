import type { VercelRequest, VercelResponse } from "@vercel/node";
import { evaluateReading } from "../server/evaluate";
import type { TarotQuestion } from "../src/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST 요청만 지원합니다." });
  }

  const problem = req.body?.problem as TarotQuestion | undefined;
  const answer = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";

  if (!problem || !answer) {
    return res.status(400).json({ ok: false, error: "문제와 답변을 모두 입력해 주세요." });
  }

  try {
    const evaluation = await evaluateReading(problem, answer, process.env.DEEPSEEK_API_KEY);
    return res.status(200).json({ ok: true, evaluation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "채점 중 알 수 없는 오류가 발생했습니다.";
    return res.status(500).json({ ok: false, error: message });
  }
}
