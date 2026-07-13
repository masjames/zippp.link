import { Page, Locator, expect } from '@playwright/test';

export class StorePage {
  readonly page: Page;
  readonly storeHeader: Locator;
  readonly storeDescription: Locator;
  readonly productCards: Locator;
  readonly cartBar: Locator;
  readonly viewCartButton: Locator;
  readonly cartModal: Locator;
  readonly orderWhatsAppButton: Locator;
  readonly emptyStoreNotice: Locator;
  readonly limitExceededBlock: Locator;

  constructor(page: Page) {
    this.page = page;
    this.storeHeader = page.locator('h1, [data-testid="store-header"]');
    this.storeDescription = page.locator('p, [data-testid="store-description"]').first();
    this.productCards = page.locator('.product-card, [data-testid="product-card"]');
    this.cartBar = page.locator('.cart-bar, [data-testid="cart-bar"]');
    this.viewCartButton = page.getByRole('button', { name: /View Cart/i });
    this.cartModal = page.locator('.cart-modal, [data-testid="cart-modal"]');
    this.orderWhatsAppButton = page.locator('#order-wa-link, .order-wa-btn');
    this.emptyStoreNotice = page.locator('.empty-store-notice, [data-testid="empty-store-notice"]');
    this.limitExceededBlock = page.locator('.limit-exceeded-block, [data-testid="limit-exceeded-block"]');
  }

  /**
   * Navigates to the store page with the specified slug.
   */
  async navigate(slug: string) {
    await this.page.goto(`/s/${slug}`);
  }

  /**
   * Verifies store header title matches.
   */
  async verifyStoreHeader(title: string) {
    await expect(this.storeHeader).toBeVisible();
    await expect(this.storeHeader).toContainText(title);
  }

  /**
   * Verifies store description matches.
   */
  async verifyStoreDescription(description: string) {
    await expect(this.storeDescription).toBeVisible();
    await expect(this.storeDescription).toContainText(description);
  }

  /**
   * Clicks '+ Add' button for a specific product card.
   */
  async addProduct(productName: string) {
    const productCard = this.productCards.filter({ hasText: productName });
    await productCard.getByRole('button', { name: /\+ Add/i }).click();
  }

  /**
   * Verifies the bottom inline Cart Bar visibility and text content.
   */
  async verifyCartBarText(expectedText: string) {
    await expect(this.cartBar).toBeVisible();
    await expect(this.cartBar).toContainText(expectedText);
  }

  /**
   * Opens the bottom sheet cart modal.
   */
  async openCartModal() {
    await this.viewCartButton.click();
    await expect(this.cartModal).toBeVisible();
  }

  /**
   * Verifies item quantities in the modal.
   */
  async verifyCartModalItemQuantity(productName: string, expectedQty: string) {
    const cartItem = this.cartModal.locator('.cart-item, [data-testid="cart-item"]')
      .filter({ hasText: productName });
    await expect(cartItem).toBeVisible();
    
    // Check inside input value, text content, or specific quantity display
    const qtyLoc = cartItem.locator('.quantity-value, [data-testid="quantity-value"], input');
    const tagName = await qtyLoc.evaluate(el => el.tagName.toLowerCase());
    
    if (tagName === 'input') {
      await expect(qtyLoc).toHaveValue(expectedQty);
    } else {
      await expect(qtyLoc).toContainText(expectedQty);
    }
  }

  /**
   * Verifies subtotal/total sums in the modal.
   */
  async verifyCartModalSubtotal(expectedSubtotal: string) {
    const subtotalText = this.cartModal.locator('.cart-subtotal, [data-testid="cart-subtotal"]');
    await expect(subtotalText).toContainText(expectedSubtotal);
  }

  /**
   * Adjusts modal quantities (+ / -).
   */
  async adjustCartModalQuantity(productName: string, action: 'increment' | 'decrement') {
    const cartItem = this.cartModal.locator('.cart-item, [data-testid="cart-item"]')
      .filter({ hasText: productName });
    if (action === 'increment') {
      await cartItem.getByRole('button', { name: '+' }).click();
    } else {
      await cartItem.getByRole('button', { name: '-' }).click();
    }
  }

  /**
   * Clicks 'Order on WhatsApp' and returns the redirect URL or href target.
   */
  async clickOrderOnWhatsApp(): Promise<string> {
    const href = await this.orderWhatsAppButton.getAttribute('href');
    if (href) {
      return href;
    }
    
    // If it acts as a button that triggers a navigation/window.open, capture page event
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.orderWhatsAppButton.click()
    ]);
    const url = popup.url();
    await popup.close();
    return url;
  }

  /**
   * Verifies redirect parameters on the WhatsApp checkout URL.
   */
  async verifyWhatsAppUrlParams(waNumber: string, textIncludes: string[]) {
    const url = await this.clickOrderOnWhatsApp();
    expect(url).toContain(`wa.me/${waNumber}`);
    const decodedText = decodeURIComponent(url.split('text=')[1] || '');
    for (const term of textIncludes) {
      expect(decodedText).toContain(term);
    }
  }

  /**
   * Checks for empty store notice.
   */
  async verifyEmptyStoreNoticeVisible() {
    await expect(this.emptyStoreNotice).toBeVisible();
    await expect(this.emptyStoreNotice).toContainText(/This store is setting up/i);
  }

  /**
   * Checks for limit exceeded block.
   */
  async verifyLimitExceededBlockVisible() {
    await expect(this.limitExceededBlock).toBeVisible();
    await expect(this.limitExceededBlock).toContainText(/reached its monthly view limit/i);
  }
}
