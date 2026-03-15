import { beforeAll, describe, expect, test } from "bun:test";

let app: { fetch: (request: Request) => Promise<Response> };

beforeAll(async () => {
  const mod = await import(`../src/index.ts?cachebust=${Date.now()}-${Math.random()}`);
  app = mod.default;
});

function postJson(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("Aptos mock API integration", () => {
  test("happy path: quote and execute buy S updates balances", async () => {
    const walletAddress = "0xabcde001";

    const beforeResponse = await app.fetch(new Request(`http://localhost/api/mock/aptos/wallets/${walletAddress}/balances`));
    expect(beforeResponse.status).toBe(200);
    const beforePayload = await beforeResponse.json();

    const executeResponse = await app.fetch(
      postJson("/api/mock/aptos/s/buy/execute", {
        walletAddress,
        payToken: "APT",
        payAmount: 1
      })
    );

    expect(executeResponse.status).toBe(200);
    const execution = await executeResponse.json();
    expect(execution.status).toBe("confirmed");
    expect(execution.quote.payToken).toBe("APT");
    expect(execution.quote.payAmount).toBe(1);
    expect(execution.quote.netS).toBeGreaterThan(0);

    const afterResponse = await app.fetch(new Request(`http://localhost/api/mock/aptos/wallets/${walletAddress}/balances`));
    expect(afterResponse.status).toBe(200);
    const afterPayload = await afterResponse.json();

    expect(afterPayload.balances.APT).toBeLessThan(beforePayload.balances.APT);
    expect(afterPayload.balances.S).toBeGreaterThan(beforePayload.balances.S);
  });

  test("edge path: buy quote rejects non-positive amount", async () => {
    const response = await app.fetch(
      postJson("/api/mock/aptos/s/buy/quote", {
        payToken: "APT",
        payAmount: 0
      })
    );

    expect(response.status).toBe(400);
  });

  test("error path: donate rejects same source and destination wallet", async () => {
    const response = await app.fetch(
      postJson("/api/mock/aptos/s/donate", {
        fromWallet: "0xabcde002",
        toWallet: "0xabcde002",
        amountS: 1,
        idempotencyKey: "qa-same-wallet"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("fromWallet and toWallet must be different");
  });

  test("idempotency: duplicate donate request returns same settlement id", async () => {
    const payload = {
      fromWallet: "0xabcde003",
      toWallet: "0xabcde004",
      amountS: 1,
      idempotencyKey: "qa-idempotency-1"
    };

    const firstResponse = await app.fetch(postJson("/api/mock/aptos/s/donate", payload));
    expect(firstResponse.status).toBe(200);
    const firstSettlement = await firstResponse.json();

    const secondResponse = await app.fetch(postJson("/api/mock/aptos/s/donate", payload));
    expect(secondResponse.status).toBe(200);
    const secondSettlement = await secondResponse.json();

    expect(secondSettlement.settlementId).toBe(firstSettlement.settlementId);
    expect(secondSettlement.idempotencyKey).toBe(payload.idempotencyKey);
  });

  test("error path: unknown settlement lookup returns 404", async () => {
    const response = await app.fetch(new Request("http://localhost/api/mock/aptos/s/donate/set_missing"));

    expect(response.status).toBe(404);
  });
});
