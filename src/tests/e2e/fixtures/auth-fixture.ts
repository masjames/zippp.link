/* eslint-disable react-hooks/rules-of-hooks */
import { test as dbTest } from './db-fixture';
import { Page } from '@playwright/test';
import { setupMockRoutes } from '../utils/mock-pages-helper';

export const test = dbTest.extend<{
  sellerPage: Page;
  adminPage: Page;
  paidSellerPage: Page;
}>({
  sellerPage: async ({ context }, use) => {
    // Create an isolated page instance for the seller
    const page = await context.newPage();
    await setupMockRoutes(page, 'SELLER', 'FREE');

    // Inject next-auth session cookie
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-seller-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await use(page);
    await page.close();
  },

  adminPage: async ({ context }, use) => {
    // Create an isolated page instance for the admin
    const page = await context.newPage();
    await setupMockRoutes(page, 'ADMIN', 'FREE');

    // Inject next-auth session cookie
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-admin-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await use(page);
    await page.close();
  },

  paidSellerPage: async ({ context }, use) => {
    // Create an isolated page instance for the paid seller
    const page = await context.newPage();
    await setupMockRoutes(page, 'SELLER', 'PAID');

    // Inject next-auth session cookie
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-paid-seller-session-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
