import { beforeAll, describe, expect, test } from "bun:test";

let app: { fetch: (request: Request) => Promise<Response> };

beforeAll(async () => {
  const mod = await import("../src/index.ts");
  app = mod.default;
});

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function seededVideoId(): Promise<string> {
  const response = await app.fetch(new Request("http://localhost/api/feed?limit=1"));
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.items.length).toBeGreaterThan(0);
  return payload.items[0].id as string;
}

describe("Wallet-gated interaction requirements", () => {
  test("public feed remains accessible without wallet connect", async () => {
    const response = await app.fetch(new Request("http://localhost/api/feed?limit=5"));
    expect(response.status).toBe(200);
  });

  test("BUG: like should be rejected before wallet connect", async () => {
    const videoId = await seededVideoId();
    const response = await app.fetch(
      jsonRequest(`/api/videos/${videoId}/like`, {
        walletAddress: "0xabab000000000000000000000000000000000000000000000000000000000001"
      })
    );

    expect([401, 403]).toContain(response.status);
  });

  test("BUG: comment should be rejected before wallet connect", async () => {
    const videoId = await seededVideoId();
    const response = await app.fetch(
      jsonRequest(`/api/videos/${videoId}/comment`, {
        walletAddress: "0xabab000000000000000000000000000000000000000000000000000000000002",
        content: "qa-anon-comment"
      })
    );

    expect([401, 403]).toContain(response.status);
  });

  test("BUG: donate should be rejected before wallet connect", async () => {
    const videoId = await seededVideoId();
    const response = await app.fetch(
      jsonRequest(`/api/videos/${videoId}/donate`, {
        walletAddress: "0xabab000000000000000000000000000000000000000000000000000000000003",
        amount: 5
      })
    );

    expect([401, 403]).toContain(response.status);
  });

  test("BUG: download should be rejected before wallet connect", async () => {
    const videoId = await seededVideoId();
    const response = await app.fetch(
      jsonRequest(`/api/videos/${videoId}/download`, {
        walletAddress: "0xabab000000000000000000000000000000000000000000000000000000000004"
      })
    );

    expect([401, 403]).toContain(response.status);
  });
});
