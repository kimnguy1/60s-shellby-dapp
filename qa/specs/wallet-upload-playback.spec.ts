import { expect, test } from "@playwright/test";

const WALLET_ADDRESS =
  process.env.QA_WALLET_ADDRESS ?? "0x1234000000000000000000000000000000000000000000000000000000000000";
const VIDEO_URL =
  process.env.QA_VIDEO_URL ?? "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const DISPLAY_NAME = process.env.QA_DISPLAY_NAME ?? "QA Browser";

test("manual wallet connect + upload + playback smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "60s" })).toBeVisible();
  await page.getByRole("button", { name: "Wallet" }).click();

  await page.getByPlaceholder("0x... Aptos wallet").fill(WALLET_ADDRESS);
  await page.getByPlaceholder("Display name (optional)").fill(DISPLAY_NAME);
  await page.getByRole("button", { name: /Connect Aptos Wallet/ }).click();

  await expect(page.getByRole("button", { name: "Disconnect Wallet" })).toBeVisible();

  await page.getByRole("button", { name: "Upload" }).click();
  await page.getByPlaceholder("https://.../clip.mp4").fill(VIDEO_URL);
  await page.getByPlaceholder("Caption").fill("QA smoke upload clip");
  await page.getByRole("button", { name: "Upload to Feed" }).click();

  const activeVideo = page.locator("video.video-stage");
  await expect(activeVideo).toBeVisible();
  await expect(activeVideo).toHaveAttribute("src", new RegExp(VIDEO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  await page.waitForFunction(() => {
    const video = document.querySelector("video.video-stage") as HTMLVideoElement | null;
    return Boolean(video && video.readyState >= 2);
  });

  await expect(page.getByRole("button", { name: /Like/i })).toBeEnabled();
});
