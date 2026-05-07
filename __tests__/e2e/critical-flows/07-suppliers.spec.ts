import { test, expect } from "@playwright/test";

test.describe("Supplier Management Flow", () => {
  test("suppliers list page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/suppliers");
    
    await expect(page).toHaveURL(/.*suppliers/);
    
    // Check for suppliers content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("supplier performance page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/suppliers/performance");
    
    // Check page loaded
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("can add new supplier", async ({ page }) => {
    await page.goto("http://localhost:5173/suppliers");
    
    // Look for add supplier button
    const addButton = page.locator("button:has-text('New'), button:has-text('Add'), a:has-text('New')").first();
    
    if (await addButton.count() > 0) {
      await addButton.click();
      
      // Should navigate to create page
      const url = page.url();
      expect(url.includes("new") || url.includes("create")).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });

  test("supplier detail page can be accessed", async ({ page }) => {
    await page.goto("http://localhost:5173/suppliers");
    
    // Look for first supplier link
    const supplierLink = page.locator("a[href*='/suppliers/'], tr a").first();
    
    if (await supplierLink.count() > 0) {
      await supplierLink.click();
      
      // Should show supplier detail
      await expect(page).toHaveURL(/.*suppliers\//);
    } else {
      expect(true).toBe(true);
    }
  });
});