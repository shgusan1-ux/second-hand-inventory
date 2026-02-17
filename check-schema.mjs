import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function check() {
  const client = createClient({ url: `file:${dbPath}` });
  try {
    const result = await client.execute("PRAGMA table_info(product_overrides)");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (e) {
    console.error(e);
  }
}

check();
