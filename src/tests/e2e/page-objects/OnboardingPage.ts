import { Page, Locator, expect } from '@playwright/test';

export class OnboardingPage {
  readonly page: Page;
  readonly storeNameInput: Locator;
  readonly slugPreview: Locator;
  readonly countryCodeSelect: Locator;
  readonly waNumberInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.storeNameInput = page.locator('input[name="storeName"], [data-testid="store-name-input"], #store-name');
    this.slugPreview = page.locator('[data-testid="slug-preview"], .slug-preview');
    this.countryCodeSelect = page.locator('select[name="countryCode"], [data-testid="country-code-select"], #country-code');
    this.waNumberInput = page.locator('input[name="waNumber"], [data-testid="wa-number-input"], #wa-number');
    this.submitButton = page.getByRole('button', { name: /Create my store/i });
  }

  /**
   * Navigates to the onboarding page.
   */
  async navigate() {
    await this.page.goto('/app/onboarding');
  }

  /**
   * Fills in the store name input.
   */
  async fillStoreName(name: string) {
    await this.storeNameInput.fill(name);
  }

  /**
   * Reads and returns the slug live preview text.
   */
  async getSlugPreviewText(): Promise<string | null> {
    return await this.slugPreview.textContent();
  }

  /**
   * Verifies the live slug preview contains expected text/slug.
   */
  async verifySlugPreview(expectedSlug: string) {
    await expect(this.slugPreview).toContainText(expectedSlug);
  }

  /**
   * Selects the WhatsApp country code.
   */
  async selectCountryCode(code: string) {
    if (code.startsWith('+')) {
      await this.countryCodeSelect.selectOption({ value: code });
    } else {
      await this.countryCodeSelect.selectOption({ label: code }).catch(async () => {
        await this.countryCodeSelect.selectOption({ value: code });
      });
    }
  }

  /**
   * Fills in the WhatsApp phone number.
   */
  async fillWhatsAppNumber(number: string) {
    await this.waNumberInput.fill(number);
  }

  /**
   * Submits the onboarding form to create the store.
   */
  async submitStoreCreation() {
    await this.submitButton.click();
  }
}
