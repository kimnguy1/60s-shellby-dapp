import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { ApiError, connectWallet, getFeed } from "../src/lib/api";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

beforeEach(() => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      jsonResponse({
        ok: true
      })
    )
  ) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("api client incident checks", () => {
  test("happy path: connectWallet posts payload and returns parsed json", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        jsonResponse({
          walletAddress: "0x1234",
          displayName: "qa",
          balances: { apt: "1", shelbyUsd: "2", shelbyToken: "3" }
        })
      )
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await connectWallet("0x1234", "qa");

    expect(result.walletAddress).toBe("0x1234");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8787/api/wallet/connect");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ walletAddress: "0x1234", displayName: "qa" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((init.headers as Record<string, string>)["X-Request-Id"].length).toBeGreaterThan(0);
  });

  test("edge case: getFeed retries once on 5xx and then succeeds", async () => {
    let attempts = 0;
    const fetchMock = mock(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.resolve(jsonResponse({ message: "temporarily down" }, 503));
      }
      return Promise.resolve(
        jsonResponse({
          items: []
        })
      );
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await getFeed();

    expect(result.items).toBeArray();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("error case: timeout abort is mapped to ApiError 408", async () => {
    const fetchMock = mock(() => Promise.reject(new DOMException("The operation was aborted.", "AbortError")));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(connectWallet("0x1234")).rejects.toMatchObject<ApiError>({
      name: "ApiError",
      status: 408,
      message: "Backend API timed out at http://localhost:8787. Check API health/network, then retry."
    });
  });

  test("error case: connection refusal maps to operator-friendly backend unavailable message", async () => {
    const fetchMock = mock(() => Promise.reject(new TypeError("fetch failed")));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(connectWallet("0x1234")).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "Cannot reach backend API at http://localhost:8787. Start or restart the API service, then retry."
    });
  });

  test("error case: getFeed retries once and then maps backend unreachable to ApiError 503", async () => {
    const fetchMock = mock(() => Promise.reject(new TypeError("fetch failed")));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(getFeed()).rejects.toMatchObject<ApiError>({
      name: "ApiError",
      status: 503,
      message: "Cannot reach backend API at http://localhost:8787. Start or restart the API service, then retry."
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
