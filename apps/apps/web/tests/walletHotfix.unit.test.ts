import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const page = readFileSync(pagePath, "utf8");

describe("CRY-37 wallet hotfix regression checks", () => {
  test("happy path: Wallet Standard connect/disconnect flow exists", () => {
    expect(page).toContain("const walletCore = new WalletCore()");
    expect(page).toContain("const installedWallets = walletCore ? getInstalledWallets(walletCore) : []");
    expect(page).toContain("if (walletCore && installedWallets.length > 0)");
    expect(page).toContain("await walletCore.connect(preferredWallet.name)");
    expect(page).toContain("await walletCore.disconnect()");
    expect(page).toContain("await connectWithAddress(connectedAddress)");
  });

  test("edge path: manual wallet fallback remains available when extension is missing", () => {
    expect(page).toContain("WalletReadyState.Installed");
    expect(page).toContain("Connect Aptos Wallet (Manual)");
    expect(page).toContain("No Wallet Standard extension detected, manual address fallback enabled.");
    expect(page).toContain("const manualAddress = walletAddress.trim()");
    expect(page).toContain("if (!manualAddress)");
    expect(page).toContain('throw new Error("Enter an Aptos wallet address")');
  });

  test("regression: manual address fallback runs when Wallet Standard connect throws", () => {
    expect(page).toContain("} catch (walletStandardError) {");
    expect(page).toContain("if (!manualAddress)");
    expect(page).toContain("await connectWithAddress(manualAddress)");
  });

  test("error path: explicit guardrails exist for wallet connection failures", () => {
    expect(page).toContain('throw new Error("No Aptos Wallet Standard wallet is available")');
    expect(page).toContain('throw new Error("Wallet connected but did not return an address")');
    expect(page).toContain('setError("Invalid Aptos wallet address")');
  });

  test("regression: deprecated window.petra runtime dependency is removed", () => {
    expect(/window\.petra/.test(page)).toBeFalse();
  });

  test("wallet-gated actions stay locked when disconnected", () => {
    expect(page).toContain('if (!canInteract)');
    expect(page).toContain('setError("Connect Aptos wallet to interact.")');
    expect(page).toContain('disabled={!canInteract}');
  });
});
