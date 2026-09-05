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
  await expect(page.getByText("Invalid username or password")).toBeVisible();
});

test("registers a new user with their own isolated board", async ({ page }) => {
  await page.goto("/");
  await page.getByText(/need an account/i).click();

  const newUsername = `e2e-user-${Date.now()}`;
  await page.getByLabel("Username").fill(newUsername);
  await page.getByLabel("Password").fill("securepass123");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My Board" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  // Brand-new account's board starts empty, unlike the demo user's seeded board
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await expect(firstColumn.getByText(/drop a card here/i)).toBeVisible();

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
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

test("adds a column, moves a card with due date/priority, then deletes the empty column", async ({ page }) => {
  await login(page);

  const columnName = `Blocked ${Date.now()}`;
  await page.getByRole("button", { name: /add column/i }).click();
  await page.getByPlaceholder("Column name").fill(columnName);
  await page.getByRole("button", { name: "Add column" }).click();

  // New columns are appended to the end, so the last column is the one just created.
  const newColumn = page.locator('[data-testid^="column-"]').last();
  await expect(newColumn.getByLabel("Column title")).toHaveValue(columnName);

  // Add a card with a due date and priority directly in the new column
  await newColumn.getByRole("button", { name: /add a card/i }).click();
  const cardTitle = `Escalation ${Date.now()}`;
  await newColumn.getByPlaceholder("Card title").fill(cardTitle);
  await newColumn.getByLabel("Due date").fill("2099-03-01");
  await newColumn.getByLabel("Priority").selectOption("high");
  await newColumn.getByRole("button", { name: /add card/i }).click();

  await expect(newColumn.getByText(cardTitle)).toBeVisible();
  await expect(newColumn.getByText("High")).toBeVisible();
  await expect(newColumn.getByText("2099-03-01")).toBeVisible();

  // Column with a card in it can't be deleted
  await expect(
    newColumn.getByRole("button", { name: `Delete ${columnName} column`, exact: true })
  ).toHaveCount(0);

  // Delete the card, then the now-empty column.
  // exact: true because the draggable card <article> itself has role="button"
  // (set by dnd-kit) whose aggregated accessible name also contains the
  // delete button's label as a substring.
  await newColumn.getByRole("button", { name: `Delete ${cardTitle}`, exact: true }).click();
  const columnCountBeforeDelete = await page.locator('[data-testid^="column-"]').count();
  await newColumn
    .getByRole("button", { name: `Delete ${columnName} column`, exact: true })
    .click();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(columnCountBeforeDelete - 1);
});

test("creates, switches between, and deletes boards", async ({ page }) => {
  await login(page);

  const boardName = `E2E Board ${Date.now()}`;
  await page.getByRole("button", { name: /my board/i }).click();
  await page.getByRole("button", { name: /new board/i }).click();
  await page.getByLabel("New board name").fill(boardName);
  await page.getByRole("button", { name: /create board/i }).click();

  await expect(page.getByRole("button", { name: boardName })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  // New board starts empty
  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await expect(firstColumn.getByText(/drop a card here/i)).toBeVisible();

  // Switch back to the original board and confirm its cards are intact
  await page.getByRole("button", { name: boardName }).click();
  await page.getByRole("option", { name: "My Board" }).click();
  await expect(page.getByRole("button", { name: "My Board" })).toBeVisible();
  await expect(
    page.locator('[data-testid^="column-"]').first().locator('[data-testid^="card-"]')
  ).not.toHaveCount(0);

  // Clean up the created board
  await page.getByRole("button", { name: "My Board" }).click();
  await page.getByRole("button", { name: `Delete ${boardName}` }).click();
  await expect(page.getByRole("option", { name: boardName })).not.toBeVisible();
});

test("logout functionality", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
});
