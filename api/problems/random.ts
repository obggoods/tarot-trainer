import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRandomProblem } from "../../server/problems";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET 요청만 지원합니다." });
  }

  return res.status(200).json({ ok: true, problem: getRandomProblem() });
}
