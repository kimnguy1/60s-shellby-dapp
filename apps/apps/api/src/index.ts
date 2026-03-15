import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { airdropRouter } from "./routes/airdrop";
import { aptosMockRouter } from "./routes/aptosMock";

const app = new Hono();
const defaultCorsOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const corsOrigins = configuredCorsOrigins && configuredCorsOrigins.length > 0 ? configuredCorsOrigins : defaultCorsOrigins;

app.use(
  "/api/*",
  cors({
    origin: corsOrigins,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Request-Id"]
  })
);

app.get("/", (c) =>
  c.json({
    service: "crypto-airdrop-studio-api",
    status: "ok",
    endpoints: {
      health: "/health",
      feed: "/api/feed"
    }
  })
);
app.get("/health", (c) => c.json({ ok: true }));
app.route("/api", airdropRouter);
app.route("/api/mock/aptos", aptosMockRouter);

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  console.error("Unhandled API error", error);
  return c.json({ message: "Internal server error" }, 500);
});

const port = Number(process.env.PORT ?? 8787);

export default {
  port,
  fetch: app.fetch
};
