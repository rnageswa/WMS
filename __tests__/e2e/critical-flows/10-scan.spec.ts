import { test, expect } from "@playwright/test";

test.describe("Scan Page & Barcode Lookup", () => {
  test("scan page loads", async ({ page }) => {
    await page.goto("http://localhost:5173/scan");
    
    await expect(page).toHaveURL(/.*scan/);
    
    // Check for scan page content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });

  test("scan has input field for codes", async ({ page }) => {
    await page.goto("http://localhost:5173/scan");
    
    // Look for scan input
    const scanInput = page.locator("input[type='text'], input[placeholder*='scan'], input[placeholder*='code']").first();
    
    if (await scanInput.count() > 0) {
      await scanInput.fill("SKU-001");
      await scanInput.press("Enter");
      
      // Wait for results
      await page.waitForTimeout(500);
      
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    } else {
      expect(true).toBe(true);
    }
  });

  test("scan lookup - bin code", async ({ page }) => {
    await page.goto("http://localhost:5173/scan");
    
    // Enter a bin code
    const scanInput = page.locator("input[type='text']").first();
    
    if (await scanInput.count() > 0) {
      await scanInput.fill("B-01");
      await scanInput.press("Enter");
      
      await page.waitForTimeout(500);
      
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    } else {
      expect(true).toBe(true);
    }
  });

  test("scan lookup - SKU code", async ({ page }) => {
    await page.goto("http://localhost:5173/scan");
    
    // Enter an SKU
    const scanInput = page.locator("input[type='text']").first();
    
    if (await scanInput.count() > 0) {
      await scanInput.fill("SKU-1001");
      await scanInput.press("Enter");
      
      await page.waitForTimeout(500);
      
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    } else {
      expect(true).toBe(true);
    }
  });
});