import { describe, expect, test } from "bun:test";
import { getAptosMockService } from "../src/services/aptosMockService";

const walletA = "0xaaaabbbb";
const walletB = "0xccccdddd";

describe("AptosMockService", () => {
  test("normalizes lowercase Aptos wallet format", () => {
    const service = getAptosMockService();
    expect(service.normalizeWalletAddress("0xABCDEF")).toBe("0xabcdef");
  });

  test("quotes S buy with positive net amount", () => {
    const service = getAptosMockService();
    const quote = service.quoteBuyS("APT", 2);

    expect(quote.payToken).toBe("APT");
    expect(quote.payAmount).toBe(2);
    expect(quote.netS).toBeGreaterThan(0);
    expect(quote.grossS).toBeGreaterThan(quote.feeS);
  });

  test("executes buy and returns confirmed tx", () => {
    const service = getAptosMockService();
    const result = service.executeBuyS(walletA, "SHELBY_USD", 1);

    expect(result.status).toBe("confirmed");
    expect(result.txHash).toMatch(/^0xbuy_/);
    expect(result.balances.S).toBeGreaterThan(0);
  });

  test("donateS enforces idempotency key", () => {
    const service = getAptosMockService();

    expect(() => service.donateS(walletA, walletB, 1, "")).toThrow("idempotencyKey is required");
  });
});
