import { expect, test } from "@playwright/test";

// The core loop: sign in → type a sale → confirm → stock goes down.
test("typed sale updates stock after confirmation", async ({ page }) => {
  const email = `e2e-${Date.now()}@stocksense.test`;
  const password = "e2e-pass-1234";

  // Fresh shop, so the test owns all its data
  await page.goto("/signup");
  await page.getByLabel("Shop name").fill("E2E Stores");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Create shop" }).click();
  await expect(page.getByRole("heading", { name: "Entry" })).toBeVisible();

  // Sign out and back in, so login is covered too
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Entry" })).toBeVisible();

  // An item with 10 in stock
  await page.goto("/items/new");
  await page.getByLabel("Name").fill("Sugar 1kg");
  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByLabel(/^Unit/).fill("pack");
  await page.getByLabel("Price (₹)").fill("46");
  await page.getByLabel("Stock", { exact: true }).fill("10");
  await page.getByLabel("Alert when stock is at or below").fill("2");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page).toHaveURL(/\/items$/);

  // Type a sale; nothing is saved until Confirm
  await page.goto("/");
  await page.getByLabel("What did you sell or receive?").fill("sold 3 sugar");
  await page.getByRole("button", { name: "Read entry" }).click();
  await expect(page.getByRole("heading", { name: "Check before saving" })).toBeVisible();
  await expect(page.getByText("Stock 10 → 7")).toBeVisible();
  await page.getByRole("button", { name: "Confirm 1 line" }).click();

  const saved = page.getByRole("status").filter({ hasText: "Saved" });
  await expect(saved).toContainText("Sold 3 pack Sugar 1kg. 7 left.");

  // And the items list agrees
  await page.goto("/items");
  await expect(page.getByRole("link", { name: /Sugar 1kg/ })).toContainText("7 pack");
});
