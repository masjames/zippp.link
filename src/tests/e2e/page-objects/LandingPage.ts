import { Page, Locator, expect } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly googleSignInButton: Locator;
  readonly createStoreButton: Locator;
  readonly demoCartBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1');
    this.googleSignInButton = page.getByRole('button', { name: /Continue with Google/i });
    // Matches the CTA on the landing page
    this.createStoreButton = page.getByRole('button', { name: /Create my WhatsApp store, free/i })
      .or(page.getByRole('link', { name: /Create my store, free/i }));
    // Demo cart bar selector
    this.demoCartBar = page.locator('[data-testid="demo-cart-bar"]').or(page.locator('.demo-cart-bar'));
  }

  /**
   * Navigates to the landing page.
   */
  async navigate() {
    await this.page.goto('/');
  }

  /**
   * Verifies that the hero title is visible and contains expected text.
   */
  async verifyHeroTitle() {
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroTitle).toContainText(/Turn Instagram followers/i);
  }

  /**
   * Selects/changes theme presets on the landing page.
   * Curated options: 'Minimalist Slate', 'Warm Earth/Cream', 'Sleek Midnight'
   */
  async selectThemePreset(themeName: 'Minimalist Slate' | 'Warm Earth/Cream' | 'Sleek Midnight') {
    const themeBtn = this.page.getByRole('button', { name: themeName, exact: true })
      .or(this.page.locator(`[data-theme-preset="${themeName}"]`));
    await themeBtn.click();
  }

  /**
   * Triggers the Google Sign-In flow.
   */
  async triggerGoogleSignIn() {
    await this.googleSignInButton.click();
  }

  /**
   * Adds a product to the cart in the live demo section.
   */
  async addDemoProduct(productName: string) {
    const productCard = this.page.locator('[data-testid="demo-product-card"], .demo-product-card')
      .filter({ hasText: productName });
    await productCard.getByRole('button', { name: /\+ Add/i }).click();
  }

  /**
   * Increments or decrements a product's quantity in the live demo section.
   */
  async adjustDemoQuantity(productName: string, action: 'increment' | 'decrement') {
    const productCard = this.page.locator('[data-testid="demo-product-card"], .demo-product-card')
      .filter({ hasText: productName });
    if (action === 'increment') {
      await productCard.getByRole('button', { name: '+' }).click();
    } else {
      await productCard.getByRole('button', { name: '-' }).click();
    }
  }

  /**
   * Returns the text contents of the demo cart bar.
   */
  async getDemoCartBarText(): Promise<string | null> {
    return await this.demoCartBar.textContent();
  }

  /**
   * Verifies the text contents of the demo cart bar.
   */
  async verifyDemoCartBarText(expectedText: string) {
    await expect(this.demoCartBar).toContainText(expectedText);
  }
}
