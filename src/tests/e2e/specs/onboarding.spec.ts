import { test, expect } from '../fixtures/auth-fixture';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 5: Onboarding', () => {
  let onboardingPage: OnboardingPage;

  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    onboardingPage = new OnboardingPage(page);
  });

  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Uncompleted onboarding redirects dashboard access to onboarding', async ({ page }) => {
    // Enable the test-onboarding-gating flag in localStorage to check the redirect gating
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test-onboarding-gating', 'true');
      localStorage.removeItem('onboarding-completed');
      document.cookie = 'onboarding-completed=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });

    await page.goto('/app/dashboard');
    // Verify redirection to onboarding page
    await page.waitForURL(/\/app\/onboarding/);
    expect(page.url()).toContain('/app/onboarding');
  });

  test('Tier 1 Case 2: Store name input live autofills the slug preview', async () => {
    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Super Coffee Store');
    await onboardingPage.verifySlugPreview('super-coffee-store');
  });

  test('Tier 1 Case 3: WhatsApp country code selection is configurable', async ({ page }) => {
    await onboardingPage.navigate();
    await onboardingPage.selectCountryCode('+1');
    const selectedCode = await page.locator('[data-testid="country-code-select"]').inputValue();
    expect(selectedCode).toBe('+1');
  });

  test('Tier 1 Case 4: Completing onboarding setup redirects to the dashboard page', async ({ page }) => {
    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Awesome Store');
    await onboardingPage.fillWhatsAppNumber('81234567890');
    await onboardingPage.submitStoreCreation();

    await page.waitForURL(/\/app\/dashboard/);
    expect(page.url()).toContain('/app/dashboard');
  });

  test('Tier 1 Case 5: Onboarding skip gating prevents direct navigation to dashboard', async ({ page }) => {
    // Access settings page or dashboard without completed onboarding, expect redirect
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test-onboarding-gating', 'true');
      localStorage.removeItem('onboarding-completed');
      document.cookie = 'onboarding-completed=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });

    await page.goto('/app/dashboard');
    await page.waitForURL(/\/app\/onboarding/);
    expect(page.url()).toContain('/app/onboarding');
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, Input Validation & Security Boundaries
  // =========================================================================

  test('Tier 2 Case 6: Slug collisions are resolved by appending numeric suffix', async () => {
    await onboardingPage.navigate();
    // 'taken-slug' is mocked to collision-resolve to 'taken-slug-2'
    await onboardingPage.fillStoreName('taken slug');
    await onboardingPage.verifySlugPreview('taken-slug-2');
  });

  test('Tier 2 Case 7: Non-numeric WhatsApp number triggers UI validation error', async ({ page }) => {
    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Valid Store Name');
    await onboardingPage.fillWhatsAppNumber('abc12345'); // invalid contains characters
    await onboardingPage.submitStoreCreation();

    // Verify validation message is visible
    const errorLoc = page.locator('#wa-error');
    await expect(errorLoc).toBeVisible();
    await expect(errorLoc).toContainText('Invalid WhatsApp number');
  });

  test('Tier 2 Case 8: Onboarding submit double-click prevention disables button', async ({ page }) => {
    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Unique Store Name');
    await onboardingPage.fillWhatsAppNumber('628123456789');

    // Prevent navigation to check disabled status before page unloads
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).preventNavigation = true;
    });

    // Click submit, should disable immediately in JS logic
    await page.locator('#submit-btn').click();
    const isBtnDisabled = await page.locator('#submit-btn').isDisabled();
    expect(isBtnDisabled).toBe(true);
  });

  test('Tier 2 Case 9: Navigation trap alerts user of unsaved onboarding changes', async ({ page }) => {
    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Dirty Store Name'); // Make form dirty
    
    let beforeUnloadTriggered = false;
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'beforeunload') {
        beforeUnloadTriggered = true;
      }
      await dialog.accept();
    });

    // Attempt reload to trigger navigation trap
    await page.reload();
    expect(beforeUnloadTriggered).toBe(true);
  });

  test('Tier 2 Case 10: Non-standard characters in store name are stripped from slug preview', async () => {
    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Coffee @ & Cream Shop!');
    // Special characters '@', '&', '!' are stripped, extra spaces normalized
    await onboardingPage.verifySlugPreview('coffee-cream-shop');
  });
});
