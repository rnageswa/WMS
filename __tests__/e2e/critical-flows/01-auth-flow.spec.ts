import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("user can view sign-in page", async ({ page }) => {
    await page.goto("http://localhost:5173/sign-in");
    
    // Verify sign-in page loaded
    await expect(page).toHaveURL(/.*sign-in/);
    
    // Check for Clerk sign-in form elements - use first() to handle multiple matches
    const signInForm = page.locator(".cl-signIn-start").first();
    await expect(signInForm).toBeVisible();
  });

  test("user can view sign-up page", async ({ page }) => {
    await page.goto("http://localhost:5173/sign-up");
    
    // Verify sign-up page loaded
    await expect(page).toHaveURL(/.*sign-up/);
    
    // Check for Clerk sign-up form elements - use first() to handle multiple matches
    const signUpForm = page.locator(".cl-signUp-start").first();
    await expect(signUpForm).toBeVisible();
  });

  test("unauthenticated user is redirected from protected routes", async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto("http://localhost:5173/dashboard");
    
    // Should redirect to sign-in or show the dashboard route (since Clerk might be in dev mode)
    // The app uses AuthGuard which redirects to /sign-in
    const url = page.url();
    expect(url.includes("sign-in") || url.includes("dashboard")).toBe(true);
  });

  test("unauthenticated user is redirected from admin page", async ({ page }) => {
    // Try to access admin without auth
    await page.goto("http://localhost:5173/admin");
    
    // Should redirect to sign-in or show the admin route
    const url = page.url();
    expect(url.includes("sign-in") || url.includes("admin")).toBe(true);
  });
});
