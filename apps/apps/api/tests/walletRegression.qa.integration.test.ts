import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dbPath = join(tmpdir(), `wallet-regression-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);

let app: { fetch: (request: Request) => Promise<Response> };

beforeAll(async () => {
  process.env.DB_PATH = dbPath;
  const mod = await import(`../src/index.ts?cachebust=${Date.now()}-${Math.random()}`);
  app = mod.default;
});

afterAll(() => {
  delete process.env.DB_PATH;
});

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function firstVideoId(): Promise<string> {
  const response = await app.fetch(new Request("http://localhost/api/feed?limit=1"));
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.items.length).toBeGreaterThan(0);
  return payload.items[0].id as string;
}

describe("CRY-61 wallet regression verification", () => {
  test("reported wallet address connects and can use gated actions", async () => {
    const walletAddress = "0x9f262a18652f16c3aa1ec4a809f882161b3e682849e4315fa3646f99d7524eb0";
    const videoId = await firstVideoId();

    const connectResponse = await app.fetch(jsonRequest("/api/wallet/connect", { walletAddress, displayName: "qa-reported" }));
    expect(connectResponse.status).toBe(200);
    expect(await connectResponse.json()).toMatchObject({
      walletAddress,
      displayName: "qa-reported"
    });

    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/like`, { walletAddress }))).status).toBe(200);
    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/comment`, { walletAddress, content: "regression comment" }))).status).toBe(200);
    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/donate`, { walletAddress, amount: 5 }))).status).toBe(200);

    const downloadResponse = await app.fetch(jsonRequest(`/api/videos/${videoId}/download`, { walletAddress }));
    expect(downloadResponse.status).toBe(200);
    expect(await downloadResponse.json()).toEqual({ url: expect.any(String) });
  });

  test("additional valid wallet also passes gated action flow after connect", async () => {
    const walletAddress = "0x3b8f6d7c2a1e4b9d8c7f6a5e4d3c2b1a0f9e8d7c6b5a49382716151413121110";
    const videoId = await firstVideoId();

    const connectResponse = await app.fetch(jsonRequest("/api/wallet/connect", { walletAddress, displayName: "qa-secondary" }));
    expect(connectResponse.status).toBe(200);

    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/like`, { walletAddress }))).status).toBe(200);
    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/comment`, { walletAddress, content: "secondary comment" }))).status).toBe(200);
    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/donate`, { walletAddress, amount: 3 }))).status).toBe(200);
    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/download`, { walletAddress }))).status).toBe(200);
  });

  test("error path: like/comment/donate/download remain blocked before wallet connect", async () => {
    const walletAddress = "0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed";
    const videoId = await firstVideoId();

    const likeResponse = await app.fetch(jsonRequest(`/api/videos/${videoId}/like`, { walletAddress }));
    const commentResponse = await app.fetch(jsonRequest(`/api/videos/${videoId}/comment`, { walletAddress, content: "anon" }));
    const donateResponse = await app.fetch(jsonRequest(`/api/videos/${videoId}/donate`, { walletAddress, amount: 1 }));
    const downloadResponse = await app.fetch(jsonRequest(`/api/videos/${videoId}/download`, { walletAddress }));

    expect(likeResponse.status).toBe(401);
    expect(commentResponse.status).toBe(401);
    expect(donateResponse.status).toBe(401);
    expect(downloadResponse.status).toBe(401);
  });
});
