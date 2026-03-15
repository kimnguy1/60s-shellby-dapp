import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const stylesPath = join(import.meta.dir, "..", "app", "styles.css");

const page = readFileSync(pagePath, "utf8");
const styles = readFileSync(stylesPath, "utf8");

const hasPage = (snippet: string) => page.includes(snippet);
const hasStyle = (snippet: string) => styles.includes(snippet);

describe("CRY-82 TikTok-style rebuild QA", () => {
  test("happy path: vertical feed and overlay controls are present", () => {
    expect(hasStyle("scroll-snap-type: y mandatory;")).toBeTrue();
    expect(hasStyle("scroll-snap-align: start;")).toBeTrue();
    expect(hasPage('className="video-feed-container"')).toBeTrue();
    expect(hasPage('className="video-overlay absolute bottom-0"')).toBeTrue();
    expect(hasPage('className="action-rail"')).toBeTrue();
    expect(hasPage('ActionIcon name="like"')).toBeTrue();
    expect(hasPage('ActionIcon name="comment"')).toBeTrue();
    expect(hasPage('ActionIcon name="share"')).toBeTrue();
    expect(hasPage('ActionIcon name="donate"')).toBeTrue();
  });

  test("happy path: wallet and donate modal UX states exist", () => {
    expect(hasPage('walletStandardAvailable ? "Connect Aptos Wallet" : "Connect Aptos Wallet (Manual)"')).toBeTrue();
    expect(hasPage('role="dialog" aria-modal="true" aria-label="Donate APT"')).toBeTrue();
    expect(hasPage('setDonateStatus("signing")')).toBeTrue();
    expect(hasPage('setDonateStatus("submitting")')).toBeTrue();
    expect(hasPage('setDonateStatus("success")')).toBeTrue();
    expect(hasPage('setDonateStatus("error")')).toBeTrue();
  });

  test("error case: each video should be true full-screen with no card border/padding", () => {
    expect(
      hasStyle(`.video-card {
  scroll-snap-align: start;
  min-height: 100vh;`)
    ).toBeTrue();
    expect(
      hasStyle(`.video-card {
  scroll-snap-align: start;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 560px) 64px;
  justify-content: center;
  align-items: end;
  gap: 0.5rem;
  padding: 0;
  border-radius: 0;
  border: none;`)
    ).toBeTrue();
  });

  test("error case: video cards should expose an NFT badge when item is NFT", () => {
    expect(hasPage("NFT")).toBeTrue();
    expect(hasPage("badge")).toBeTrue();
  });
});
