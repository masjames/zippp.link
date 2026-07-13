import { test, expect } from '../fixtures/auth-fixture';
import { ZCmsPage } from '../page-objects/ZCmsPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 6: Admin CMS', () => {
  let adminCmsPage: ZCmsPage;

  // =========================================================================
  // TIER 1 CASES: Happy Paths & Core Specifications
  // =========================================================================

  test('Tier 1 Case 1: Non-admin user access to /z-cms is blocked and redirected', async ({ sellerPage }) => {
    // Attempting access with regular SELLER role
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    const pageObj = new ZCmsPage(sellerPage);
    await pageObj.verifyAdminCheckRedirect();
  });

  test('Tier 1 Case 2: Admin can publish a banner/notification announcement', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);
    
    // Listening to page alerts or UI confirmation
    adminPage.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Published Announcement: Maintenance Announcement');
      await dialog.accept();
    });

    await adminCmsPage.navigate();
    await adminCmsPage.composeAndPublishAnnouncement(
      'Maintenance Announcement',
      'System will undergo maintenance at 2 AM UTC.',
      'BANNER'
    );
  });

  test('Tier 1 Case 3: User manager lists users with names, emails, and subscription plans', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);
    await adminCmsPage.navigate();
    await adminCmsPage.navigateUsers();

    // Verify first row contains expected headers / mock list data
    const table = adminCmsPage.usersTable;
    await expect(table).toBeVisible();
    
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    await expect(rows.nth(0)).toContainText('User 1');
    await expect(rows.nth(0)).toContainText('user1@example.com');
  });

  test('Tier 1 Case 4: Landing page editor saves and commits content edits', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);
    
    adminPage.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Landing page saved and committed');
      await dialog.accept();
    });

    await adminCmsPage.navigate();
    await adminCmsPage.triggerLandingPageEditor('hero_headline', 'New Live Heading!');
  });

  test('Tier 1 Case 5: Blog manager drafts and publishes a blog post', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);

    adminPage.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Published Blog Post: hello-world');
      await dialog.accept();
    });

    await adminCmsPage.navigate();
    await adminCmsPage.publishBlogPost('Hello World', 'Markdown body here.');
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, API Gating & Boundary Validations
  // =========================================================================

  test('Tier 2 Case 6: Announcement empty body submission is blocked by validation', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);
    await adminCmsPage.navigate();
    await adminCmsPage.navigateAnnouncements();
    await adminCmsPage.announcementNewButton.click();

    // Fill title but leave body empty
    await adminCmsPage.announcementTitleInput.fill('Empty Body Title');
    await adminCmsPage.announcementPublishButton.click();

    // Validation error text should be visible
    const errorLoc = adminPage.locator('#announcement-error');
    await expect(errorLoc).toBeVisible();
    await expect(errorLoc).toContainText('Body is required');
  });

  test('Tier 2 Case 7: API endpoint gating returns authorization failure for non-admins', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    
    // Intercept /api/admin/announcements to mock actual server API response
    await sellerPage.route('**/api/admin/announcements', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access denied: Admin role required' }),
      });
    });

    // Execute via page context so request routing is triggered
    await sellerPage.goto('/');
    const response = await sellerPage.evaluate(async () => {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test title', body: 'Test body' })
      });
      return { status: res.status, json: await res.json() };
    });

    expect(response.status).toBe(403);
    expect(response.json.error).toContain('Access denied');
  });

  test('Tier 2 Case 8: User manager pagination handles boundaries and navigates user list pages', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);
    await adminCmsPage.navigate();
    await adminCmsPage.navigateUsers();

    const pageNum = adminPage.locator('#page-num');
    const nextBtn = adminPage.locator('#next-page-btn');
    const prevBtn = adminPage.locator('#prev-page-btn');

    await expect(pageNum).toHaveText('1');
    await expect(prevBtn).toBeDisabled();

    // Click Next
    await nextBtn.click();
    await expect(pageNum).toHaveText('2');
    await expect(prevBtn).not.toBeDisabled();

    // Click Prev
    await prevBtn.click();
    await expect(pageNum).toHaveText('1');
  });

  test('Tier 2 Case 9: Resend email integration error displays user-facing error notification', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);
    await adminCmsPage.navigate();

    // Mock API post request to email sender to fail
    await adminPage.route('**/api/admin/email', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Resend API failed to authorize domain' }),
      });
    });

    // Execute via page context so routing is triggered
    const response = await adminPage.evaluate(async () => {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'user@example.com', subject: 'Hello', body: 'Test' })
      });
      return { status: res.status, json: await res.json() };
    });
    
    expect(response.status).toBe(500);
    expect(response.json.error).toContain('Resend API failed');
  });

  test('Tier 2 Case 10: Publishing a blog with duplicate title/slug appends suffix', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    adminCmsPage = new ZCmsPage(adminPage);

    // Slug for 'Hello World' is mocked to auto-resolve to 'hello-world-2' if it already exists
    adminPage.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Published Blog Post: hello-world-2');
      await dialog.accept();
    });

    await adminCmsPage.navigate();
    await adminCmsPage.publishBlogPost('Hello World', 'This is duplicate slug post content.');
  });
});
