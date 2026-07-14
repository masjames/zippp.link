import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DIRECT_DATABASE_URL for migrations to bypass Neon's connection pooler.
    // Falls back to DATABASE_URL for local dev.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://zippp:zippp@localhost:5432/zippp',
  },
});
