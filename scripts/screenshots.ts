// Captures README screenshots from the demo shop. Read-only: the entry is previewed, never confirmed.
// Run with the dev server up: npx tsx scripts/screenshots.ts [baseUrl]
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3100";
const out = (name: string) => `docs/screenshots/${name}.png`;

async function main() {
  const browser = await chromium.launch();
  // Reduced motion: final numbers and finished charts, nothing caught mid-animation
  const page = await browser.newPage({ ...devices["Pixel 7"], reducedMotion: "reduce" });

  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill("demo@stocksense.local");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Entry" }).waitFor();

  await page
    .getByLabel("What did you sell or receive?")
    .fill("sold 2 rice, 3 suger, randu coke vittu");
  await page.getByRole("button", { name: "Read entry" }).click();
  await page.getByRole("heading", { name: "Check before saving" }).waitFor();
  await page.screenshot({ path: out("entry-review"), fullPage: true });

  // Pages stream behind a loading skeleton, so wait for the real heading before each shot
  await page.goto(`${base}/alerts`);
  await page.getByRole("heading", { name: /^Alerts/ }).waitFor();
  await page.screenshot({ path: out("alerts") });

  await page.goto(`${base}/insights`);
  await page.locator(".recharts-area").first().waitFor();
  await page.screenshot({ path: out("insights"), fullPage: true });

  await page.goto(`${base}/items`);
  await page.getByRole("heading", { name: "Items" }).waitFor();
  await page.screenshot({ path: out("items") });

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
