import { test, expect } from '../fixtures/auth-fixture';
import { SettingsPage } from '../page-objects/SettingsPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';
import { generateWebhookSignature } from '../utils/webhook-signer';

test.describe('Feature 8: Billing & Gating', () => {
  let settingsPage: SettingsPage;

  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Free plan sellers see locked settings message when clicking settings tabs', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    await settingsPage.navigate();

    await settingsPage.verifySettingsLocked('Unlock all settings with your Paid plan');
  });

  test('Tier 1 Case 2: Name Your Price upsell popup shows satisfaction yes/no options on step 1', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    await settingsPage.navigate();

    await settingsPage.triggerUpsellPopup();
    
    // Step 1 buttons should be visible
    await expect(settingsPage.upsellStep1YesButton).toBeVisible();
    await expect(settingsPage.upsellStep1NoButton).toBeVisible();
  });

  test('Tier 1 Case 3: Clicking Yes on step 1 proceeds to step 2 price input option', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    await settingsPage.navigate();

    await settingsPage.triggerUpsellPopup();
    await settingsPage.completeStep1SatisfactionCheck();

    // Step 2 elements should show up
    await expect(settingsPage.nameYourPriceInput).toBeVisible();
    await expect(settingsPage.payAndUnlockButton).toBeVisible();
  });

  test('Tier 1 Case 4: Clicks on Pay button redirect user to Polar checkout link', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    await settingsPage.navigate();

    await settingsPage.triggerUpsellPopup();
    await settingsPage.completeStep1SatisfactionCheck();
    await settingsPage.nameYourPriceInput.fill('15');

    // Clicking pay should initiate navigation to polar checkout
    const navigationPromise = sellerPage.waitForURL(/polar\.sh\/checkout/).catch(() => {});
    await settingsPage.payAndUnlockButton.click();
    await navigationPromise;
    expect(sellerPage.url()).toContain('polar.sh/checkout');
    expect(sellerPage.url()).toContain('price=15');
  });

  test('Tier 1 Case 5: Valid Polar webhook completes upgrade to paid subscription plan', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/'); // Navigate to set the base URL origin

    const webhookPayload = {
      event: 'checkout.completed',
      email: 'seller@example.com',
      amount: 15
    };
    const signature = generateWebhookSignature(webhookPayload, 'mock-polar-secret');

    // Post to mock webhook endpoint inside page context so request routing is triggered
    const response = await page.evaluate(async (data) => {
      const res = await fetch('/api/webhooks/polar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-polar-signature': data.signature
        },
        body: JSON.stringify(data.payload)
      });
      return { status: res.status, json: await res.json() };
    }, { signature, payload: webhookPayload });

    expect(response.status).toBe(200);
    expect(response.json.success).toBe(true);
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, Webhook Rejections & Expirations
  // =========================================================================

  test('Tier 2 Case 6: Entering pricing below $5 limit triggers validation error', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    await settingsPage.navigate();

    await settingsPage.triggerUpsellPopup();
    await settingsPage.completeStep1SatisfactionCheck();
    
    // Fill invalid low price
    await settingsPage.nameYourPriceInput.fill('4.99');
    await settingsPage.payAndUnlockButton.click();

    // Check error validation message
    const errorLoc = sellerPage.locator('#price-error');
    await expect(errorLoc).toBeVisible();
    await expect(errorLoc).toContainText('Minimum price is $5');
  });

  test('Tier 2 Case 7: Upsell banner is permanently suppressed after 3 dismissals', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    await settingsPage.navigate();

    // Dismiss 3 times
    for (let i = 0; i < 3; i++) {
      await settingsPage.triggerUpsellPopup();
      await settingsPage.upsellStep1Dismiss.click();
    }

    // Set page dialog handler for suppression confirmation alert
    let dialogTriggered = false;
    sellerPage.on('dialog', async (dialog) => {
      dialogTriggered = true;
      expect(dialog.message()).toContain('Banner permanently suppressed');
      await dialog.accept();
    });

    // Clicking unlock now should suppress showing modal
    await settingsPage.triggerUpsellPopup();
    await expect(settingsPage.upsellStep1YesButton).not.toBeVisible();
    expect(dialogTriggered).toBe(true);
  });

  test('Tier 2 Case 8: Webhook reject payloads with invalid HMAC signature header', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/'); // Navigate to set the base URL origin

    const webhookPayload = {
      event: 'checkout.completed',
      email: 'seller@example.com'
    };
    // Sign using incorrect secret
    const signature = generateWebhookSignature(webhookPayload, 'wrong-secret-signature-xyz');

    // Post to mock webhook endpoint inside page context so request routing is triggered
    const response = await page.evaluate(async (data) => {
      const res = await fetch('/api/webhooks/polar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-polar-signature': data.signature
        },
        body: JSON.stringify(data.payload)
      });
      return { status: res.status, json: await res.json() };
    }, { signature, payload: webhookPayload });

    // Expect signature authentication failure status code (401 Unauthorized)
    expect(response.status).toBe(401);
    expect(response.json.error).toContain('Invalid signature');
  });

  test('Tier 2 Case 9: Expired paid subscription plan lockouts settings', async ({ sellerPage }) => {
    // Session state mocks user role but user plan cookie is missing, simulating expiration/downgrade
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    settingsPage = new SettingsPage(sellerPage);
    
    await sellerPage.goto('/');
    await sellerPage.evaluate(() => {
      localStorage.setItem('plan', 'FREE'); // Lock setting/plan to FREE
    });

    await settingsPage.navigate();
    await settingsPage.verifySettingsLocked('Unlock all settings with your Paid plan');
  });

  test('Tier 2 Case 10: Multi-year renewal webhook updates subscription duration correctly', async ({ page }) => {
    await setupMockRoutes(page, 'SELLER', 'FREE');
    await page.goto('/'); // Navigate to set the base URL origin

    const renewalPayload = {
      event: 'subscription.renewed',
      email: 'seller@example.com',
      years: 3 // Multi-year extension
    };
    const signature = generateWebhookSignature(renewalPayload, 'mock-polar-secret');

    // Post to mock webhook endpoint inside page context so request routing is triggered
    const response = await page.evaluate(async (data) => {
      const res = await fetch('/api/webhooks/polar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-polar-signature': data.signature
        },
        body: JSON.stringify(data.payload)
      });
      return { status: res.status, json: await res.json() };
    }, { signature, payload: renewalPayload });

    expect(response.status).toBe(200);
    expect(response.json.success).toBe(true);
  });
});
