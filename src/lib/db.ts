import { createClient } from '@libsql/client';

// Interface for Database Result
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

let tursoClient: any = null;
let initPromise: Promise<void> | null = null;

async function initTables() {
  const client = tursoClient!;

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS product_overrides (
        id TEXT PRIMARY KEY,
        override_date TIMESTAMP,
        internal_category TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        job_title TEXT,
        email TEXT,
        password_hint TEXT,
        security_memo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_name TEXT,
        action TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        author_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS memo_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memo_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        author_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS dashboard_tasks (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        price_consumer INTEGER DEFAULT 0,
        price_sell INTEGER DEFAULT 0,
        status TEXT DEFAULT '판매중',
        condition TEXT,
        image_url TEXT,
        md_comment TEXT,
        images TEXT DEFAULT '[]',
        size TEXT,
        fabric TEXT,
        master_reg_date TIMESTAMP,
        sold_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        classification TEXT DEFAULT 'NEW'
      );
    `);

    // Seed Categories if empty
    const catCheck = await client.execute('SELECT COUNT(*) as count FROM categories');
    if (catCheck.rows[0].count === 0) {
      console.log('[DB] Seeding categories...');
      const seedData = [
        ['NEW', 'NEW IN', 1, 'NEW'],
        ['CURATED', 'CURATED', 2, 'CURATED'],
        ['MILITARY', 'MILITARY', 3, 'ARCHIVE'],
        ['WORKWEAR', 'WORKWEAR', 4, 'ARCHIVE'],
        ['JAPAN', 'JAPANESE ARCHIVE', 5, 'ARCHIVE'],
        ['EUROPE', 'HERITAGE EUROPE', 6, 'ARCHIVE'],
        ['BRITISH', 'BRITISH ARCHIVE', 7, 'ARCHIVE'],
        ['CLEARANCE', 'CLEARANCE', 8, 'CLEARANCE']
      ];
      for (const [id, name, order, cls] of seedData) {
        await client.execute({
          sql: 'INSERT INTO categories (id, name, sort_order, classification) VALUES (?, ?, ?, ?)',
          args: [id, name, order, cls]
        });
      }
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR(10) NOT NULL,
        amount INTEGER NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        date VARCHAR(20) NOT NULL,
        payment_method VARCHAR(20),
        created_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_product_overrides_category ON product_overrides(internal_category);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_product_overrides_date ON product_overrides(override_date);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance_logs(created_at);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_memo_comments_memo ON memo_comments(memo_id);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`);

    console.log('[DB] Database initialized successfully');
  } catch (e) {
    console.error('[DB] Table initialization error:', e);
    throw e; // Re-throw to prevent queries before initialization
  }
}

function getTursoClient() {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL || 'file:/tmp/inventory.db';
    const authToken = process.env.TURSO_AUTH_TOKEN || '';

    console.log(`[DB] Initializing LibSQL client - URL: ${url}`);
    tursoClient = createClient({ url, authToken });

    // Initialize tables (only once)
    if (!initPromise) {
      initPromise = initTables();
    }
  }
  return tursoClient;
}

// Unified Database Adapter for Turso
export const db = {
  query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
    const client = getTursoClient();

    // Wait for initialization to complete
    if (initPromise) {
      await initPromise;
    }

    // Convert Postgres-style $1, $2... to SQLite-style ?
    const newParams: any[] = [];
    const tursoSql = text.replace(/\$(\d+)/g, (match, number) => {
      const idx = parseInt(number, 10) - 1;
      if (idx >= 0 && idx < params.length) {
        newParams.push(params[idx]);
        return '?';
      }
      return match;
    });

    try {
      const result = await client.execute({
        sql: tursoSql,
        args: newParams
      });

      return {
        rows: result.rows as T[],
        rowCount: result.rows.length
      };
    } catch (e) {
      console.error("Turso DB Error:", e);
      console.error("Failed SQL:", tursoSql);
      console.error("Parameters:", newParams);
      throw e;
    }
  },
};
