import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL?.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN?.trim(),
});

// Delete all failed records so they'll be treated as unanalyzed
const result = await client.execute("DELETE FROM product_vision_analysis WHERE analysis_status = 'failed'");
console.log(`Deleted ${result.rowsAffected} failed vision analyses`);

const remaining = await client.execute('SELECT COUNT(*) as cnt FROM product_vision_analysis');
console.log(`Remaining records: ${remaining.rows[0].cnt}`);

process.exit(0);
