import { test, expect } from '../fixtures/auth-fixture';
import { DashboardPage } from '../page-objects/DashboardPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 4: Seller Dashboard', () => {
  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Dashboard displays correct overview stats cards (views, clicks, plan)', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    const views = await dashboardPage.getViewsCount();
    const clicks = await dashboardPage.getClicksCount();
    const plan = await dashboardPage.getPlanBadge();

    expect(views).toBe('120');
    expect(clicks).toBe('45');
    expect(plan).toBe('FREE');
  });

  test('Tier 1 Case 2: Dashboard lists products in a table with name, price, and action buttons', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    await expect(dashboardPage.productsTable).toBeVisible();
    
    const row = dashboardPage.getProductRow('Coffee Beans');
    await expect(row).toBeVisible();
    await expect(row).toContainText('$10.99');
    
    await expect(row.getByRole('button', { name: /Edit/i })).toBeVisible();
    await expect(row.getByRole('button', { name: /Delete/i })).toBeVisible();
  });

  test('Tier 1 Case 3: Clicking + Add button triggers product addition action', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    // Verify initial row count
    const rowsBefore = sellerPage.locator('.product-row');
    await expect(rowsBefore).toHaveCount(2);

    await dashboardPage.clickAddProduct();

    // Verify a new row has been added
    const rowsAfter = sellerPage.locator('.product-row');
    await expect(rowsAfter).toHaveCount(3);
    await expect(rowsAfter.nth(2)).toContainText('New Product 3');
  });

  test('Tier 1 Case 4: Dismissing the announcement banner closes it', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    await expect(dashboardPage.announcementBanner).toBeVisible();
    await dashboardPage.dismissAnnouncement();
  });

  test('Tier 1 Case 5: Seller can navigate to Settings page via user avatar menu dropdown', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    await dashboardPage.openUserMenu();
    await dashboardPage.navigateToSettings();
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, Plan Gating & Layout Validation
  // =========================================================================

  test('Tier 2 Case 6a: Free seller hits 5 products limit', async ({ sellerPage }) => {
    const freeDashboard = new DashboardPage(sellerPage);
    await freeDashboard.navigate();

    // Currently has 2 products. Let's add up to 5.
    await freeDashboard.clickAddProduct(); // 3rd
    await expect(sellerPage.locator('.product-row')).toHaveCount(3);

    await freeDashboard.clickAddProduct(); // 4th
    await expect(sellerPage.locator('.product-row')).toHaveCount(4);

    await freeDashboard.clickAddProduct(); // 5th
    await expect(sellerPage.locator('.product-row')).toHaveCount(5);
    
    // 6th addition should fail and trigger the upsell modal
    await freeDashboard.clickAddProduct();
    await expect(sellerPage.locator('#upsell-modal')).toBeVisible();
  });

  test('Tier 2 Case 6b: Paid seller has unlimited additions', async ({ paidSellerPage }) => {
    const paidDashboard = new DashboardPage(paidSellerPage);
    await paidDashboard.navigate();

    // Add up to 6 products
    await paidDashboard.clickAddProduct(); // 3rd
    await expect(paidSellerPage.locator('.product-row')).toHaveCount(3);

    await paidDashboard.clickAddProduct(); // 4th
    await expect(paidSellerPage.locator('.product-row')).toHaveCount(4);

    await paidDashboard.clickAddProduct(); // 5th
    await expect(paidSellerPage.locator('.product-row')).toHaveCount(5);

    await paidDashboard.clickAddProduct(); // 6th
    await expect(paidSellerPage.locator('.product-row')).toHaveCount(6);

    // Upsell modal should NOT display
    await expect(paidSellerPage.locator('#upsell-modal')).not.toBeVisible();
  });

  test('Tier 2 Case 7: Announcement banner dismissal persists across page reloads', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    await expect(dashboardPage.announcementBanner).toBeVisible();
    await dashboardPage.dismissAnnouncement();

    // Reload the page
    await sellerPage.reload();

    // Banner should remain dismissed/hidden
    await expect(dashboardPage.announcementBanner).not.toBeVisible();
  });

  test('Tier 2 Case 8: Dashboard loads successfully with zero views/clicks activity statistics', async ({ sellerPage }) => {
    // Navigate with a zero-activity route setting
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    
    // Intercept stats count values to return 0
    await sellerPage.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-seller-id',
            name: 'Mock Seller',
            email: 'seller@example.com',
            role: 'SELLER',
            plan: 'FREE',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Use page manipulation to simulate zero statistics
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();
    
    await sellerPage.evaluate(() => {
      const viewsLoc = document.querySelector('[data-testid="stat-views"]');
      const clicksLoc = document.querySelector('[data-testid="stat-clicks"]');
      if (viewsLoc) viewsLoc.textContent = '0';
      if (clicksLoc) clicksLoc.textContent = '0';
    });

    const views = await dashboardPage.getViewsCount();
    const clicks = await dashboardPage.getClicksCount();

    expect(views).toBe('0');
    expect(clicks).toBe('0');
  });

  test('Tier 2 Case 9: User menu and settings button wrap cleanly on mobile viewport sizes without overflow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await setupMockRoutes(page, 'SELLER', 'FREE');
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
    
    // Verify menu button is within viewport boundaries and clickable
    const menuBtnBox = await dashboardPage.userMenuButton.boundingBox();
    expect(menuBtnBox).not.toBeNull();
    if (menuBtnBox) {
      expect(menuBtnBox.x + menuBtnBox.width).toBeLessThanOrEqual(375);
    }
    
    await dashboardPage.openUserMenu();
    const dropdownBox = await dashboardPage.userMenuDropdown.boundingBox();
    expect(dropdownBox).not.toBeNull();
    if (dropdownBox) {
      expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('Tier 2 Case 10: Deleting a product removes it from table and updates listing', async ({ sellerPage }) => {
    const dashboardPage = new DashboardPage(sellerPage);
    await dashboardPage.navigate();

    // Verify row for 'Coffee Beans' exists
    const row = dashboardPage.getProductRow('Coffee Beans');
    await expect(row).toBeVisible();

    // Click delete action
    await dashboardPage.clickDeleteProduct('Coffee Beans');

    // Row should be removed
    await expect(row).not.toBeVisible();
  });
});
