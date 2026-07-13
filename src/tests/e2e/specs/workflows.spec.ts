import { test, expect } from '../fixtures/auth-fixture';
import { OnboardingPage } from '../page-objects/OnboardingPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { SettingsPage } from '../page-objects/SettingsPage';
import { StorePage } from '../page-objects/StorePage';
import { ForumPage } from '../page-objects/ForumPage';
import { ZCmsPage } from '../page-objects/ZCmsPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';
import { generateWebhookSignature } from '../utils/webhook-signer';

test.describe('Tier 4: Complex Real-World Application Workflows', () => {
  test('T4-WK-01: Complete Seller Lifecycle', async ({ page }) => {
    test.setTimeout(120000);
    // 1. Google sign-in
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/');
    
    // Enable onboarding gating flag in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test-onboarding-gating', 'true');
      localStorage.removeItem('onboarding-completed');
      document.cookie = 'onboarding-completed=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    });

    await page.locator('#google-login').click();
    await page.locator('#confirm').click();

    // 2. Onboarding Redirect & Completion
    await page.waitForURL(/\/app\/onboarding/);
    const onboardingPage = new OnboardingPage(page);
    await onboardingPage.fillStoreName('Coffee Store');
    await onboardingPage.fillWhatsAppNumber('1234567890');
    await onboardingPage.submitStoreCreation();

    // 3. Dashboard Product Gating
    await page.waitForURL(/\/app\/dashboard/);
    const dashboardPage = new DashboardPage(page);
    
    // Add 3 products to reach 5 max products limit
    await dashboardPage.clickAddProduct();
    await dashboardPage.clickAddProduct();
    await dashboardPage.clickAddProduct();

    // Hitting lock block on the 6th product addition
    await dashboardPage.clickAddProduct();
    await expect(page.locator('#upsell-modal')).toBeVisible();
    await expect(page.locator('#upsell-modal')).toContainText('Limit Reached');
    await page.locator('#upsell-modal button').click(); // close modal
    await expect(page.locator('#upsell-modal')).not.toBeVisible();

    // 4. Navigate Settings & Trigger Upgrade
    const settingsPage = new SettingsPage(page);
    await settingsPage.navigate();
    await settingsPage.verifySettingsLocked('Unlock all settings with your Paid plan');
    await settingsPage.triggerUpsellPopup();
    await settingsPage.completeStep1SatisfactionCheck();
    await settingsPage.completeStep2PricingSelection('15');

    // Verify redirect URL includes Polar checkout link with price
    await page.waitForURL(/polar\.sh\/checkout/);
    expect(page.url()).toContain('price=15');

    // 5. Trigger Webhook fulfillment
    const payload = { event: 'checkout.completed', email: 'seller@example.com' };
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

    // Navigate to local origin first to set localStorage
    await settingsPage.navigate();
    await page.evaluate(() => {
      localStorage.setItem('plan', 'PAID');
    });
    // Reload to apply the local storage update
    await page.reload();

    // 6. Verification: Settings Unlocked & Functional Actions
    await expect(settingsPage.settingsLockMessage).not.toBeVisible();
    
    // Import Products via Shopify
    await settingsPage.switchTab('Shopify');
    await settingsPage.shopifyStoreUrlInput.fill('https://my-shop.myshopify.com');
    
    let alertText = '';
    page.once('dialog', async (dialog) => {
      alertText = dialog.message();
      await dialog.accept();
    });
    await settingsPage.shopifyImportButton.click();
    expect(alertText).toContain('imported successfully');

    // Customize branding settings
    await settingsPage.updateBrandingSettings({
      showBranding: false,
      customWaMessage: 'Sent from My Custom Shop'
    });
  });

  test('T4-WK-02: Complete Mobile Buyer Purchase Journey', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Setup mobile viewport Pixel 5
    await page.setViewportSize({ width: 375, height: 812 });
    await setupMockRoutes(page, 'SELLER', 'FREE');

    // Initialize products in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      const products = [
        { name: 'Coffee Beans', price: 10.99 },
        { name: 'V60 Dripper', price: 25.00 }
      ];
      localStorage.setItem('store-products', JSON.stringify(products));
    });

    // 2. Load Store Page
    const storePage = new StorePage(page);
    await storePage.navigate('coffee-store');

    // 3. Add products to cart
    await storePage.addProduct('Coffee Beans');
    await storePage.addProduct('V60 Dripper');

    // 4. Verify bottom inline cart bar updates
    await storePage.verifyCartBarText('2 items · $35.99');

    // 5. View cart bottom sheet modal
    await storePage.openCartModal();
    await storePage.verifyCartModalItemQuantity('Coffee Beans', '1');
    await storePage.verifyCartModalItemQuantity('V60 Dripper', '1');
    await storePage.verifyCartModalSubtotal('$35.99');

    // 6. Quantity adjustments
    await storePage.adjustCartModalQuantity('Coffee Beans', 'increment');
    await storePage.verifyCartModalItemQuantity('Coffee Beans', '2');
    await storePage.verifyCartModalSubtotal('$46.98');

    // 7. Order submit and check URL redirect parameters
    await storePage.orderWhatsAppButton.dispatchEvent('click');
    const waUrl = await storePage.clickOrderOnWhatsApp();
    expect(waUrl).toContain('wa.me/123456789'); // default mock number
    const decodedMsg = decodeURIComponent(waUrl.split('text=')[1] || '');
    expect(decodedMsg).toContain('2x Coffee Beans');
    expect(decodedMsg).toContain('1x V60 Dripper');
    expect(decodedMsg).toContain('Total: $46.98');
    expect(decodedMsg).toContain('\u{1F6CD}'); // U+1F6CD Shopping Bags emoji without variation selector U+FE0F
  });

  test('T4-WK-03: Admin Moderation and Announcement Cycle', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Admin login & Navigate to Z-CMS
    await setupMockRoutes(page, 'ADMIN', 'PAID');
    const zcmsPage = new ZCmsPage(page);
    await zcmsPage.navigate();

    // 2. Check Z-CMS Dashboard stats/metrics
    await expect(page.locator('[data-testid="total-users"]')).toContainText('26');
    await expect(page.locator('[data-testid="active-stores"]')).toContainText('15');

    // 3. Write MDX Blog post
    await zcmsPage.publishBlogPost(
      'Getting Started with Zippp',
      '# Introduction\nWelcome to your new WhatsApp shop.',
      { draft: false }
    );

    // 4. Publish Dashboard announcement
    await zcmsPage.composeAndPublishAnnouncement(
      'Urgent Maintenance',
      'System will undergo maintenance at 2 AM UTC',
      'BANNER'
    );

    // 5. Search User Manager & send Email mock
    await zcmsPage.sidebarUsers.click();
    await page.waitForURL(/users/);
    await zcmsPage.userSearchInput.fill('seller@example.com');
    await expect(page.locator('[data-testid="users-table"]')).toContainText('seller@example.com');
    
    await page.locator('button:has-text("Email")').click({ force: true });
    await expect(page.locator('#email-modal')).toBeVisible();
    await page.locator('[data-testid="email-body-input"]').fill('Welcome email sent to Mock Seller!');
    
    let alertText = '';
    page.once('dialog', async (dialog) => {
      alertText = dialog.message();
      await dialog.accept();
    });
    await page.locator('#send-email-btn').click();
    expect(alertText).toContain('seller@example.com');
    expect(alertText).toContain('Welcome email');

    // 6. Verify seller dashboard announcement rendering
    await setupMockRoutes(page, 'SELLER', 'FREE');
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
    await expect(dashboardPage.announcementBanner).toBeVisible();
    await expect(dashboardPage.announcementBanner).toContainText('Urgent Maintenance');
  });

  test('T4-WK-04: Community Bulletin Board Feedback Loop', async ({ page }) => {
    test.setTimeout(90000);
    // 1. Setup user session and create forum thread
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'SELLER', email: 'seller@example.com' }));
    });

    const forumPage = new ForumPage(page);
    await forumPage.navigate();
    await forumPage.composeThread('Need Shopify Auto-Sync', 'Auto-sync products please', true);
    await expect(page.locator('text=Need Shopify Auto-Sync')).toBeVisible();

    // 2. Admin logs in, replies, and marks status IN_PROGRESS
    await setupMockRoutes(page, 'ADMIN', 'PAID');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'ADMIN', email: 'admin@example.com' }));
    });

    await forumPage.navigate();
    await forumPage.navigateToThread('Need Shopify Auto-Sync');
    await forumPage.setThreadStatus('IN_PROGRESS');
    await forumPage.submitReply('This feature request is marked in progress.');

    // 3. Seller dashboard shows notification badge
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'SELLER', email: 'seller@example.com' }));
    });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
    
    const notifBadge = page.locator('[data-testid="forum-notifications"]');
    await expect(notifBadge).toBeVisible();

    // 4. Click badge redirects to marked thread comments
    await notifBadge.locator('button').click();
    await page.waitForURL(/community\?thread=thread-/);
    
    // Check that we are viewing thread details and it renders marked comment
    await expect(page.locator('#details-title')).toContainText('Need Shopify Auto-Sync');
    await forumPage.verifyStatusPill('IN_PROGRESS');
    await forumPage.verifyAdminCommentBadgeVisible();
    await expect(page.locator('#replies-list')).toContainText('This feature request is marked in progress.');
  });
});
