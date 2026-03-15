import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const page = readFileSync(pagePath, "utf8");

describe("CRY-94 audio playback QA checks", () => {
  test("happy path: feed video keeps autoplay wiring for active card", () => {
    expect(page.includes("autoPlay={index === activeIndex}")).toBeTrue();
    expect(page.includes("controls")).toBeTrue();
  });

  test("regression guard: active feed video should not be hard-muted", () => {
    const activeVideoHardMuted = /autoPlay=\{index === activeIndex\}[\s\S]{0,120}\bmuted\b/.test(page);
    expect(activeVideoHardMuted).toBeFalse();
  });
});
