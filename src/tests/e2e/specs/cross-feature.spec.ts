import { test, expect } from '../fixtures/auth-fixture';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { SettingsPage } from '../page-objects/SettingsPage';
import { StorePage } from '../page-objects/StorePage';
import { ForumPage } from '../page-objects/ForumPage';
import { ZCmsPage } from '../page-objects/ZCmsPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';
import { generateWebhookSignature } from '../utils/webhook-signer';

test.describe('Tier 3: Pairwise Cross-Feature Integration', () => {
  test('T3-XF-01: Onboarding to Public Store Integration', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    const onboardingPage = new OnboardingPage(page);
    const storePage = new StorePage(page);

    await onboardingPage.navigate();
    await onboardingPage.fillStoreName('Coffee Store');
    await onboardingPage.fillWhatsAppNumber('1234567890');
    await onboardingPage.submitStoreCreation();

    await page.waitForURL(/\/app\/dashboard/);

    await storePage.navigate('coffee-store');
    await storePage.verifyStoreHeader('Coffee Store');
    
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    const waUrl = await storePage.clickOrderOnWhatsApp();
    expect(waUrl).toContain('1234567890');
  });

  test('T3-XF-02: Webhook Upgrade and Live Session Lock Bypass', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    const settingsPage = new SettingsPage(page);

    await settingsPage.navigate();
    await settingsPage.verifySettingsLocked('Unlock all settings with your Paid plan');

    const payload = { event: 'checkout.completed', email: 'seller@example.com' };
    const signature = generateWebhookSignature(payload, 'mock-polar-secret');

    const response = await page.evaluate(async (data) => {
      const res = await fetch('/api/webhooks/polar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-polar-signature': data.signature
        },
        body: JSON.stringify(data.payload)
      });
      return res.status;
    }, { signature, payload });

    expect(response).toBe(200);

    await settingsPage.navigate();
    await expect(settingsPage.settingsLockMessage).not.toBeVisible();
  });

  test('T3-XF-03: Checkout Click Tracking and Dashboard Metrics Sync', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    const storePage = new StorePage(page);
    const dashboardPage = new DashboardPage(page);

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('views-count', '120');
      localStorage.setItem('clicks-count', '45');
    });

    await storePage.navigate('coffee-store');
    
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    await storePage.orderWhatsAppButton.dispatchEvent('click');
    await storePage.clickOrderOnWhatsApp();

    await dashboardPage.navigate();
    await expect(dashboardPage.viewsStat).toContainText('121');
    await expect(dashboardPage.clicksStat).toContainText('46');
  });

  test('T3-XF-04: Z-CMS Announcement Propagation and Dismissal Sync', async ({ page }) => {
    await setupMockRoutes(page, 'ADMIN', 'PAID');
    const zcmsPage = new ZCmsPage(page);
    await zcmsPage.navigate();
    await zcmsPage.composeAndPublishAnnouncement(
      'System Upgrade Schedule',
      'Scheduled maintenance on Sunday',
      'BANNER'
    );

    await setupMockRoutes(page, 'SELLER', 'FREE');
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
    await expect(dashboardPage.announcementBanner).toBeVisible();
    await expect(dashboardPage.announcementBanner).toContainText('System Upgrade Schedule');

    await dashboardPage.dismissAnnouncement();

    await page.reload();
    await expect(dashboardPage.announcementBanner).not.toBeVisible();
  });

  test('T3-XF-05: Forum Activity User Detail Trace', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'SELLER', email: 'seller@example.com' }));
    });
    
    const forumPage = new ForumPage(page);
    await forumPage.navigate();
    await forumPage.composeThread('Shopify sync error', 'My Shopify import fails', true);
    await expect(page.locator('text=Shopify sync error')).toBeVisible();

    await setupMockRoutes(page, 'ADMIN', 'PAID');
    const zcmsPage = new ZCmsPage(page);
    await zcmsPage.navigate();
    await zcmsPage.navigateUsers();
    await zcmsPage.userSearchInput.fill('seller@example.com');
    
    const userRow = page.locator('[data-testid="users-table"] tr').filter({ hasText: 'seller@example.com' });
    await expect(userRow).toBeVisible();
    await expect(userRow.locator('[data-testid="user-activity"]')).toContainText('Shopify sync error');
  });

  test('T3-XF-06: Plan Expiry and Store Product Truncation', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'PAID');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('plan', 'PAID');
      const products = [
        { name: 'Coffee Beans 1', price: 10.0 },
        { name: 'Coffee Beans 2', price: 10.0 },
        { name: 'Coffee Beans 3', price: 10.0 },
        { name: 'Coffee Beans 4', price: 10.0 },
        { name: 'Coffee Beans 5', price: 10.0 },
        { name: 'Coffee Beans 6', price: 10.0 }
      ];
      localStorage.setItem('store-products', JSON.stringify(products));
      localStorage.setItem('branding-hidden', 'true');
    });

    const storePage = new StorePage(page);
    
    await storePage.navigate('coffee-store');
    await expect(storePage.productCards).toHaveCount(6);
    await expect(page.locator('[data-testid="branding-footer"]')).not.toBeVisible();

    const payload = { event: 'subscription.expired', email: 'seller@example.com' };
    const signature = generateWebhookSignature(payload, 'mock-polar-secret');
    await page.evaluate(async (data) => {
      await fetch('/api/webhooks/polar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-polar-signature': data.signature
        },
        body: JSON.stringify(data.payload)
      });
    }, { signature, payload });

    await page.evaluate(() => {
      localStorage.setItem('plan', 'FREE');
    });
    await storePage.navigate('coffee-store');
    await expect(storePage.productCards).toHaveCount(5);
    await expect(page.locator('[data-testid="branding-footer"]')).toBeVisible();
  });

  test('T3-XF-07: Settings Branding Config and WhatsApp Deep Link Layout', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'PAID');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('plan', 'PAID');
    });

    const settingsPage = new SettingsPage(page);
    await settingsPage.navigate();
    await settingsPage.updateBrandingSettings({
      showBranding: false,
      customWaMessage: 'Sent from My Custom Coffee Shop'
    });

    const storePage = new StorePage(page);
    await storePage.navigate('coffee-store');
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    
    const waUrl = await storePage.clickOrderOnWhatsApp();
    expect(waUrl).toContain(encodeURIComponent('Sent from My Custom Coffee Shop'));
  });

  test('T3-XF-08: Admin CMS Page Headline Editor and Theme Switcher', async ({ page }) => {
    await setupMockRoutes(page, null, 'FREE');
    await page.goto('/');
    await page.locator('[data-theme-preset="Sleek Midnight"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sleek-midnight');

    await setupMockRoutes(page, 'ADMIN', 'PAID');
    const zcmsPage = new ZCmsPage(page);
    await zcmsPage.navigate();
    await zcmsPage.triggerLandingPageEditor('hero_headline', 'Headline Changed by Admin');

    await setupMockRoutes(page, null, 'FREE');
    await page.goto('/');
    await expect(page.locator('body > h1')).toContainText('Headline Changed by Admin');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sleek-midnight');
  });
});
