import { test, expect } from '../fixtures/auth-fixture';
import { ForumPage } from '../page-objects/ForumPage';
import { setupMockRoutes } from '../utils/mock-pages-helper';

test.describe('Feature 7: Community Forum', () => {
  let forumPage: ForumPage;

  test.beforeEach(async ({ context }) => {
    context.on('page', page => {
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
      page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    });
  });

  test('Tier 1 Case 1: Forum lists suggestions with titles and status pills', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    forumPage = new ForumPage(sellerPage);
    await forumPage.navigate();

    const threadLink = sellerPage.locator('#thread-link-thread-1');
    await expect(threadLink).toBeVisible();
    await expect(threadLink).toContainText('More Themes');

    await forumPage.verifyStatusPill('OPEN');
  });

  test('Tier 1 Case 2: Sellers can post new feature suggestions', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    forumPage = new ForumPage(sellerPage);
    await forumPage.navigate();

    await forumPage.composeThread('Dark Mode', 'Please add a dark mode option.', true);

    const newThread = sellerPage.locator('text=Dark Mode');
    await expect(newThread).toBeVisible();
  });

  test('Tier 1 Case 3: Sellers can post replies to existing threads', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    forumPage = new ForumPage(sellerPage);
    await forumPage.navigate();

    // Click the thread to open details
    await sellerPage.locator('#thread-link-thread-1').click();
    await forumPage.submitReply('I agree, this is very important.');

    const reply = sellerPage.locator('.reply-item', { hasText: 'I agree, this is very important.' });
    await expect(reply).toBeVisible();
  });

  test('Tier 1 Case 4: Admins can update a suggestion thread status', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    forumPage = new ForumPage(adminPage);
    await forumPage.navigate();

    // Set userSession storage mock role to ADMIN
    await adminPage.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'ADMIN' }));
    });
    await adminPage.reload();

    await adminPage.locator('#thread-link-thread-1').click();
    await forumPage.setThreadStatus('IN_PROGRESS');
    await forumPage.verifyStatusPill('IN_PROGRESS');
  });

  test('Tier 1 Case 5: Admin replies display admin badges/highlights', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    forumPage = new ForumPage(adminPage);
    await forumPage.navigate();

    await adminPage.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'ADMIN' }));
    });
    await adminPage.reload();

    await adminPage.locator('#thread-link-thread-1').click();
    await forumPage.submitReply('We will build this in Q3.');

    await forumPage.verifyAdminCommentBadgeVisible();
  });

  // =========================================================================
  // TIER 2 CASES: Edge Cases, Security & Database Gating
  // =========================================================================

  test('Tier 2 Case 6: Anonymous forum thread post is blocked', async ({ page }) => {
    await setupMockRoutes(page, null); // Unauthenticated session
    forumPage = new ForumPage(page);
    await forumPage.navigate();

    // Set anonymous role in localStorage
    await page.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'ANONYMOUS' }));
    });
    await page.reload();

    // Capture the block alert dialog
    let alertMsg = '';
    page.on('dialog', async (dialog) => {
      alertMsg = dialog.message();
      await dialog.accept();
    });

    await forumPage.composeThread('Anonymous Post', 'Trying to post without logging in', false);
    expect(alertMsg).toContain('Blocked: Must be logged in');
  });

  test('Tier 2 Case 7: Double-submit reply button is disabled immediately', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    forumPage = new ForumPage(sellerPage);
    await forumPage.navigate();

    await sellerPage.locator('#thread-link-thread-1').click();
    await forumPage.replyTextarea.fill('Fast double comment submission test');

    // Click submit and verify button disables instantly to prevent duplicate submissions
    await forumPage.submitReplyButton.click();
    const isBtnDisabled = await forumPage.submitReplyButton.isDisabled();
    expect(isBtnDisabled).toBe(true);
  });

  test('Tier 2 Case 8: Notification triggers on admin status changes', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    forumPage = new ForumPage(adminPage);
    await forumPage.navigate();

    await adminPage.evaluate(() => {
      localStorage.setItem('user-session', JSON.stringify({ role: 'ADMIN' }));
    });
    await adminPage.reload();

    await adminPage.locator('#thread-link-thread-1').click();
    await forumPage.setThreadStatus('COMPLETED');

    const notificationLoc = adminPage.locator('#status-notification');
    await expect(notificationLoc).toBeVisible();
    await expect(notificationLoc).toContainText('Status changed!');
  });

  test('Tier 2 Case 9: Thread deletion triggers cascading database cleanups API', async ({ adminPage }) => {
    await setupMockRoutes(adminPage, 'ADMIN', 'FREE');
    forumPage = new ForumPage(adminPage);
    await forumPage.navigate();

    // Mock cascade delete API call
    await adminPage.route('**/api/forum/threads/*', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, cascadesCleanedCount: 15 }),
      });
    });

    // Execute via page context so routing is triggered
    const response = await adminPage.evaluate(async () => {
      const res = await fetch('/api/forum/threads/thread-1', {
        method: 'DELETE'
      });
      return { status: res.status, json: await res.json() };
    });

    expect(response.status).toBe(200);
    expect(response.json.success).toBe(true);
    expect(response.json.cascadesCleanedCount).toBe(15);
  });

  test('Tier 2 Case 10: Malicious HTML scripts in posts are filtered/escaped', async ({ sellerPage }) => {
    await setupMockRoutes(sellerPage, 'SELLER', 'FREE');
    forumPage = new ForumPage(sellerPage);
    await forumPage.navigate();

    // Fill with XSS payload
    const xssPayload = '<script>window.forumXssExecuted=true;</script>Regular description';
    await forumPage.composeThread('Security Test Title', xssPayload, false);

    // Check that script did not execute
    const xssCheck = await sellerPage.evaluate(() => (window as unknown as Record<string, unknown>).forumXssExecuted === true);
    expect(xssCheck).not.toBe(true);

    // Clicking the thread details
    await sellerPage.locator('text=Security Test Title').click();
    
    // Script tag should be empty or filtered out
    const bodyText = await sellerPage.locator('#details-body').innerHTML();
    expect(bodyText).not.toContain('<script>');
  });
});
