import { expect, test } from "@playwright/test";

// The core loop: sign in → sell on the Sold tab → buy on the Bought tab → stock follows.
test("sold and bought tabs update stock", async ({ page }) => {
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

  // Sold: product + quantity, stock preview, then save
  await page.goto("/");
  const sold = page.getByRole("tabpanel", { name: "Sold" });
  await sold.getByLabel("Product").selectOption({ label: "Sugar 1kg (10 pack)" });
  await sold.getByLabel("Quantity").fill("3");
  await expect(sold.getByText("Stock 10 → 7 pack")).toBeVisible();
  await sold.getByRole("button", { name: "Save sale" }).click();
  await expect(sold.getByRole("status")).toContainText(
    "Sold 3 pack Sugar 1kg for ₹138.00. 7 left.",
  );

  // Bought: a known name restocks it, a new name creates an item
  await page.getByRole("tab", { name: "Bought" }).click();
  const bought = page.getByRole("tabpanel", { name: "Bought" });
  const lines = bought.getByRole("list", { name: "Bought lines" }).getByRole("listitem");
  // Typing part of a name suggests the item; picking it fills name, category and price
  await lines.nth(0).getByLabel("Name").fill("sug");
  await lines.nth(0).getByRole("option", { name: /^Sugar 1kg/ }).click();
  await expect(lines.nth(0).getByLabel("Name")).toHaveValue("Sugar 1kg");
  await expect(lines.nth(0).getByRole("listbox")).toBeHidden();
  await expect(lines.nth(0).getByLabel("Price (₹)")).toHaveValue("46");
  await lines.nth(0).getByLabel("Quantity").fill("5");
  await expect(lines.nth(0).getByText("Stock 7 → 12 pack")).toBeVisible();

  await bought.getByRole("button", { name: "Add row" }).click();
  await lines.nth(1).getByLabel("Name").fill("Maggi 70g");
  await lines.nth(1).getByLabel("Category").selectOption({ index: 1 });
  await lines.nth(1).getByLabel("Price (₹)").fill("14");
  await lines.nth(1).getByLabel("Quantity").fill("20");
  await expect(lines.nth(1).getByText("New item")).toBeVisible();
  await bought.getByRole("button", { name: "Save 2 purchases" }).click();

  const saved = bought.getByRole("status");
  await expect(saved).toContainText("Bought 5 pack Sugar 1kg. Now 12.");
  await expect(saved).toContainText("Added Maggi 70g: 20 pcs at ₹14.00 each.");

  // Dates are stored automatically and shown on the Recent list
  const recent = page.getByRole("region", { name: "Recent" });
  await expect(recent).toContainText("Maggi 70g");
  await expect(recent).toContainText("Today,");

  // And the items list agrees. Tapped from the nav (not page.goto), so in a production build
  // this reads the prefetched page: saving must have refreshed it.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Items" }).click();
  await expect(page.getByRole("link", { name: /Sugar 1kg/ })).toContainText("12 pack");
  await expect(page.getByRole("link", { name: /Maggi 70g/ })).toContainText("20 pcs");
});
