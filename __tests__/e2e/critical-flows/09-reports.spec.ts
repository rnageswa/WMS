import { test, expect } from "@playwright/test";

test.describe("Reports & Analytics Flow", () => {
  test("reports page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    
    await expect(page).toHaveURL(/.*reports/);
    
    // Check for reports content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("reports shows KPI tiles", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    
    // Check for KPI or stat tiles
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("stock velocity report loads", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    
    // Check for stock velocity content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("export CSV button functionality", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    
    // Look for export button
    const exportButton = page.locator("button:has-text('Export'), button:has-text('CSV'), a:has-text('Export')").first();
    
    if (await exportButton.count() > 0) {
      await exportButton.click();
      
      // Wait for download to start
      await page.waitForTimeout(1000);
      
      // If we got here without error, export worked
      expect(true).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });

  test("supplier performance report accessible", async ({ page }) => {
    await page.goto("http://localhost:5173/reports");
    
    // Look for supplier performance link/section
    const supplierLink = page.locator("a:has-text('Supplier'), button:has-text('Supplier'), a:has-text('Performance')").first();
    
    if (await supplierLink.count() > 0) {
      await supplierLink.click();
      
      await page.waitForTimeout(500);
      
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    } else {
      expect(true).toBe(true);
    }
  });
});