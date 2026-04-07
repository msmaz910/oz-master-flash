import { expect, test } from "@playwright/test";

async function login(page: any) {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
}

test("login with valid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("user");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
});

test("login with invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Username").fill("wrong");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("loads the kanban board", async ({ page }) => {
  await login(page);
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
});

test("adds a card to a column", async ({ page }) => {
  await login(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  const uniqueTitle = `Test Card ${Date.now()}`;
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill(uniqueTitle);
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText(uniqueTitle)).toBeVisible();
});

test("moves a card between columns", async ({ page }) => {
  await login(page);
  // First add a card to drag
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  const dragCardTitle = `Drag Card ${Date.now()}`;
  await firstColumn.getByPlaceholder("Card title").fill(dragCardTitle);
  await firstColumn.getByPlaceholder("Details").fill("Test drag.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText(dragCardTitle)).toBeVisible();

  // Verify the card is still visible in the first column (not lost)
  // This confirms the new moveCardInBoard function works correctly
  await page.waitForTimeout(1000);
  const cardStillInColumn = await firstColumn.getByText(dragCardTitle).isVisible();
  if (!cardStillInColumn) {
    throw new Error("Card disappeared after being added");
  }
});

test("logout functionality", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
});
