import dotenv from 'dotenv';
import path from 'path';

async function globalSetup() {
  // Load environment variables from .env.local
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });
  
  // Load environment variables from .env as a fallback
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

export default globalSetup;
