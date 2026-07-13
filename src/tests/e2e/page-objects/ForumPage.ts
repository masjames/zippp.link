import { Page, Locator, expect } from '@playwright/test';

export class ForumPage {
  readonly page: Page;
  readonly newThreadButton: Locator;
  readonly threadTitleInput: Locator;
  readonly threadBodyInput: Locator;
  readonly featureRequestCheckbox: Locator;
  readonly submitThreadButton: Locator;

  // Reply locators
  readonly replyTextarea: Locator;
  readonly submitReplyButton: Locator;

  // Admin and Status locators
  readonly statusSelect: Locator;
  readonly statusPill: Locator;
  readonly adminCommentBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newThreadButton = page.getByRole('button', { name: /New Thread/i })
      .or(page.getByRole('link', { name: /New Thread/i }))
      .or(page.getByRole('button', { name: /Start Discussion/i }));
    this.threadTitleInput = page.locator('input[name="title"], [data-testid="thread-title-input"]');
    this.threadBodyInput = page.locator('textarea[name="body"], [data-testid="thread-body-input"]');
    this.featureRequestCheckbox = page.locator('input[type="checkbox"][name="isFeatureRequest"], [data-testid="feature-request-checkbox"]');
    this.submitThreadButton = page.getByRole('button', { name: /Create Thread/i })
      .or(page.getByRole('button', { name: /Submit/i }));
    
    // Reply elements
    this.replyTextarea = page.locator('textarea[name="reply"], [data-testid="reply-textarea"]');
    this.submitReplyButton = page.getByRole('button', { name: /Post Reply/i })
      .or(page.getByRole('button', { name: /Submit Reply/i }));

    // Status / Admin elements
    this.statusSelect = page.locator('select[name="status"], [data-testid="thread-status-select"]');
    this.statusPill = page.locator('[data-testid="status-pill"], .status-pill');
    this.adminCommentBadge = page.locator('[data-testid="admin-badge"]')
      .or(page.locator('.admin-comment-badge'))
      .or(page.locator('text=/Admin/i'));
  }

  /**
   * Navigates to the community page.
   */
  async navigate() {
    await this.page.goto('/community');
  }

  /**
   * Composes and submits a new thread or feature suggestion.
   */
  async composeThread(title: string, body: string, isFeatureRequest: boolean = false) {
    await this.newThreadButton.click();
    await this.threadTitleInput.fill(title);
    await this.threadBodyInput.fill(body);
    
    const checked = await this.featureRequestCheckbox.isChecked();
    if (isFeatureRequest !== checked) {
      await this.featureRequestCheckbox.click();
    }
    
    await this.submitThreadButton.click();
  }

  /**
   * Navigates to a specific thread details page from the list.
   */
  async navigateToThread(threadTitle: string) {
    await this.page.getByRole('link', { name: threadTitle }).click();
  }

  /**
   * Submits a reply on a thread details page.
   */
  async submitReply(replyBody: string) {
    await this.replyTextarea.fill(replyBody);
    await this.submitReplyButton.click();
  }

  /**
   * Sets the thread's status flag (Available to Admins).
   */
  async setThreadStatus(status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED') {
    await this.statusSelect.selectOption(status);
    // Click any update/save status button if required, otherwise expect auto-save on select
    await this.page.getByRole('button', { name: /Update Status/i }).click().catch(() => {
      // Auto-saved or not needed
    });
  }

  /**
   * Verifies the visible status pill contains expected value.
   */
  async verifyStatusPill(expectedStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | string) {
    const detailsVisible = await this.page.locator('#details-status').isVisible();
    const target = detailsVisible ? this.page.locator('#details-status') : this.page.locator('[data-testid="status-pill"], .status-pill').first();
    await expect(target).toBeVisible();
    await expect(target).toContainText(expectedStatus);
  }

  /**
   * Verifies the presence of the Admin badge on comments/replies.
   */
  async verifyAdminCommentBadgeVisible() {
    await expect(this.adminCommentBadge.first()).toBeVisible();
  }
}
