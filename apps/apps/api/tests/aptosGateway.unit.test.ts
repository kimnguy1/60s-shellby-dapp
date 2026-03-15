import { describe, expect, test } from "bun:test";
import { getAptosGateway } from "../src/services/aptosGateway";

describe("MockAptosGateway", () => {
  test("returns eligible=true for even-length wallet address", async () => {
    const gateway = getAptosGateway();
    const result = await gateway.checkEligibility("0x1234", "shelby-genesis");

    expect(result).toEqual({ eligible: true });
  });

  test("returns eligible=false with reason for odd-length wallet address", async () => {
    const gateway = getAptosGateway();
    const result = await gateway.checkEligibility("0x123", "shelby-genesis");

    expect(result).toEqual({
      eligible: false,
      reason: "Wallet not in allowlist"
    });
  });

  test("submitClaim throws when walletAddress or campaignId is missing", async () => {
    const gateway = getAptosGateway();

    await expect(gateway.submitClaim("", "")).rejects.toThrow("walletAddress and campaignId are required");
  });

  test("submitClaim returns tx hash and claimed status", async () => {
    const gateway = getAptosGateway();
    const result = await gateway.submitClaim("0x1234", "shelby-genesis");

    expect(result.status).toBe("claimed");
    expect(result.txHash).toMatch(/^0x[0-9a-f]+$/);
  });
});
