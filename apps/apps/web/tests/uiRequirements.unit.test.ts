import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const stylesPath = join(import.meta.dir, "..", "app", "styles.css");
const pagePath = join(import.meta.dir, "..", "app", "page.tsx");

const styles = readFileSync(stylesPath, "utf8");
const page = readFileSync(pagePath, "utf8");

describe("CRY-30 UI requirement checks", () => {
  test("BUG: page should use dark theme baseline", () => {
    expect(styles).toContain("color-scheme: dark");
  });

  test("BUG: layout should include right-side comments/recommended rail", () => {
    const shellRuleMatch = styles.match(/\.shell\s*\{[^}]*grid-template-columns:\s*([^;]+);/s);
    const columnSpec = shellRuleMatch?.[1]?.trim() ?? "";
    const hasThreeColumnGrid = columnSpec.split(/\s+/).length >= 3;
    expect(hasThreeColumnGrid).toBeTrue();
  });

  test("feed remains publicly visible for anonymous users", () => {
    expect(page).toContain("await refreshFeed()");
    expect(page).toContain("if (!canInteract)");
  });
});
