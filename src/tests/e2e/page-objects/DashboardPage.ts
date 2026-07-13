import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly viewsStat: Locator;
  readonly clicksStat: Locator;
  readonly planStat: Locator;
  readonly productsTable: Locator;
  readonly addProductButton: Locator;
  readonly announcementBanner: Locator;
  readonly dismissAnnouncementButton: Locator;
  readonly userMenuButton: Locator;
  readonly userMenuDropdown: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.viewsStat = page.locator('[data-testid="stat-views"], .stat-views').or(page.locator('text=/Views/i/../div'));
    this.clicksStat = page.locator('[data-testid="stat-clicks"], .stat-clicks').or(page.locator('text=/Clicks/i/../div'));
    this.planStat = page.locator('[data-testid="stat-plan"], .stat-plan').or(page.locator('text=/Plan/i/../div'));
    this.productsTable = page.locator('[data-testid="products-table"], .products-table, [data-testid="products-list"]');
    this.addProductButton = page.getByRole('button', { name: /\+ Add/i }).or(page.getByRole('link', { name: /\+ Add/i }));
    this.announcementBanner = page.locator('[data-testid="announcement-banner"], .announcement-banner');
    this.dismissAnnouncementButton = page.locator('[data-testid="dismiss-announcement"], .dismiss-announcement, button:has-text("✕")');
    this.userMenuButton = page.locator('[data-testid="user-menu-button"], button:has(.rounded-full), button:has-text("Avatar")');
    this.userMenuDropdown = page.locator('[data-testid="user-menu-dropdown"], .user-menu-dropdown');
    this.settingsLink = page.getByRole('link', { name: /Settings/i });
  }

  /**
   * Navigates to the dashboard page.
   */
  async navigate() {
    await this.page.goto('/app/dashboard');
  }

  /**
   * Reads views statistic value.
   */
  async getViewsCount(): Promise<string | null> {
    return await this.viewsStat.textContent();
  }

  /**
   * Reads WhatsApp clicks statistic value.
   */
  async getClicksCount(): Promise<string | null> {
    return await this.clicksStat.textContent();
  }

  /**
   * Reads subscription plan badge / value.
   */
  async getPlanBadge(): Promise<string | null> {
    return await this.planStat.textContent();
  }

  /**
   * Clicks the '+ Add' button to create a new product.
   */
  async clickAddProduct() {
    await this.addProductButton.click();
  }

  /**
   * Locates product row or card in the products list.
   */
  getProductRow(productName: string): Locator {
    return this.page.locator('[data-testid="product-row"], .product-row, [data-testid="product-item"]')
      .filter({ hasText: productName });
  }

  /**
   * Triggers the Edit product action for a specific product.
   */
  async clickEditProduct(productName: string) {
    const row = this.getProductRow(productName);
    await row.getByRole('button', { name: /Edit/i }).or(row.getByRole('link', { name: /Edit/i })).click();
  }

  /**
   * Triggers the Delete product action for a specific product.
   */
  async clickDeleteProduct(productName: string) {
    const row = this.getProductRow(productName);
    await row.getByRole('button', { name: /Delete/i }).click();
  }

  /**
   * Dismisses the banner announcement if it is present.
   */
  async dismissAnnouncement() {
    await expect(this.announcementBanner).toBeVisible();
    await this.dismissAnnouncementButton.click();
    await expect(this.announcementBanner).not.toBeVisible();
  }

  /**
   * Opens the user menu dropdown.
   */
  async openUserMenu() {
    await this.userMenuButton.click();
    await expect(this.userMenuDropdown).toBeVisible();
  }

  /**
   * Logs out from the seller account.
   */
  async clickLogout() {
    await this.openUserMenu();
    await this.userMenuDropdown.getByRole('button', { name: /Log out/i }).click();
  }

  /**
   * Navigates to settings via dashboard headers.
   */
  async navigateToSettings() {
    await this.settingsLink.click();
    await this.page.waitForURL(/settings/);
  }
}
