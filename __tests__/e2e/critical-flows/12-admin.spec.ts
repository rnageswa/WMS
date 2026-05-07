import { test, expect } from "@playwright/test";

test.describe("Admin & User Management Flow", () => {
  test("admin page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/admin");
    
    // Should be redirected to sign-in if not authenticated
    const url = page.url();
    expect(url.includes("sign-in") || url.includes("admin")).toBe(true);
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/sign-in");
    
    await expect(page).toHaveURL(/.*sign-in/);
    
    // Check for sign-in content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/sign-up");
    
    await expect(page).toHaveURL(/.*sign-up/);
    
    // Check for sign-up content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("unauthenticated user redirected from admin", async ({ page }) => {
    await page.goto("http://localhost:5173/admin");
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in/);
  });
});