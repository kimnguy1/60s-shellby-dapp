import { defineConfig } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./specs",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    browserName: "chromium",
    headless: process.env.QA_HEADLESS !== "0",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
});
