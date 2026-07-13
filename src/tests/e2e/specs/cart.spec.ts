import { test, expect } from '../fixtures/auth-fixture';
import { StorePage } from '../page-objects/StorePage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 3: Cart & WhatsApp Checkout', () => {
  let storePage: StorePage;

  test.beforeEach(async ({ page }) => {
    await setupMockRoutes(page);
    storePage = new StorePage(page);
    await storePage.navigate('coffee-store');
  });

  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Adding products to cart shows bottom cart bar with totals', async () => {
    await storePage.addProduct('Coffee Beans');
    await storePage.verifyCartBarText('1 item');
    await storePage.verifyCartBarText('$10.99');
  });

  test('Tier 1 Case 2: Bottom cart bar displays a View Cart action button', async () => {
    await storePage.addProduct('Coffee Beans');
    await expect(storePage.viewCartButton).toBeVisible();
  });

  test('Tier 1 Case 3: Clicking View Cart opens the bottom sheet cart modal overlay', async () => {
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    await expect(storePage.cartModal).toBeVisible();
    await storePage.verifyCartModalItemQuantity('Coffee Beans', '1');
  });

  test('Tier 1 Case 4: Adjusting quantity in the cart modal updates the item count and subtotal', async () => {
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    
    // Increment
    await storePage.adjustCartModalQuantity('Coffee Beans', 'increment');
    await storePage.verifyCartModalItemQuantity('Coffee Beans', '2');
    await storePage.verifyCartModalSubtotal('$21.98');
    
    // Decrement
    await storePage.adjustCartModalQuantity('Coffee Beans', 'decrement');
    await storePage.verifyCartModalItemQuantity('Coffee Beans', '1');
    await storePage.verifyCartModalSubtotal('$10.99');
  });

  test('Tier 1 Case 5: Clicking Order on WhatsApp generates correct redirect URL and message structure', async () => {
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    
    // Check deep link URL and parameters
    await storePage.verifyWhatsAppUrlParams('123456789', [
      'Hi, I want to order:',
      '1x Coffee Beans - $10.99',
      'Total: $10.99'
    ]);
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases & Validation Safeguards
  // =========================================================================

  test('Tier 2 Case 6: WhatsApp checkout is disabled/prevented if the cart is empty', async ({ page }) => {
    // Open the cart modal programmatically since the cart bar is hidden when empty
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).showModal());
    
    // WhatsApp button should be disabled / not clickable
    const waButton = storePage.orderWhatsAppButton;
    await expect(waButton).toHaveClass(/disabled/);
    
    const href = await waButton.getAttribute('href');
    expect(href === '#' || href === null).toBe(true);
  });

  test('Tier 2 Case 7: Rapid clicks on adding or modifying cart quantities behave stably without races', async () => {
    // Click add multiple times quickly
    await storePage.addProduct('Coffee Beans');
    await storePage.addProduct('Coffee Beans');
    await storePage.addProduct('Coffee Beans');
    
    await storePage.verifyCartBarText('3 items');
    await storePage.verifyCartBarText('$32.97');
  });

  test('Tier 2 Case 8: Item pricing and subtotal calculations maintain decimal precision without rounding errors', async () => {
    await storePage.addProduct('Coffee Beans'); // $10.99
    await storePage.addProduct('Coffee Beans'); // $10.99
    
    await storePage.openCartModal();
    // Subtotal must be exactly $21.98, avoiding floating point inaccuracies (e.g. 21.980000000002)
    await storePage.verifyCartModalSubtotal('$21.98');
  });

  test('Tier 2 Case 9: WhatsApp redirect link encodes emojis and special characters correctly', async () => {
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    
    const url = await storePage.clickOrderOnWhatsApp();
    
    // Verify that emoji characters (e.g., U+1F6CD) are URL-encoded in the text parameter
    // 🛍️ encodes to %F0%9F%9B%8D
    expect(url).toContain('%F0%9F%9B%8D');
  });

  test('Tier 2 Case 10: Decrementing the last item in the cart modal removes it, closes modal, and hides cart bar', async () => {
    await storePage.addProduct('Coffee Beans');
    await storePage.openCartModal();
    
    // Decrement last item to 0
    await storePage.adjustCartModalQuantity('Coffee Beans', 'decrement');
    
    // Cart modal should be hidden
    await expect(storePage.cartModal).not.toBeVisible();
    // Cart bar should be hidden
    await expect(storePage.cartBar).not.toBeVisible();
  });
});
