import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * Truncates all tables in the database to clean up state between test runs.
 */
export async function cleanDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL is not defined in the environment. Skipping DB cleanup.');
    return;
  }

  let Client;
  try {
    // Dynamically require pg to avoid compile-time or runtime errors if pg is not yet installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Client = require('pg').Client;
  } catch {
    console.warn('The "pg" package is not installed. Database cleanup cannot run.');
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();

    const tables = [
      'users',
      'store_links',
      'products',
      'announcements',
      'announcement_dismissals',
      'notifications',
      'blog_posts',
      'content_edits',
      'community_threads',
      'community_replies',
    ];

    console.log('Cleaning database tables...');
    for (const table of tables) {
      // Use CASCADE to handle foreign key dependencies and double quotes to preserve case if needed
      await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`Truncated table: ${table}`);
    }

    await client.end();
    console.log('Database cleanup completed successfully.');
  } catch (error) {
    console.error('Error occurred during database cleanup:', error);
    throw error;
  }
}

// Allow executing the script directly
if (require.main === module) {
  cleanDatabase().catch((err) => {
    console.error('Failed to run db-cleaner:', err);
    process.exit(1);
  });
}
