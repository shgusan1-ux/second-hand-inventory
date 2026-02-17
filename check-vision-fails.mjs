import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL.trim(),
  authToken: process.env.TURSO_AUTH_TOKEN.trim(),
});

const stats = await client.execute('SELECT analysis_status, COUNT(*) as cnt FROM product_vision_analysis GROUP BY analysis_status');
console.log('Vision Analysis Status:');
stats.rows.forEach(r => console.log(`  ${r.analysis_status}: ${r.cnt}`));

const fails = await client.execute("SELECT origin_product_no, error_message FROM product_vision_analysis WHERE analysis_status = 'failed' LIMIT 10");
console.log('\nFailed examples:');
fails.rows.forEach(r => console.log(`  #${r.origin_product_no}: ${r.error_message}`));

process.exit(0);
