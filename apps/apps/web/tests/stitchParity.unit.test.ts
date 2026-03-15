import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const stylesPath = join(import.meta.dir, "..", "app", "styles.css");

const page = readFileSync(pagePath, "utf8");
const styles = readFileSync(stylesPath, "utf8");
const hasPage = (snippet: string) => page.includes(snippet);
const hasStyle = (snippet: string) => styles.includes(snippet);

describe("CRY-42 Stitch parity checks", () => {
  test("header should expose logo, search, upload, connect wallet and profile entry in top bar", () => {
    expect(hasPage("<header")).toBeTrue();
    expect(hasPage("<h1>60s</h1>")).toBeTrue();
    expect(hasPage('aria-label="Search feed"')).toBeTrue();
    expect(hasPage("Upload")).toBeTrue();
    expect(hasPage("Connect Wallet")).toBeTrue();
    expect(hasPage("Profile")).toBeTrue();
  });

  test("left rail should match social-nav style options from source of truth", () => {
    expect(hasPage("For You")).toBeTrue();
    expect(hasPage("Following")).toBeTrue();
    expect(hasPage("Explore")).toBeTrue();
    expect(hasPage("Live")).toBeTrue();
  });

  test("center feed should use vertical snap-scrolling composition", () => {
    expect(hasStyle("scroll-snap-type: y mandatory")).toBeTrue();
    expect(hasStyle("scroll-snap-align: start")).toBeTrue();
    expect(hasPage("video-feed")).toBeTrue();
  });

  test("video card should keep portrait frame with bottom caption overlay treatment", () => {
    expect(hasStyle("aspect-ratio: 9 / 16")).toBeTrue();
    expect(hasStyle("linear-gradient")).toBeTrue();
    expect(hasPage("absolute bottom-0")).toBeTrue();
  });

  test("action rail should remain vertical and adjacent to primary video card", () => {
    expect(hasPage("className=\"action-rail\"")).toBeTrue();
    expect(hasStyle(".action-rail")).toBeTrue();
    expect(hasStyle("width: 82px")).toBeTrue();
    expect(hasStyle("grid-template-columns: minmax(0, 520px) 86px")).toBeTrue();
  });

  test("right rail should include trending/discovery context alongside recommended content", () => {
    expect(hasPage("Recommended")).toBeTrue();
    expect(hasPage("Trending Topics")).toBeTrue();
  });

  test("visual direction should remain consumer-social dark theme instead of dashboard-like shell", () => {
    expect(hasStyle("color-scheme: dark")).toBeTrue();
    expect(hasStyle("--accent")).toBeTrue();
    expect(hasPage("Short-form Video")).toBeTrue();
  });

  test("wallet/profile/upload integration should not break feed composition", () => {
    expect(hasPage("await refreshFeed()")).toBeTrue();
    expect(hasPage("withWalletGate")).toBeTrue();
    expect(hasPage("Upload to Feed")).toBeTrue();
    expect(hasPage("Save Profile")).toBeTrue();
  });

  test("upload flow should support both URL and local device source with Shelby verification hint", () => {
    expect(hasPage("uploadSource")).toBeTrue();
    expect(hasPage("Device (. )")).toBeTrue();
    expect(hasPage("onUploadFileChange")).toBeTrue();
    expect(hasPage("Shelby upload check")).toBeTrue();
    expect(hasPage("Download latest upload")).toBeTrue();
  });

  test("action rail should include icon-driven like/comment/share/donate/download actions", () => {
    expect(hasPage("ActionIcon")).toBeTrue();
    expect(hasPage('ActionIcon name="like"')).toBeTrue();
    expect(hasPage('ActionIcon name="comment"')).toBeTrue();
    expect(hasPage('ActionIcon name="share"')).toBeTrue();
    expect(hasPage('ActionIcon name="donate"')).toBeTrue();
    expect(hasPage('ActionIcon name="download"')).toBeTrue();
  });

  test("following/explorer flow should consume synthetic fixture metadata for richer demo feed", () => {
    expect(hasPage("syntheticFollowGraphHints")).toBeTrue();
    expect(hasPage("syntheticCreators")).toBeTrue();
    expect(hasPage("Creator suggestions")).toBeTrue();
  });
});
