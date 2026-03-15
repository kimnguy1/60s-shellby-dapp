import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const page = readFileSync(pagePath, "utf8");

const hasPage = (snippet: string) => page.includes(snippet);

describe("CRY-54 profile parity QA checks", () => {
  test("happy path: profile load flow is wired after wallet connect", () => {
    expect(hasPage("await getProfile(normalized)")).toBeTrue();
    expect(hasPage("Connect wallet to load profile.")).toBeTrue();
  });

  test("happy path: display name edit flow exists and validates required input", () => {
    expect(hasPage("profileDisplayNameInput")).toBeTrue();
    expect(hasPage("setProfileDisplayNameInput")).toBeTrue();
    expect(hasPage("Display name is required")).toBeTrue();
    expect(hasPage("Save Profile")).toBeTrue();
  });

  test("happy path: avatar edit supports URL and file upload", () => {
    expect(hasPage("Avatar URL")).toBeTrue();
    expect(hasPage("accept=\"image/*\"")).toBeTrue();
    expect(hasPage("window.localStorage.setItem")).toBeTrue();
  });

  test("happy path: profile balances render ShelbyUSD, APT and S", () => {
    expect(hasPage("APT: {profile.balances.apt}")).toBeTrue();
    expect(hasPage("ShelbyUSD: {profile.balances.shelbyUsd}")).toBeTrue();
    expect(hasPage("S: {profile.balances.shelbyToken}")).toBeTrue();
  });

  test("error case: non-image avatar files are rejected", () => {
    expect(hasPage("Avatar file must be an image")).toBeTrue();
  });

  test("parity requirement: profile must support editable bio", () => {
    expect(hasPage("profileBio")).toBeTrue();
    expect(hasPage("Bio")).toBeTrue();
  });

  test("parity requirement: profile should render uploads grid, not uploads count only", () => {
    expect(hasPage("Uploads grid")).toBeTrue();
    expect(hasPage("uploadedVideos.map")).toBeTrue();
  });

  test("parity requirement: profile tabs must support Videos/Favorites/Liked switching", () => {
    expect(hasPage("Videos")).toBeTrue();
    expect(hasPage("Favorites")).toBeTrue();
    expect(hasPage("Liked")).toBeTrue();
    expect(hasPage("setProfileTab")).toBeTrue();
  });
});
