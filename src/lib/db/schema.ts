import { pgTable, text, integer, timestamp, boolean, decimal, serial, jsonb, primaryKey } from 'drizzle-orm/pg-core';

// 1. Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  image: text('image'),
  role: text('role').default('SELLER').notNull(), // 'SELLER' | 'ADMIN'
  plan: text('plan').default('FREE').notNull(), // 'FREE' | 'PAID'
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  popupLastShownAt: timestamp('popup_last_shown_at'),
  popupDismissCount: integer('popup_dismiss_count').default(0).notNull(),
});

// 2. Store Links table
export const storeLinks = pgTable('store_links', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  waNumber: text('wa_number').notNull(),
  customWaMessage: text('custom_wa_message'),
  viewsCount: integer('views_count').default(0).notNull(),
  waClicksCount: integer('wa_clicks_count').default(0).notNull(),
});

// 3. Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => storeLinks.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Announcements table
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type').default('BANNER').notNull(), // 'BANNER' | 'NOTIFICATION'
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  createdBy: text('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Announcement Dismissals table
export const announcementDismissals = pgTable('announcement_dismissals', {
  id: serial('id').primaryKey(),
  announcementId: integer('announcement_id').references(() => announcements.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  dismissedAt: timestamp('dismissed_at').defaultNow().notNull(),
});

// 6. Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Blog Posts table
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  bodyMdx: text('body_mdx').notNull(),
  status: text('status').default('DRAFT').notNull(), // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: timestamp('published_at'),
  authorId: text('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. Content Edits table
export const contentEdits = pgTable('content_edits', {
  id: serial('id').primaryKey(),
  page: text('page').notNull(), // e.g. 'landing'
  section: text('section').notNull(), // e.g. 'hero_headline'
  contentJson: jsonb('content_json').notNull(),
  editedBy: text('edited_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Community Threads table
export const communityThreads = pgTable('community_threads', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isFeatureRequest: boolean('is_feature_request').default(false).notNull(),
  status: text('status').default('OPEN').notNull(), // 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Community Replies table
export const communityReplies = pgTable('community_replies', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => communityThreads.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── NextAuth Adapter Tables ──────────────────────────────────────────────────

// 11. Accounts table (OAuth providers)
export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

// 12. Sessions table (database sessions — not used with JWT strategy, but required by adapter)
export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// 13. Verification Tokens table (email magic-link)
export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);
