// Temporary: LinkedIn post screenshots from the live demo shop, light theme. Read-only, nothing is saved.
// npx tsx scripts/linkedin-shots.ts [baseUrl]
import { chromium, devices, type Browser, type Page } from "@playwright/test";

const base = process.argv[2] ?? "https://stocksense-zeta-seven.vercel.app";
const out = (name: string) => `linkedin/${name}.png`;
const settle = (page: Page) => page.waitForTimeout(800);

async function login(page: Page) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill("demo@stocksense.local");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Entry" }).waitFor({ timeout: 30000 });
}

async function waitCharts(page: Page) {
  await page.locator(".recharts-area").first().waitFor();
  await page.locator(".recharts-bar-rectangle").first().waitFor();
  await settle(page);
}

// Clip to the analytics grid (charts, top 5, running low), skipping the Today card
async function analyticsClip(page: Page) {
  const boxes = await Promise.all(
    ["time", "cat", "top", "low"].map((id) =>
      page.locator(`section[aria-labelledby="${id}-heading"]`).boundingBox(),
    ),
  );
  const b = boxes.filter((x) => x != null);
  const pad = 32;
  const x = Math.min(...b.map((r) => r.x)) - pad;
  const today = await page.locator('section[aria-labelledby="today-heading"]').boundingBox();
  const y = Math.max(Math.min(...b.map((r) => r.y)) - pad, today ? today.y + today.height + 4 : 0);
  const right = Math.max(...b.map((r) => r.x + r.width)) + pad;
  const bottom = Math.max(...b.map((r) => r.y + r.height)) + pad;
  return { x, y, width: right - x, height: bottom - y };
}

const desktop = (browser: Browser) =>
  browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });

const phone = (browser: Browser, height = 915) =>
  browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: 412, height },
    colorScheme: "light",
    reducedMotion: "reduce",
  });

async function main() {
  const browser = await chromium.launch();

  // Desktop
  {
    const ctx = await desktop(browser);
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${base}/insights?range=30`);
    await waitCharts(page);
    await page.screenshot({ path: out("01-insights-dashboard"), clip: await analyticsClip(page), fullPage: true });

    await page.goto(`${base}/alerts`);
    await page.getByRole("heading", { name: /^Alerts/ }).waitFor();
    await settle(page);
    await page.screenshot({ path: out("02-forecast-alerts") });

    // Filtered view: last 7 days, one category
    await page.goto(`${base}/insights?range=30`);
    await waitCharts(page);
    await page.getByLabel("Period", { exact: true }).selectOption({ label: "Last 7 days" });
    await page.getByLabel("Category", { exact: true }).selectOption({ label: "Beverages" });
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByText("Showing Beverages only.").waitFor();
    await waitCharts(page);
    await page.screenshot({ path: out("03-insights-filtered") });

    await page.goto(`${base}/items`);
    await page.getByRole("heading", { name: "Items" }).waitFor();
    await settle(page);
    await page.screenshot({ path: out("05-items") });
    await ctx.close();
  }

  // Desktop sign-in signboard (signed out)
  {
    const ctx = await desktop(browser);
    const page = await ctx.newPage();
    await page.goto(`${base}/login`);
    await page.getByRole("button", { name: "Sign in" }).waitFor();
    await settle(page);
    await page.screenshot({ path: out("10-login") });
    await ctx.close();
  }

  // Phone: Sold tab with live stock previews, never saved (taller screen so Save fits)
  {
    const ctx = await phone(browser, 1050);
    const page = await ctx.newPage();
    await login(page);
    const sold = page.getByRole("tabpanel", { name: "Sold" });
    const lines = sold.getByRole("listitem");
    await lines.nth(0).getByLabel("Product").selectOption({ index: 1 });
    await lines.nth(0).getByLabel("Quantity").fill("2");
    await sold.getByRole("button", { name: "Add row" }).click();
    await lines.nth(1).getByLabel("Category").selectOption({ index: 2 });
    await lines.nth(1).getByLabel("Product").selectOption({ index: 1 });
    await lines.nth(1).getByLabel("Quantity").fill("3");
    await lines.nth(1).getByLabel("Quantity").blur();
    await sold.getByText(/^Stock/).nth(1).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);
    await page.screenshot({ path: out("04-entry-sold-phone") });
    await ctx.close();
  }

  // Phone: dashboard charts, alerts
  {
    const ctx = await phone(browser);
    const page = await ctx.newPage();
    await login(page);

    await page.goto(`${base}/insights?range=30`);
    await waitCharts(page);
    await page.locator("#time-heading").evaluate((el) => {
      el.scrollIntoView({ block: "start" });
      window.scrollBy(0, -20);
    });
    await settle(page);
    await page.screenshot({ path: out("06-insights-phone") });

    await page.locator("#top-heading").evaluate((el) => {
      el.scrollIntoView({ block: "start" });
      window.scrollBy(0, -20);
    });
    await settle(page);
    await page.screenshot({ path: out("07-top-items-phone") });

    await page.goto(`${base}/alerts`);
    await page.getByRole("heading", { name: /^Alerts/ }).waitFor();
    await settle(page);
    await page.screenshot({ path: out("08-alerts-phone") });
    await ctx.close();
  }

  // Phone sign-in (signed out)
  {
    const ctx = await phone(browser);
    const page = await ctx.newPage();
    await page.goto(`${base}/login`);
    await page.getByRole("button", { name: "Sign in" }).waitFor();
    await settle(page);
    await page.screenshot({ path: out("09-login-phone") });
    await ctx.close();
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
