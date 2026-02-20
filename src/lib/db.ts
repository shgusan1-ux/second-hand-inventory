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
    // 1. Core Logic Tables
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
        can_view_accounting BOOLEAN DEFAULT FALSE,
        allowed_locations TEXT, -- JSON [{lat, lon, name, radius}]
        attendance_score INTEGER DEFAULT 100,
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

    // Seed Categories
    const catCheck = await client.execute('SELECT COUNT(*) as count FROM categories');
    if (catCheck.rows[0].count === 0) {
      const seedData = [
        ['NEW', 'NEW IN', 1, 'NEW'],
        ['CURATED', 'CURATED', 2, 'CURATED'],
        ['MILITARY ARCHIVE', 'MILITARY', 3, 'ARCHIVE'],
        ['WORKWEAR ARCHIVE', 'WORKWEAR', 4, 'ARCHIVE'],
        ['OUTDOOR ARCHIVE', 'OUTDOOR', 5, 'ARCHIVE'],
        ['JAPANESE ARCHIVE', 'JAPANESE ARCHIVE', 6, 'ARCHIVE'],
        ['HERITAGE EUROPE', 'HERITAGE EUROPE', 7, 'ARCHIVE'],
        ['BRITISH ARCHIVE', 'BRITISH ARCHIVE', 8, 'ARCHIVE'],
        ['UNISEX ARCHIVE', 'UNISEX', 9, 'ARCHIVE'],
        ['CLEARANCE', 'CLEARANCE', 10, 'CLEARANCE'],
        ['KEEP_SELLING', '판매유지', 11, 'CLEARANCE'],
        ['DISCARD', '폐기 결정', 12, 'CLEARANCE']
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

    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 기존 chat_messages 테이블이 옛날 스키마(sender_id)면 삭제 후 재생성
    try {
      await client.execute(`SELECT session_id FROM chat_messages LIMIT 1`);
    } catch {
      // session_id 컬럼이 없거나 테이블이 없음 → drop 후 재생성
      await client.execute(`DROP TABLE IF EXISTS chat_messages`);
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user', 'assistant'
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        action_data TEXT, -- JSON string
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id TEXT PRIMARY KEY,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        name TEXT,
        job_title TEXT
      )
    `);

    // 2. Extra App Tables (Permissions, Attendance, KB)
    await client.execute(`
        CREATE TABLE IF NOT EXISTS user_permissions (
            user_id TEXT,
            category TEXT,
            PRIMARY KEY (user_id, category)
        )
    `);

    await client.execute(`
        CREATE TABLE IF NOT EXISTS attendance_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            work_date TEXT,
            check_in TEXT,
            check_out TEXT,
            correction_status TEXT,
            correction_data TEXT,
            late_reason TEXT,
            check_in_location TEXT, -- JSON {lat, lon, name}
            score_impact INTEGER DEFAULT 0,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await client.execute(`
        CREATE TABLE IF NOT EXISTS kb_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            order_index INTEGER DEFAULT 0
        )
    `);

    await client.execute(`
        CREATE TABLE IF NOT EXISTS kb_articles (
            id TEXT PRIMARY KEY,
            category_id TEXT,
            title TEXT NOT NULL,
            content TEXT,
            author_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            views INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES kb_categories(id)
        )
    `);

    await client.execute(`
        CREATE TABLE IF NOT EXISTS app_feedback (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_name TEXT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            admin_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Naver & Vision Tables
    await client.execute(`
      CREATE TABLE IF NOT EXISTS naver_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        whole_category_name TEXT,
        is_last BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS naver_product_map (
        origin_product_no TEXT PRIMARY KEY,
        channel_product_no TEXT,
        naver_category_id TEXT,
        archive_category_id TEXT,
        name TEXT,
        sale_price INTEGER,
        stock_quantity INTEGER,
        status_type TEXT,
        seller_management_code TEXT,
        inferred_brand TEXT,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS product_vision_analysis (
        origin_product_no TEXT PRIMARY KEY,
        vision_brand TEXT,
        vision_clothing_type TEXT,
        vision_clothing_sub_type TEXT,
        vision_gender TEXT,
        vision_grade TEXT,
        vision_grade_reason TEXT,
        vision_color TEXT,
        vision_pattern TEXT,
        vision_fabric TEXT,
        vision_size TEXT,
        vision_confidence INTEGER DEFAULT 0,
        merged_confidence INTEGER DEFAULT 0,
        image_urls TEXT,
        raw_response TEXT,
        analysis_status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS custom_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_name TEXT NOT NULL UNIQUE,
        brand_name_ko TEXT,
        aliases TEXT,
        tier TEXT DEFAULT 'OTHER',
        country TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS exhibition_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_no TEXT NOT NULL,
        product_name TEXT,
        target_category TEXT,
        status TEXT NOT NULL,
        error_message TEXT,
        synced_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Migrations (Ensure columns exist for older tables)
    const migrations = [
      'ALTER TABLE attendance_logs ADD COLUMN late_reason TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN work_date TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN check_in TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN check_out TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN correction_status TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN correction_data TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN check_in_location TEXT',
      'ALTER TABLE attendance_logs ADD COLUMN score_impact INTEGER DEFAULT 0',
      'ALTER TABLE attendance_logs ADD COLUMN note TEXT',
      'ALTER TABLE users ADD COLUMN allowed_locations TEXT',
      'ALTER TABLE users ADD COLUMN attendance_score INTEGER DEFAULT 100',
      'ALTER TABLE app_feedback ADD COLUMN user_name TEXT'
    ];
    for (const m of migrations) {
      try {
        await client.execute(m);
      } catch (e) {
        // Silence "Duplicate column" errors
      }
    }

    // 5. Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_naver_product_status ON naver_product_map(status_type)',
      'CREATE INDEX IF NOT EXISTS idx_vision_status ON product_vision_analysis(analysis_status)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(work_date)',
      'CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)',
      'CREATE INDEX IF NOT EXISTS idx_exhibition_sync_product ON exhibition_sync_logs(product_no)',
      'CREATE INDEX IF NOT EXISTS idx_feedback_user ON app_feedback(user_id)'
    ];
    for (const idxSql of indexes) {
      await client.execute(idxSql);
    }

    console.log('[DB] Database initialized successfully');
  } catch (e) {
    console.error('[DB] Table initialization error:', e);
    throw e;
  }
}

function getTursoClient() {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
    const authToken = process.env.TURSO_AUTH_TOKEN || '';

    console.log(`[DB] Initializing LibSQL client - URL: ${url}`);
    tursoClient = createClient({ url, authToken });

    if (!initPromise) {
      initPromise = initTables();
    }
  }
  return tursoClient;
}

function convertParams(text: string, params: any[]): { sql: string; args: any[] } {
  const newParams: any[] = [];
  const tursoSql = text.replace(/\$(\d+)/g, (match, number) => {
    const idx = parseInt(number, 10) - 1;
    if (idx >= 0 && idx < params.length) {
      newParams.push(params[idx]);
      return '?';
    }
    return match;
  });
  return { sql: tursoSql, args: newParams };
}

export const db = {
  query: async <T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> => {
    const client = getTursoClient();

    if (initPromise) {
      await initPromise;
    }

    const { sql, args } = convertParams(text, params);

    try {
      const result = await client.execute({ sql, args });
      const plainRows = JSON.parse(JSON.stringify(result.rows));

      return {
        rows: plainRows as T[],
        rowCount: plainRows.length
      };
    } catch (e) {
      console.error("Turso DB Error:", e);
      throw e;
    }
  },

  // 여러 쿼리를 한 번에 Turso에 전송 (네트워크 1회 왕복)
  batch: async (statements: Array<{ sql: string; params: any[] }>): Promise<void> => {
    const client = getTursoClient();

    if (initPromise) {
      await initPromise;
    }

    const tursoStatements = statements.map(({ sql, params }) => convertParams(sql, params));

    try {
      await client.batch(tursoStatements, 'write');
    } catch (e) {
      console.error("Turso Batch Error:", e);
      throw e;
    }
  },
};
