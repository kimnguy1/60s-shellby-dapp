export type WalletToken = "APT" | "SHELBY_USD" | "S";

export type WalletBalances = {
  APT: number;
  SHELBY_USD: number;
  S: number;
};

export type WalletProfile = {
  walletAddress: string;
  displayName: string;
  balances: WalletBalances;
};

export type BuyQuote = {
  payToken: Exclude<WalletToken, "S">;
  payAmount: number;
  rate: number;
  feeBps: number;
  grossS: number;
  feeS: number;
  netS: number;
};

export type BuyExecution = {
  txHash: string;
  status: "confirmed";
  quote: BuyQuote;
  balances: WalletBalances;
};

export type DonateSettlement = {
  settlementId: string;
  fromWallet: string;
  toWallet: string;
  amountS: number;
  idempotencyKey: string;
  status: "pending" | "confirmed";
  createdAt: number;
  updatedAt: number;
};

type WalletState = {
  displayName: string;
  balances: WalletBalances;
};

const RATE_BY_TOKEN: Record<Exclude<WalletToken, "S">, number> = {
  APT: 12.5,
  SHELBY_USD: 1
};

const BUY_FEE_BPS = 50;
const DONATION_CONFIRM_MS = 1200;
const APTOS_ADDRESS_REGEX = /^0x[a-f0-9]{4,64}$/;

class AptosMockService {
  private wallets = new Map<string, WalletState>();
  private settlements = new Map<string, DonateSettlement>();
  private idempotencyByWallet = new Map<string, string>();
  private sequence = 1;

  normalizeWalletAddress(walletAddress: string): string {
    const normalized = walletAddress.trim().toLowerCase();
    if (!APTOS_ADDRESS_REGEX.test(normalized)) {
      throw new Error("walletAddress must be a valid Aptos hex address");
    }

    return normalized;
  }

  getProfile(walletAddress: string): WalletProfile {
    const wallet = this.getOrCreateWallet(walletAddress);
    return {
      walletAddress,
      displayName: wallet.displayName,
      balances: { ...wallet.balances }
    };
  }

  getBalances(walletAddress: string): WalletBalances {
    return { ...this.getOrCreateWallet(walletAddress).balances };
  }

  quoteBuyS(payToken: Exclude<WalletToken, "S">, payAmount: number): BuyQuote {
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      throw new Error("payAmount must be a positive number");
    }

    const rate = RATE_BY_TOKEN[payToken];
    const grossS = this.round(payAmount * rate);
    const feeS = this.round((grossS * BUY_FEE_BPS) / 10_000);
    const netS = this.round(grossS - feeS);

    return {
      payToken,
      payAmount: this.round(payAmount),
      rate,
      feeBps: BUY_FEE_BPS,
      grossS,
      feeS,
      netS
    };
  }

  executeBuyS(walletAddress: string, payToken: Exclude<WalletToken, "S">, payAmount: number): BuyExecution {
    const wallet = this.getOrCreateWallet(walletAddress);
    const quote = this.quoteBuyS(payToken, payAmount);

    if (wallet.balances[payToken] < quote.payAmount) {
      throw new Error(`insufficient ${payToken} balance`);
    }

    wallet.balances[payToken] = this.round(wallet.balances[payToken] - quote.payAmount);
    wallet.balances.S = this.round(wallet.balances.S + quote.netS);

    return {
      txHash: this.generateId("0xbuy"),
      status: "confirmed",
      quote,
      balances: { ...wallet.balances }
    };
  }

  donateS(fromWalletAddress: string, toWalletAddress: string, amountS: number, idempotencyKey: string): DonateSettlement {
    if (!idempotencyKey.trim()) {
      throw new Error("idempotencyKey is required");
    }
    if (!Number.isFinite(amountS) || amountS <= 0) {
      throw new Error("amountS must be a positive number");
    }

    const fromWallet = this.getOrCreateWallet(fromWalletAddress);
    this.getOrCreateWallet(toWalletAddress);

    if (fromWalletAddress === toWalletAddress) {
      throw new Error("fromWallet and toWallet must be different");
    }

    const dedupeKey = `${fromWalletAddress}:${idempotencyKey}`;
    const existingSettlementId = this.idempotencyByWallet.get(dedupeKey);
    if (existingSettlementId) {
      const existing = this.settlements.get(existingSettlementId);
      if (!existing) {
        throw new Error("idempotency state corrupted");
      }
      return this.advanceSettlement(existing);
    }

    const roundedAmount = this.round(amountS);
    if (fromWallet.balances.S < roundedAmount) {
      throw new Error("insufficient S balance");
    }

    fromWallet.balances.S = this.round(fromWallet.balances.S - roundedAmount);

    const now = Date.now();
    const settlement: DonateSettlement = {
      settlementId: this.generateId("set"),
      fromWallet: fromWalletAddress,
      toWallet: toWalletAddress,
      amountS: roundedAmount,
      idempotencyKey,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    this.settlements.set(settlement.settlementId, settlement);
    this.idempotencyByWallet.set(dedupeKey, settlement.settlementId);

    return this.advanceSettlement(settlement);
  }

  getDonationSettlement(settlementId: string): DonateSettlement {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) {
      throw new Error("settlement not found");
    }

    return this.advanceSettlement(settlement);
  }

  private getOrCreateWallet(walletAddress: string): WalletState {
    const existing = this.wallets.get(walletAddress);
    if (existing) {
      return existing;
    }

    const seed = this.hash(walletAddress);
    const wallet: WalletState = {
      displayName: `user_${walletAddress.slice(2, 8)}`,
      balances: {
        APT: this.round(5 + (seed % 250) / 10),
        SHELBY_USD: this.round(100 + (seed % 5000) / 10),
        S: this.round(10 + (seed % 1500) / 10)
      }
    };

    this.wallets.set(walletAddress, wallet);
    return wallet;
  }

  private advanceSettlement(settlement: DonateSettlement): DonateSettlement {
    const now = Date.now();

    if (settlement.status === "pending" && now - settlement.createdAt >= DONATION_CONFIRM_MS) {
      settlement.status = "confirmed";
      settlement.updatedAt = now;

      const receiver = this.getOrCreateWallet(settlement.toWallet);
      receiver.balances.S = this.round(receiver.balances.S + settlement.amountS);
    }

    return { ...settlement };
  }

  private generateId(prefix: string): string {
    const value = `${prefix}_${this.sequence.toString(16).padStart(8, "0")}`;
    this.sequence += 1;
    return value;
  }

  private hash(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  private round(value: number): number {
    return Math.round(value * 10_000) / 10_000;
  }
}

let singleton: AptosMockService | null = null;

export function getAptosMockService(): AptosMockService {
  if (!singleton) {
    singleton = new AptosMockService();
  }

  return singleton;
}
