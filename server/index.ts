import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { app } from "./app";

dotenv.config({ path: ".env.local" });
dotenv.config();

const port = Number(process.env.PORT ?? 3002);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Tarot Trainer API server listening on http://127.0.0.1:${info.port}`);
});
