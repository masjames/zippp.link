import { test, expect } from '../fixtures/auth-fixture';
import { LandingPage } from '../page-objects/LandingPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 1: Landing Page', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    // Set up mock routing to serve interactive HTML
    await setupMockRoutes(page);
    landingPage = new LandingPage(page);
    await landingPage.navigate();
  });

  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Hero title is visible and contains correct text', async () => {
    await landingPage.verifyHeroTitle();
  });

  test('Tier 1 Case 2: Clicking Continue with Google initiates Google OAuth login flow', async ({ page }) => {
    // Intercept navigation or watch for redirect
    const navigationPromise = page.waitForURL(/\/api\/auth\/signin\/google/).catch(() => {});
    await landingPage.triggerGoogleSignIn();
    await navigationPromise;
    
    // We expect it to redirect to NextAuth sign-in page or Google OAuth URL
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/google|signin|auth/);
  });

  test('Tier 1 Case 3: Create store CTA redirects to login or signup gateway', async ({ page }) => {
    await landingPage.createStoreButton.click();
    await page.waitForURL(/\/\?error=unauthorized/);
    expect(page.url()).toContain('error=unauthorized');
  });

  test('Tier 1 Case 4: Adding a product to demo cart updates cart bar visibility and text', async () => {
    await landingPage.addDemoProduct('Coffee Beans');
    await landingPage.verifyDemoCartBarText('1 item');
  });

  test('Tier 1 Case 5: Demo quantity adjustment controls increment and decrement values', async () => {
    await landingPage.addDemoProduct('Coffee Beans');
    await landingPage.verifyDemoCartBarText('1 item');
    
    await landingPage.adjustDemoQuantity('Coffee Beans', 'increment');
    await landingPage.verifyDemoCartBarText('2 items');
    
    await landingPage.adjustDemoQuantity('Coffee Beans', 'decrement');
    await landingPage.verifyDemoCartBarText('1 item');
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, Performance & Security Boundaries
  // =========================================================================

  test('Tier 2 Case 6: Decrementing demo quantity to 0 removes product and hides/resets cart bar', async () => {
    await landingPage.addDemoProduct('Coffee Beans');
    await landingPage.verifyDemoCartBarText('1 item');
    
    await landingPage.adjustDemoQuantity('Coffee Beans', 'decrement');
    // If the quantity drops to 0, the cart bar should hide or report empty
    await expect(landingPage.demoCartBar).not.toBeVisible();
  });

  test('Tier 2 Case 7: Selecting theme presets updates theme state and persists after reloading the page', async ({ page }) => {
    // Select Warm Earth theme
    await landingPage.selectThemePreset('Warm Earth/Cream');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm-earth');
    
    // Reload page
    await page.reload();
    // Theme preset should persist
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm-earth');
  });

  test('Tier 2 Case 8: Unauthenticated access to dashboard and admin portal is blocked and redirected', async ({ page }) => {
    // Attempt to access seller dashboard without a session
    await page.goto('/app/dashboard');
    await page.waitForURL(/\/\?error=unauthorized/);
    expect(page.url()).toContain('error=unauthorized');

    // Attempt to access Z-CMS admin area
    await page.goto('/z-cms');
    await page.waitForURL(/\/\?error=unauthorized/);
    expect(page.url()).toContain('error=unauthorized');
  });

  test('Tier 2 Case 9: Scripting/XSS query parameters are sanitized and do not crash or execute', async ({ page }) => {
    // Visit page with XSS payloads
    const xssPayload = '<script>window.xssFailed=true;</script>';
    await page.goto(`/?ref=${encodeURIComponent(xssPayload)}`);
    
    // Check if script executed (should be false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isXssExecuted = await page.evaluate(() => (window as any).xssFailed === true);
    expect(isXssExecuted).not.toBe(true);
    
    // Page is stable and hero title renders
    await landingPage.verifyHeroTitle();
  });

  test('Tier 2 Case 10: Rapid switching of theme presets behaves stably and applies the last selected option', async ({ page }) => {
    await landingPage.selectThemePreset('Warm Earth/Cream');
    await landingPage.selectThemePreset('Sleek Midnight');
    await landingPage.selectThemePreset('Minimalist Slate');
    await landingPage.selectThemePreset('Sleek Midnight');
    
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sleek-midnight');
  });
});
