import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dbPath = join(tmpdir(), `airdrop-test-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);

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

describe("Vertical feed API integration", () => {
  test("GET / returns service metadata", async () => {
    const response = await app.fetch(new Request("http://localhost/"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      service: "crypto-airdrop-studio-api",
      status: "ok",
      endpoints: {
        health: "/health",
        feed: "/api/feed"
      }
    });
  });

  test("GET /health returns ok", async () => {
    const response = await app.fetch(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("CORS preflight allows local web origin for API routes", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/feed", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Method": "GET"
        }
      })
    );

    expect([200, 204]).toContain(response.status);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
  });

  test("POST /api/wallet/connect creates wallet profile for valid Aptos address", async () => {
    const response = await app.fetch(
      jsonRequest("/api/wallet/connect", {
        walletAddress: "0xabc123",
        displayName: "qa-user"
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      walletAddress: "0xabc123",
      displayName: "qa-user",
      balances: {
        apt: expect.any(Number),
        shelbyUsd: expect.any(Number),
        shelbyToken: expect.any(Number)
      }
    });
  });

  test("POST /api/wallet/connect rejects invalid wallet payload", async () => {
    const response = await app.fetch(
      jsonRequest("/api/wallet/connect", {
        walletAddress: "abc123"
      })
    );

    expect(response.status).toBe(400);
  });

  test("GET /api/feed returns seeded videos with aggregate metrics", async () => {
    const response = await app.fetch(new Request("http://localhost/api/feed"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        ownerWalletAddress: expect.stringMatching(/^0x/),
        likes: expect.any(Number),
        comments: expect.any(Number),
        donations: expect.any(Number),
        downloads: expect.any(Number)
      })
    );
  });

  test("GET /api/feed validates limit bounds", async () => {
    const response = await app.fetch(new Request("http://localhost/api/feed?limit=0"));

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("limit must be between 1 and 50");
  });

  test("happy path: upload + like/comment/donate/download updates feed metrics", async () => {
    const walletAddress = "0xface1234";

    await app.fetch(jsonRequest("/api/wallet/connect", { walletAddress }));

    const uploadResponse = await app.fetch(
      jsonRequest("/api/videos/upload", {
        walletAddress,
        videoUrl: "https://example.com/video.mp4",
        caption: "qa upload"
      })
    );
    expect(uploadResponse.status).toBe(201);
    const uploaded = await uploadResponse.json();
    const videoId = uploaded.id as string;

    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/like`, { walletAddress }))).status).toBe(200);
    expect(
      (await app.fetch(jsonRequest(`/api/videos/${videoId}/comment`, { walletAddress, content: "nice" }))).status
    ).toBe(200);
    expect((await app.fetch(jsonRequest(`/api/videos/${videoId}/donate`, { walletAddress, amount: 5 }))).status).toBe(200);

    const downloadResponse = await app.fetch(jsonRequest(`/api/videos/${videoId}/download`, { walletAddress }));
    expect(downloadResponse.status).toBe(200);
    expect(await downloadResponse.json()).toEqual({ url: "https://example.com/video.mp4" });

    const feedResponse = await app.fetch(new Request("http://localhost/api/feed?limit=50"));
    const feedPayload = await feedResponse.json();
    const created = feedPayload.items.find((item: { id: string }) => item.id === videoId);

    expect(created).toMatchObject({
      likes: 1,
      comments: 1,
      donations: 5,
      downloads: 1
    });
  });

  test("BUG: like endpoint should reject non-existent video id", async () => {
    const response = await app.fetch(
      jsonRequest("/api/videos/non-existent-video/like", {
        walletAddress: "0x1234"
      })
    );

    expect(response.status).toBe(404);
  });

  test("BUG: profile endpoint should reject invalid wallet format", async () => {
    const response = await app.fetch(new Request("http://localhost/api/profile/not-an-aptos-wallet"));

    expect(response.status).toBe(400);
  });
});
