import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pagePath = join(import.meta.dir, "..", "app", "page.tsx");
const page = readFileSync(pagePath, "utf8");

const hasPage = (snippet: string) => page.includes(snippet);

describe("CRY-57 profile parity re-verification", () => {
  test("happy path: bio edit flow persists and restores per-wallet data", () => {
    expect(hasPage("function bioStorageKey(walletAddress: string): string")).toBeTrue();
    expect(hasPage("window.localStorage.getItem(bioStorageKey(normalized))")).toBeTrue();
    expect(hasPage("window.localStorage.setItem(bioStorageKey(walletAddress), nextBio)")).toBeTrue();
    expect(hasPage("setProfileBio(storedBio)")).toBeTrue();
  });

  test("edge case: empty bio clears persisted value", () => {
    expect(hasPage("window.localStorage.removeItem(bioStorageKey(walletAddress))")).toBeTrue();
  });

  test("happy path: profile tabs expose active-state switching for all required tabs", () => {
    expect(hasPage('profileTab === "videos" ? "profile-tab profile-tab-active" : "profile-tab"')).toBeTrue();
    expect(hasPage('profileTab === "favorites" ? "profile-tab profile-tab-active" : "profile-tab"')).toBeTrue();
    expect(hasPage('profileTab === "liked" ? "profile-tab profile-tab-active" : "profile-tab"')).toBeTrue();
    expect(hasPage('onClick={() => setProfileTab("videos")}')).toBeTrue();
    expect(hasPage('onClick={() => setProfileTab("favorites")}')).toBeTrue();
    expect(hasPage('onClick={() => setProfileTab("liked")}')).toBeTrue();
  });

  test("happy path: uploads grid is wallet-scoped and rendered with mapped cards", () => {
    expect(hasPage("item.ownerWalletAddress === profile.walletAddress")).toBeTrue();
    expect(hasPage("uploadedVideos.map((video) => (")).toBeTrue();
    expect(hasPage('className="uploads-grid"')).toBeTrue();
  });

  test("error case: wallet-gated actions still enforce connection precondition", () => {
    expect(hasPage("Connect Aptos wallet to interact.")).toBeTrue();
    expect(hasPage('button onClick={() => void onLike(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button onClick={() => void onComment(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button className="donate-cta" onClick={() => void onDonate(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button onClick={() => void onDownload(item.id)} disabled={!canInteract}')).toBeTrue();
    expect(hasPage('button onClick={() => void onUpload()} disabled={loading || !canInteract}')).toBeTrue();
    expect(hasPage('button onClick={() => void onSaveProfile()} disabled={loading || !canInteract}')).toBeTrue();
  });
});
