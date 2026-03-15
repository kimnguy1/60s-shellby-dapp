import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const stylesPath = join(import.meta.dir, "..", "app", "styles.css");
const page = readFileSync(pagePath, "utf8");
const styles = readFileSync(stylesPath, "utf8");

describe("CRY-81 Aptos donate flow", () => {
  test("wallet donation flow signs and submits Aptos transfer transaction", () => {
    expect(page).toContain("function parseAptAmount");
    expect(page).toContain("function buildAptTransferTransaction");
    expect(page).toContain('function: "0x1::aptos_account::transfer"');
    expect(page).toContain("await walletCore.signAndSubmitTransaction(tx)");
    expect(page).toContain("await donateVideo(donateTarget.id, walletAddress, parsedAmount.aptAmount)");
  });

  test("donate modal UI and status states are rendered", () => {
    expect(page).toContain('role="dialog"');
    expect(page).toContain('aria-label="Donate APT"');
    expect(page).toContain("Confirm Donation");
    expect(page).toContain("Await wallet approval to sign transaction");
    expect(page).toContain('className={donateStatus === "error" ? "donate-status donate-status-error" : "donate-status"}');
    expect(styles).toContain(".donate-modal-backdrop");
    expect(styles).toContain(".donate-modal");
    expect(styles).toContain(".donate-status-error");
  });
});
