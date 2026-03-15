import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const stylesPath = join(import.meta.dir, "..", "app", "styles.css");
const page = readFileSync(pagePath, "utf8");
const styles = readFileSync(stylesPath, "utf8");

const hasPage = (snippet: string) => page.includes(snippet);
const hasStyles = (snippet: string) => styles.includes(snippet);

describe("CRY-69 wallet + UI refinement QA", () => {
  test("happy path: Wallet Standard Petra connect flow exists and renders connected address affordances", () => {
    expect(hasPage('installedWallets.find((wallet) => wallet.name === "Petra")')).toBeTrue();
    expect(hasPage("await connectWithAddress(connectedAddress)")).toBeTrue();
    expect(hasPage('className="wallet-pill"')).toBeTrue();
    expect(hasPage("{formatWalletAddress(walletAddress)}")).toBeTrue();
    expect(hasPage('title={walletAddress}')).toBeTrue();
    expect(hasPage("Connected wallet")).toBeTrue();
    expect(hasPage('{walletCopyStatus === "copied" ? "Copied" : walletCopyStatus === "failed" ? "Copy failed" : "Copy"}')).toBeTrue();
  });

  test("happy path: profile and wallet are unified under one drawer context", () => {
    expect(hasPage('const isProfileWalletPanel = navPanel === "profile" || navPanel === "wallet";')).toBeTrue();
    expect(hasPage('{navPanel === "upload" ? "Upload" : "Profile & Wallet"}')).toBeTrue();
    expect(hasPage('onClick={() => setNavPanel("profile")}')).toBeTrue();
    expect(hasPage("Profile & Wallet")).toBeTrue();
    expect(hasPage("{isProfileWalletPanel ? (")).toBeTrue();
  });

  test("happy path: left navigation/sidebar layout is shifted tighter to the corner", () => {
    expect(hasStyles("padding: 1rem 1rem 1rem 0.4rem;")).toBeTrue();
    expect(hasStyles("padding: 0 0.75rem 0 0.25rem;")).toBeTrue();
    expect(hasPage('data-purpose="navigation-sidebar"')).toBeTrue();
  });

  test("edge case: wallet connect falls back to manual mode when extension is not available", () => {
    expect(hasPage('walletStandardAvailable ? "Connect Aptos Wallet" : "Connect Aptos Wallet (Manual)"')).toBeTrue();
    expect(hasPage('"No Wallet Standard extension detected, manual address fallback enabled."')).toBeTrue();
    expect(hasPage('throw new Error("Enter an Aptos wallet address")')).toBeTrue();
  });

  test("regression: disconnect flow still exists and gated actions remain locked when disconnected", () => {
    expect(hasPage("await walletCore.disconnect()")).toBeTrue();
    expect(hasPage("setWalletDisconnected()")).toBeTrue();
    expect(hasPage('if (!canInteract) {')).toBeTrue();
    expect(hasPage('setError("Connect Aptos wallet to interact.");')).toBeTrue();
    expect(hasPage('button onClick={() => void onLike(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button onClick={() => void onComment(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button className="donate-cta" onClick={() => void onDonate(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button onClick={() => void onDownload(item.id)} disabled={!canInteract}')).toBeTrue();
  });

  test("error case: invalid wallet address path is explicitly handled", () => {
    expect(hasPage('setError("Invalid Aptos wallet address")')).toBeTrue();
    expect(hasPage('throw new Error("Invalid Aptos wallet address")')).toBeTrue();
  });
});
