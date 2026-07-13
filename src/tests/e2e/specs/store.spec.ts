import { test, expect } from '../fixtures/auth-fixture';
import { StorePage } from '../page-objects/StorePage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 2: Buyer Store', () => {
  let storePage: StorePage;

  test.beforeEach(async ({ page }) => {
    // Enable interactive mock routes
    await setupMockRoutes(page);
    storePage = new StorePage(page);
  });

  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Public store resolves successfully and shows correct title', async () => {
    await storePage.navigate('coffee-store');
    await storePage.verifyStoreHeader('Coffee Store');
    await storePage.verifyStoreDescription('Premium Coffee Beans & Accessories');
  });

  test('Tier 1 Case 2: Product grid renders cards with name, price and action button', async () => {
    await storePage.navigate('coffee-store');
    await expect(storePage.productCards).toHaveCount(2);
    
    const firstProduct = storePage.productCards.nth(0);
    await expect(firstProduct.locator('.product-title')).toHaveText('Coffee Beans');
    await expect(firstProduct.locator('.product-price')).toHaveText('$10.99');
    await expect(firstProduct.getByRole('button', { name: /\+ Add/i })).toBeVisible();
  });

  test('Tier 1 Case 3: Public store for free sellers renders Powered by Zippp branding footer', async ({ page }) => {
    await storePage.navigate('coffee-store');
    const footer = page.locator('[data-testid="branding-footer"]');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a')).toHaveAttribute('href', '/');
    await expect(footer).toContainText('Powered by Zippp');
  });

  test('Tier 1 Case 4: Adding products to cart shows inline cart bar updates', async () => {
    await storePage.navigate('coffee-store');
    await expect(storePage.cartBar).not.toBeVisible();
    
    await storePage.addProduct('Coffee Beans');
    await storePage.verifyCartBarText('1 item');
    await storePage.verifyCartBarText('$10.99');
  });

  test('Tier 1 Case 5: Navigating to a non-existent store slug displays 404 message', async () => {
    await storePage.navigate('non-existent-store');
    await expect(storePage.page.locator('h1')).toContainText(/404|Not Found/i);
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, Viewport & Boundary Behaviors
  // =========================================================================

  test('Tier 2 Case 6: Store with zero products displays setting up notice', async () => {
    await storePage.navigate('empty-store');
    await storePage.verifyEmptyStoreNoticeVisible();
  });

  test('Tier 2 Case 7: Products without custom images display a fallback placeholder icon/styling', async () => {
    await storePage.navigate('coffee-store');
    const secondProduct = storePage.productCards.nth(1);
    
    // The second product triggers image load error and shows the fallback
    const fallbackImg = secondProduct.locator('.fallback-img');
    await expect(fallbackImg).toBeVisible();
    await expect(fallbackImg).toContainText('No Image');
  });

  test('Tier 2 Case 8: Free store exceeding 200 monthly views displays views limit block', async () => {
    await storePage.navigate('limit-exceeded');
    await storePage.verifyLimitExceededBlockVisible();
  });

  test('Tier 2 Case 9: Long product titles/descriptions wrap gracefully and do not overflow viewport', async ({ page }) => {
    await storePage.navigate('coffee-store');
    
    // Check that store title / description wraps and fits within viewport bounds
    const container = page.locator('.text-wrap-container');
    const box = await container.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box).not.toBeNull();
    if (box && viewport) {
      expect(box.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('Tier 2 Case 10: Slugs resolve case-insensitively', async () => {
    await storePage.navigate('Coffee-Store');
    await storePage.verifyStoreHeader('Coffee Store');
  });
});
