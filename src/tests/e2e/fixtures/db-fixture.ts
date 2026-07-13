import { test as base } from '@playwright/test';
import { cleanDatabase } from '../utils/db-cleaner';

export const test = base.extend<{
  db: void;
}>({
  db: [async ({}, use) => {
    try {
      await cleanDatabase();
    } catch (error) {
      console.warn('Failed to clean database before test:', error);
    }
    
    await use();
    
    try {
      await cleanDatabase();
    } catch (error) {
      console.warn('Failed to clean database after test:', error);
    }
  }, { auto: true }],
});

export { expect } from '@playwright/test';
