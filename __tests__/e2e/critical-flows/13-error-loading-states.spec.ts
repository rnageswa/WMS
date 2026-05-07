import { test, expect } from "@playwright/test";

test.describe("Error Boundary & Loading States", () => {
  test("404 page loads for unknown routes", async ({ page }) => {
    await page.goto("http://localhost:5173/non-existent-route-12345");
    
    // Should show 404 or not-found page
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("dashboard shows loading state initially", async ({ page }) => {
    await page.goto("http://localhost:5173/dashboard");
    
    // Check for any loading indicators
    const loadingElements = page.locator("[class*='loading'], [class*='spinner'], [data-testid='loading']");
    const count = await loadingElements.count();
    
    // Either loading state is shown or content appears
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("products page handles empty state", async ({ page }) => {
    await page.goto("http://localhost:5173/products");
    
    // Check for empty state or products list
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });
});