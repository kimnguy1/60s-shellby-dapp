import { randomUUIDv7 } from "bun";

export type EligibilityResult = {
  eligible: boolean;
  reason?: string;
};

export type ClaimResult = {
  txHash: string;
  status: "pending" | "claimed";
};

export interface AptosContractGateway {
  checkEligibility(walletAddress: string, campaignId: string): Promise<EligibilityResult>;
  submitClaim(walletAddress: string, campaignId: string): Promise<ClaimResult>;
}

class MockAptosGateway implements AptosContractGateway {
  async checkEligibility(walletAddress: string): Promise<EligibilityResult> {
    // Deterministic mock policy to keep local testing predictable.
    const eligible = walletAddress.length % 2 === 0;
    return eligible ? { eligible: true } : { eligible: false, reason: "Wallet not in allowlist" };
  }

  async submitClaim(walletAddress: string, campaignId: string): Promise<ClaimResult> {
    if (!walletAddress || !campaignId) {
      throw new Error("walletAddress and campaignId are required");
    }

    return {
      txHash: `0x${randomUUIDv7().replaceAll("-", "")}`,
      status: "claimed"
    };
  }
}

export function getAptosGateway(): AptosContractGateway {
  return new MockAptosGateway();
}
