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
    const dbPath = path.join(process.cwd(), 'inventory.db');
    sqliteDb = new Database(dbPath);
  }
  return sqliteDb;
}

// Unified Database Adapter
// supports switching between SQLite (Local) and Vercel Postgres (Cloud)
export const db = {
  query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
    // Checking environment - In a real scenario, check process.env.POSTGRES_URL
    const isCloud = process.env.POSTGRES_URL && process.env.NODE_ENV === 'production';

    if (isCloud) {
      // Lazy load @vercel/postgres to avoid install errors locally
      const { sql } = await import('@vercel/postgres');
      // Vercel Postgres usage (Simplified adaptation)
      // Note: This is a placeholder logic. Vercel SQL template tag usage is strict.
      // For a robust migration, we might use 'kysely' or similar, but for now we wrap.
      // CAUTION: 'text' string interpolation is dangerous in production without proper sanitization/tagging.
      // Ideally, we rewrite queries to use sql template tag directly in actions.
      // But for quick adapter:
      const result = await sql.query(text, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
      };
    } else {
      // Local SQLite (Simulate Async)
      const db = getSqliteDb();
      // Convert Postgres-style $1, $2 to SQLite-style ?, ?
      let sqliteSql = text;
      let index = 1;
      while (sqliteSql.includes(`$${index}`)) {
        sqliteSql = sqliteSql.replace(`$${index}`, '?');
        index++;
      }

      // Check if it's a SELECT or INSERT/UPDATE
      const isSelect = text.trim().toLowerCase().startsWith('select');

      try {
        const stmt = db.prepare(sqliteSql);
        if (isSelect) {
          const rows = stmt.all(...params);
          return { rows: rows as T[], rowCount: rows.length };
        } else {
          const info = stmt.run(...params);
          return { rows: [], rowCount: info.changes };
        }
      } catch (e) {
        console.error("SQL Error:", e, text, params);
        throw e;
      }
    }
  },

  // Helper specifically for our current SQLite pattern which returns `.get()`
  // We will refactor logic to use rows[0] instead
};
