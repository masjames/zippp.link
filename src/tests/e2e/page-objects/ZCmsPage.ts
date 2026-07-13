import { Page, Locator, expect } from '@playwright/test';

export class ZCmsPage {
  readonly page: Page;
  readonly sidebarDashboard: Locator;
  readonly sidebarPages: Locator;
  readonly sidebarBlog: Locator;
  readonly sidebarUsers: Locator;
  readonly sidebarAnnouncements: Locator;
  readonly sidebarNotifications: Locator;

  // Announcement locators
  readonly announcementNewButton: Locator;
  readonly announcementTitleInput: Locator;
  readonly announcementBodyInput: Locator;
  readonly announcementTypeBanner: Locator;
  readonly announcementTypeNotification: Locator;
  readonly announcementPublishButton: Locator;

  // User Manager locators
  readonly usersTable: Locator;
  readonly userSearchInput: Locator;

  // Landing Page Editor locators
  readonly saveAndCommitButton: Locator;

  // Blog Manager locators
  readonly blogNewButton: Locator;
  readonly blogTitleInput: Locator;
  readonly blogBodyInput: Locator;
  readonly blogStatusSelect: Locator;
  readonly blogSaveDraftButton: Locator;
  readonly blogPublishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarDashboard = page.getByRole('link', { name: /Dashboard/i });
    this.sidebarPages = page.getByRole('link', { name: /Pages/i });
    this.sidebarBlog = page.getByRole('link', { name: /Blog/i });
    this.sidebarUsers = page.getByRole('link', { name: /Users/i });
    this.sidebarAnnouncements = page.getByRole('link', { name: /Announce/i });
    this.sidebarNotifications = page.getByRole('link', { name: /Notifs/i });

    // Announcement elements
    this.announcementNewButton = page.getByRole('button', { name: /New Announcement/i })
      .or(page.getByRole('link', { name: /New Announcement/i }));
    this.announcementTitleInput = page.locator('#announcement-title, [data-testid="announcement-title"]');
    this.announcementBodyInput = page.locator('#announcement-body, [data-testid="announcement-body"]');
    this.announcementTypeBanner = page.locator('input[value="BANNER"], [data-testid="type-banner"]');
    this.announcementTypeNotification = page.locator('input[value="NOTIFICATION"], [data-testid="type-notification"]');
    this.announcementPublishButton = page.getByRole('button', { name: /Publish to all sellers/i })
      .or(page.getByRole('button', { name: /Publish/i }));

    // Users elements
    this.usersTable = page.locator('[data-testid="users-table"], .users-table');
    this.userSearchInput = page.locator('input[type="search"], [data-testid="user-search"]');

    // Landing Editor
    this.saveAndCommitButton = page.getByRole('button', { name: /Save & Commit/i });

    // Blog elements
    this.blogNewButton = page.getByRole('button', { name: /New Post/i }).or(page.getByRole('link', { name: /New Post/i }));
    this.blogTitleInput = page.locator('#blog-title, [data-testid="blog-title"]');
    this.blogBodyInput = page.locator('#blog-body, [data-testid="blog-body"]');
    this.blogStatusSelect = page.locator('select[name="status"], [data-testid="blog-status"]');
    this.blogSaveDraftButton = page.getByRole('button', { name: /Save Draft/i });
    this.blogPublishButton = page.getByRole('button', { name: /Publish/i });
  }

  /**
   * Navigates to the main Z-CMS landing admin page.
   */
  async navigate() {
    await this.page.goto('/z-cms');
  }

  /**
   * Verifies access restriction. A non-admin user should be redirected to the seller dashboard.
   */
  async verifyAdminCheckRedirect() {
    await this.page.goto('/z-cms');
    await this.page.waitForURL(/app\/dashboard/);
    
    // Also optional to check for access denied toast or text
    await expect(this.page.locator('body')).toContainText(/Access denied/i);
  }

  /**
   * Navigates to the Announcements section.
   */
  async navigateAnnouncements() {
    await this.sidebarAnnouncements.click();
    await this.page.waitForURL(/announcements/);
  }

  /**
   * Composes and publishes an announcement.
   */
  async composeAndPublishAnnouncement(title: string, body: string, type: 'BANNER' | 'NOTIFICATION') {
    await this.navigateAnnouncements();
    await this.announcementNewButton.click();
    
    await this.announcementTitleInput.fill(title);
    await this.announcementBodyInput.fill(body);
    
    if (type === 'BANNER') {
      await this.announcementTypeBanner.click().catch(() => this.page.getByLabel('Banner').click());
    } else {
      await this.announcementTypeNotification.click().catch(() => this.page.getByLabel('Notification').click());
    }
    
    await this.announcementPublishButton.click();
  }

  /**
   * Navigates to the Users section.
   */
  async navigateUsers() {
    await this.sidebarUsers.click();
    await this.page.waitForURL(/users/);
  }

  /**
   * Verifies that a specific user row exists in the user table.
   */
  async verifyUserInList(email: string, expectedName: string, expectedPlan: string) {
    await this.navigateUsers();
    await this.userSearchInput.fill(email);
    const row = this.usersTable.locator('tr').filter({ hasText: email });
    await expect(row).toBeVisible();
    await expect(row).toContainText(expectedName);
    await expect(row).toContainText(expectedPlan);
  }

  /**
   * Triggers the inline helper editor for landing page sections.
   */
  async triggerLandingPageEditor(sectionTestId: string, newContent: string) {
    await this.sidebarPages.click();
    await this.page.waitForURL(/pages\/landing/);
    
    // Click the editable section inside live preview iframe or overlay
    const section = this.page.locator(`[data-testid="${sectionTestId}"], .editable-${sectionTestId}`);
    await section.click();
    
    // Use floating toolbar or direct text content edit
    await section.fill(newContent).catch(async () => {
      // If contenteditable or editor modal
      const editorTextarea = this.page.locator('.editor-textarea, [data-testid="editor-textarea"]');
      if (await editorTextarea.isVisible()) {
        await editorTextarea.fill(newContent);
      } else {
        await section.evaluate((node, val) => {
          (node as HTMLElement).innerText = val;
        }, newContent);
      }
    });

    // Save changes
    await this.saveAndCommitButton.click();
  }

  /**
   * Publishes or drafts a blog post.
   */
  async publishBlogPost(title: string, bodyMarkdown: string, options?: { draft?: boolean }) {
    await this.sidebarBlog.click();
    await this.page.waitForURL(/blog/);
    await this.blogNewButton.click();

    await this.blogTitleInput.fill(title);
    await this.blogBodyInput.fill(bodyMarkdown);

    if (options?.draft) {
      await this.blogSaveDraftButton.click();
    } else {
      await this.blogPublishButton.click();
    }
  }
}
