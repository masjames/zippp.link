import { Page, Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly shopifyTab: Locator;
  readonly sheetsTab: Locator;
  readonly brandingTab: Locator;
  
  // Settings lock elements
  readonly settingsLockMessage: Locator;
  readonly settingsUnlockButton: Locator;

  // Shopify elements
  readonly shopifyStoreUrlInput: Locator;
  readonly shopifyImportButton: Locator;

  // Sheets elements
  readonly sheetsWebhookUrlInput: Locator;
  readonly sheetsSpreadsheetUrlInput: Locator;
  readonly sheetsSaveButton: Locator;

  // Branding elements
  readonly brandingToggleHidden: Locator;
  readonly brandingToggleVisible: Locator;
  readonly customWaMessageInput: Locator;
  readonly brandingSaveButton: Locator;

  // Upsell elements (Step 1)
  readonly upsellStep1YesButton: Locator;
  readonly upsellStep1NoButton: Locator;
  readonly upsellStep1Dismiss: Locator;

  // Upsell elements (Step 2)
  readonly nameYourPriceInput: Locator;
  readonly payAndUnlockButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Tab selectors
    this.shopifyTab = page.locator('[data-testid="tab-shopify"], button:has-text("Shopify")');
    this.sheetsTab = page.locator('[data-testid="tab-sheets"], button:has-text("Sheets")');
    this.brandingTab = page.locator('[data-testid="tab-branding"], button:has-text("Branding")');

    // Locked view
    this.settingsLockMessage = page.locator('[data-testid="settings-lock-message"], .settings-lock-message');
    this.settingsUnlockButton = page.getByRole('button', { name: /Name Your Price & Unlock/i })
      .or(page.getByRole('button', { name: /Unlock/i }));

    // Shopify Import Tab fields
    this.shopifyStoreUrlInput = page.locator('input[name="shopifyStoreUrl"], [data-testid="shopify-url-input"]');
    this.shopifyImportButton = page.getByRole('button', { name: /Import products/i });

    // Google Sheets Sync Tab fields
    this.sheetsWebhookUrlInput = page.locator('input[name="sheetsWebhookUrl"], [data-testid="sheets-webhook-input"]');
    this.sheetsSpreadsheetUrlInput = page.locator('input[name="sheetsSpreadsheetUrl"], [data-testid="sheets-url-input"]');
    this.sheetsSaveButton = page.getByRole('button', { name: /Save & test connection/i });

    // Branding Tab fields
    this.brandingToggleHidden = page.locator('[data-testid="branding-toggle-hidden"], button:has-text("Hidden")');
    this.brandingToggleVisible = page.locator('[data-testid="branding-toggle-visible"], button:has-text("Visible")');
    this.customWaMessageInput = page.locator('textarea[name="customWaMessage"], [data-testid="custom-wa-message-input"]');
    this.brandingSaveButton = page.getByRole('button', { name: /Save/i }).filter({ hasText: /Save/i });

    // Upsell Step 1 elements
    this.upsellStep1YesButton = page.getByRole('button', { name: /Yes, love it/i });
    this.upsellStep1NoButton = page.getByRole('button', { name: /Not yet/i });
    this.upsellStep1Dismiss = page.getByRole('button', { name: /Dismiss/i }).or(page.locator('text=/✕ Dismiss/i'));

    // Upsell Step 2 elements
    this.nameYourPriceInput = page.locator('input[name="price"], [data-testid="upsell-price-input"]');
    this.payAndUnlockButton = page.getByRole('button', { name: /Pay & Unlock All/i });
  }

  /**
   * Navigates to the Settings page.
   */
  async navigate() {
    await this.page.goto('/app/settings');
  }

  /**
   * Switches between tabs (Shopify, Sheets, Branding).
   */
  async switchTab(tab: 'Shopify' | 'Sheets' | 'Branding') {
    if (tab === 'Shopify') {
      await this.shopifyTab.click();
    } else if (tab === 'Sheets') {
      await this.sheetsTab.click();
    } else if (tab === 'Branding') {
      await this.brandingTab.click();
    }
  }

  /**
   * Verifies the settings lock message is visible (for free tier).
   */
  async verifySettingsLocked(expectedMessage: string = 'Unlock all settings with your Paid plan') {
    await expect(this.settingsLockMessage).toBeVisible();
    await expect(this.settingsLockMessage).toContainText(expectedMessage);
  }

  /**
   * Triggers the Name Your Price upsell popup from the locked settings view.
   */
  async triggerUpsellPopup() {
    await this.settingsUnlockButton.click();
  }

  /**
   * Completes Step 1 of the upsell satisfaction check by selecting "Yes, love it!".
   */
  async completeStep1SatisfactionCheck() {
    await this.upsellStep1YesButton.click();
  }

  /**
   * Completes Step 2 of the upsell pricing selection.
   */
  async completeStep2PricingSelection(price: string) {
    await this.nameYourPriceInput.fill(price);
    await this.payAndUnlockButton.click();
  }

  /**
   * Updates branding settings (Paid tier).
   */
  async updateBrandingSettings(options: { showBranding: boolean; customWaMessage?: string }) {
    await this.switchTab('Branding');
    
    if (options.showBranding) {
      await this.brandingToggleVisible.click();
    } else {
      await this.brandingToggleHidden.click();
    }

    if (options.customWaMessage !== undefined) {
      await this.customWaMessageInput.fill(options.customWaMessage);
    }

    await this.brandingSaveButton.click();
  }
}
