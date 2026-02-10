import Database from 'better-sqlite3';
import path from 'path';

// Interface for Database Result
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

let sqliteDb: any = null;

function getSqliteDb() {
  if (!sqliteDb) {
    const isVercel = !!process.env.VERCEL;
    // Vercel only allows writing to /tmp directory in serverless functions
    const dbPath = isVercel
      ? '/tmp/inventory.db'
      : path.join(process.cwd(), 'inventory.db');

    console.log(`[DB] Initializing SQLite at: ${dbPath}`);
    sqliteDb = new Database(dbPath);
  }
  return sqliteDb;
}

// Unified Database Adapter
// supports switching between SQLite (Local) and Vercel Postgres (Cloud)
export const db = {
  query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
    // Priority: POSTGRES_URL exists -> Use Postgres (Vercel)
    // Fallback: Use Local SQLite
    // Use DB_TYPE=sqlite to force local even if POSTGRES_URL exists
    const isCloud = !!process.env.POSTGRES_URL && process.env.DB_TYPE !== 'sqlite';

    if (isCloud) {
      // Use the standard db client for raw queries
      const { db } = await import('@vercel/postgres');
      try {
        const result = await db.query(text, params);
        return {
          rows: result.rows as T[],
          rowCount: result.rowCount || 0,
        };
      } catch (e) {
        console.error("Cloud DB Error:", e);
        throw e;
      }
    } else {
      // Local SQLite (Simulate Async)
      const sqlite = getSqliteDb();

      // Convert Postgres-style $1, $2... to SQLite-style ?
      // Since Postgres allows reusing parameters ($1 used multiple times),
      // we must expand the params array to match the order of '?' in the generated SQLite query.

      const newParams: any[] = [];
      const sqliteSql = text.replace(/\$(\d+)/g, (match, number) => {
        const idx = parseInt(number, 10) - 1;
        if (idx >= 0 && idx < params.length) {
          newParams.push(params[idx]);
          return '?';
        }
        return match;
      });

      const isSelect = text.trim().toLowerCase().startsWith('select');

      try {
        const stmt = sqlite.prepare(sqliteSql);

        let result;
        if (isSelect) {
          result = stmt.all(...newParams);
          return { rows: result as T[], rowCount: (result as any[]).length };
        } else {
          result = stmt.run(...newParams);
          return { rows: [], rowCount: result.changes };
        }
      } catch (e) {
        console.error("SQL Error:", e);
        console.error("Failed SQL:", sqliteSql);
        console.error("Parameters:", newParams);
        throw e;
      }
    }
  },

  // Helper specifically for our current SQLite pattern which returns `.get()`
  // We will refactor logic to use rows[0] instead
};
