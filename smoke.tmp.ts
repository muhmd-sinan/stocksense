// Production smoke test, read-only on the demo shop. Temporary file.
import { chromium } from "@playwright/test";
const B = "https://stocksense-zeta-seven.vercel.app";
(async () => {
  const b = await chromium.launch();
  for (const [w, h, scheme] of [[390, 800, "light"], [1440, 900, "dark"], [1280, 800, "light"]] as const) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: w < 768, hasTouch: w < 1024 });
    await ctx.addInitScript({ content: "window.__name = (f) => f;" });
    const p = await ctx.newPage();
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(B + "/login");
    const tagline = await p.getByText("Type what you sold or received").count();
    await p.getByLabel("Email").fill("demo@stocksense.local");
    await p.getByLabel("Password").fill("demo1234");
    await p.getByRole("button", { name: "Sign in" }).click();
    await p.getByRole("tab", { name: "Sold" }).waitFor({ timeout: 60_000 });
    const navs = await p.getByRole("navigation", { name: "Main" }).count();
    const fixedBar = await p.locator("nav[aria-label=Main].fixed").isVisible();
    const side = await p.locator("header nav[aria-label=Main]").isVisible();
    const headings: string[] = [];
    for (const t of ["Items", "Alerts", "Insights", "Categories", "Entry"]) {
      await p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: new RegExp("^" + t) }).click();
      await p.locator("main h1", { hasText: t }).first().waitFor({ timeout: 30_000 });
      headings.push(t);
    }
    await p.getByRole("tab", { name: "Bought" }).click();
    await p.getByRole("tabpanel", { name: "Bought" }).waitFor();
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const font = await p.evaluate(() => document.fonts.check("16px Archivo") || [...document.fonts].some((f) => f.status === "loaded"));
    console.log(`${w}x${h} ${scheme}: tagline=${tagline} navs-in-a11y=${navs} bottomBar=${fixedBar} sidebar=${side} screens=${headings.join(",")} overflowX=${overflow} bg=${bg} font=${font} errors=${errors.length ? errors.join(" | ") : "none"}`);
    await p.waitForLoadState("networkidle");
    await ctx.close();
  }
  await b.close();
})();
