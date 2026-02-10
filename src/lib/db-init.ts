import { db } from './db';

let isInitialized = false;

/**
 * 데이터베이스 테이블 초기화
 * 앱 시작 시 한 번만 실행됩니다.
 */
export async function initDatabase() {
  if (isInitialized) {
    return; // 이미 초기화됨
  }

  try {
    console.log('📦 DB 초기화 시작...');

    // product_overrides 테이블 생성
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_overrides (
        id TEXT PRIMARY KEY,
        override_date TIMESTAMP,
        internal_category TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 인덱스 생성 (검색 속도 향상)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_product_overrides_category
      ON product_overrides(internal_category)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_product_overrides_date
      ON product_overrides(override_date)
    `);

    console.log('✅ DB 초기화 완료');
    isInitialized = true;
  } catch (error) {
    console.error('❌ DB 초기화 실패:', error);
    throw error;
  }
}

/**
 * DB가 초기화되었는지 확인하고, 안 되어있으면 초기화
 */
export async function ensureDbInitialized() {
  if (!isInitialized) {
    await initDatabase();
  }
}
