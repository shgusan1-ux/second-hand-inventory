import { createClient } from '@libsql/client';

// Interface for Database Result
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

let tursoClient: any = null;

function getTursoClient() {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    }

    console.log('[DB] Initializing Turso client');
    tursoClient = createClient({ url, authToken });

    // Auto-initialize tables for Turso (SQLite compatible)
    const initTables = async () => {
      try {
        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS product_overrides (
            id TEXT PRIMARY KEY,
            override_date TIMESTAMP,
            internal_category TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`
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

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS attendance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`
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

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS security_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            user_name TEXT,
            action TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            author_name VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS memo_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            memo_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            author_name VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS dashboard_tasks (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMP
          );
        `);

        await tursoClient.execute(`
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

        await tursoClient.execute(`
          CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_product_overrides_category ON product_overrides(internal_category);`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_product_overrides_date ON product_overrides(override_date);`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id);`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance_logs(created_at);`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_memo_comments_memo ON memo_comments(memo_id);`);
        await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`);

        console.log('[DB] Turso tables initialized successfully');
      } catch (e) {
        console.error('[DB] Table initialization error:', e);
        // Don't throw, tables might already exist
      }
    };

    // Initialize tables (fire and forget)
    initTables();
  }

  return tursoClient;
}

// Unified Database Adapter for Turso
export const db = {
  query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
    const client = getTursoClient();

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
