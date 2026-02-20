import { db } from './db';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

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

    // Add product_name column for overrides
    try {
      await db.query(`ALTER TABLE product_overrides ADD COLUMN product_name TEXT`);
    } catch (e) { /* Column likely exists */ }

    // 최초 발견일 (스마트스토어 등록일 대체)
    try {
      await db.query(`ALTER TABLE product_overrides ADD COLUMN first_seen_at TIMESTAMP`);
    } catch (e) { /* Column likely exists */ }

    // Users 테이블 생성
    await db.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add can_view_accounting if missing
    try {
      await db.query(`ALTER TABLE users ADD COLUMN can_view_accounting BOOLEAN DEFAULT FALSE`);
    } catch (e) { /* Column likely exists */ }

    // Attendance Logs 테이블 생성
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit Logs 테이블 생성
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Security Logs 테이블 생성 (For auth safety)
    await db.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        user_name TEXT,
        action TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 네이버 상품 캐시 테이블 (동기화 데이터 영구 보관)
    await db.query(`
      CREATE TABLE IF NOT EXISTS naver_products (
        origin_product_no TEXT PRIMARY KEY,
        channel_product_no INTEGER,
        name TEXT,
        sale_price INTEGER,
        stock_quantity INTEGER,
        status_type TEXT,
        category_id TEXT,
        seller_management_code TEXT,
        thumbnail_url TEXT,
        brand_name TEXT,
        reg_date TEXT,
        mod_date TEXT,
        raw_json TEXT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 근로계약서 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS employment_contracts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 정규직, 계약직, 아르바이트 등
        status TEXT DEFAULT 'draft', -- draft, pending(발송됨), signed
        content_json TEXT, -- 계약 내용 (JSON)
        signature_data TEXT, -- 서명 이미지 (Base64)
        start_date TEXT,
        end_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        signed_at TIMESTAMP
      )
    `);

    // 은행 계좌 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL, -- 계좌 별칭 (예: 유동 메인)
        bank_name TEXT NOT NULL,
        account_no TEXT NOT NULL,
        balance INTEGER DEFAULT 0,
        owner_entity TEXT, -- Yudong, HM, Pumeone, 33m2
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 계좌 내역 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS account_transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT, -- Nullable for manual transactions not linked to an account
        transaction_date TIMESTAMP NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL, -- IN, OUT (or INCOME, EXPENSE)
        counterparty TEXT, -- 거래 상대방
        description TEXT,
        category TEXT, -- 고정비, 매출, 급여 등
        payment_method TEXT, -- 카드, 현금 등
        created_by TEXT, -- 작성자 ID
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 고정비 관리 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS fixed_costs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL, -- 인터넷, 전기, 가스, 임대료 등
        amount INTEGER NOT NULL,
        due_day INTEGER, -- 매월 N일
        category TEXT, -- Utility, Rent, Insurance, etc.
        account_id TEXT, -- 자동이체 계좌 ID
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 부동산 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT, -- Building, Apartment, Land, Hospitality
        address TEXT,
        purchase_date TEXT,
        purchase_price INTEGER,
        current_value INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 임대 호실 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        unit_number TEXT NOT NULL, -- 101호, 2층 전체 등
        status TEXT DEFAULT 'Vacant', -- Vacant, Occupied, Maintenance
        area INTEGER, -- 평수
        deposit INTEGER, -- 표준 보증금
        monthly_rent INTEGER, -- 표준 월세
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 임대차 계약 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS lease_contracts (
        id TEXT PRIMARY KEY,
        unit_id TEXT NOT NULL,
        tenant_name TEXT NOT NULL,
        tenant_contact TEXT,
        deposit INTEGER NOT NULL,
        monthly_rent INTEGER NOT NULL,
        management_fee INTEGER DEFAULT 0, -- 관리비
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        payment_day INTEGER NOT NULL, -- 매월 N일
        status TEXT DEFAULT 'Active', -- Active, Expired, Terminated
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    // 플레이오토 카테고리 테이블 (성별별 분류)
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        classification TEXT DEFAULT 'MAN'
      )
    `);

    // products 테이블 마이그레이션 (누락 가능한 컬럼)
    const productMigrations = [
      'ALTER TABLE products ADD COLUMN images TEXT DEFAULT \'[]\'',
      'ALTER TABLE products ADD COLUMN size TEXT',
      'ALTER TABLE products ADD COLUMN fabric TEXT',
      'ALTER TABLE products ADD COLUMN master_reg_date TIMESTAMP',
      'ALTER TABLE products ADD COLUMN sold_at TIMESTAMP',
      'ALTER TABLE products ADD COLUMN md_comment TEXT',
      'ALTER TABLE products ADD COLUMN updated_at TIMESTAMP',
      'ALTER TABLE products ADD COLUMN ai_completed INTEGER DEFAULT 0',
    ];
    for (const sql of productMigrations) {
      try { await db.query(sql); } catch (e) { /* Column likely exists */ }
    }

    // naver_products에 description_grade 컬럼 추가 (상세페이지 GRADE: S/A/B/V)
    try {
      await db.query(`ALTER TABLE naver_products ADD COLUMN description_grade TEXT`);
    } catch (e) { /* Column likely exists */ }

    // naver_product_map에 실제 네이버 전시카테고리 저장 컬럼 추가
    try {
      await db.query(`ALTER TABLE naver_product_map ADD COLUMN naver_display_category TEXT`);
    } catch (e) { /* Column likely exists */ }
    try {
      await db.query(`ALTER TABLE naver_product_map ADD COLUMN display_category_ids TEXT`);
    } catch (e) { /* Column likely exists */ }
    try {
      await db.query(`ALTER TABLE naver_product_map ADD COLUMN display_scanned_at TIMESTAMP`);
    } catch (e) { /* Column likely exists */ }
    try {
      await db.query(`ALTER TABLE naver_product_map ADD COLUMN seller_tags TEXT`);
    } catch (e) { /* Column likely exists */ }

    // Vision 분석 결과에 뱃지 유무 컬럼 추가
    try {
      await db.query(`ALTER TABLE product_vision_analysis ADD COLUMN vision_has_badge BOOLEAN DEFAULT FALSE`);
    } catch (e) { /* Column likely exists */ }

    // 아카이브 카테고리 설정 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS archive_category_settings (
        category_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // 초기 데이터 (기존 하드코딩된 목록 기반)
    const { rows: existingCats } = await db.query('SELECT count(*) as count FROM archive_category_settings');
    if (parseInt(existingCats[0].count) === 0) {
      const defaultCats = [
        ['MILITARY ARCHIVE', 'Military', 0],
        ['WORKWEAR ARCHIVE', 'Workwear', 1],
        ['OUTDOOR ARCHIVE', 'Outdoor', 2],
        ['JAPANESE ARCHIVE', 'Japan', 3],
        ['HERITAGE EUROPE', 'Euro Vintage', 4],
        ['BRITISH ARCHIVE', 'British', 5],
        ['UNISEX ARCHIVE', 'Unisex', 6]
      ];
      for (const [id, label, order] of defaultCats) {
        await db.query(
          'INSERT INTO archive_category_settings (category_id, display_name, sort_order) VALUES ($1, $2, $3)',
          [id, label, order]
        );
      }
    }

    // 사업 로드맵 (마인드맵) 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS business_roadmap (
        id TEXT PRIMARY KEY,
        term TEXT NOT NULL,
        parent_id TEXT,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'TODO',
        color TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await db.query(`ALTER TABLE business_roadmap ADD COLUMN status TEXT DEFAULT 'TODO'`);
    } catch (e) { /* Column likely exists */ }

    try {
      await db.query(`ALTER TABLE business_roadmap ADD COLUMN detailed_plan TEXT`);
    } catch (e) { /* Column likely exists */ }

    // 가상피팅 모델 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS fitting_models (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 가상피팅 결과 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS fitting_results (
        id TEXT PRIMARY KEY,
        product_no TEXT NOT NULL,
        model_id TEXT NOT NULL,
        source_image_url TEXT,
        result_image_url TEXT,
        naver_synced BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'pending',
        prompt_used TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 공급사 원본 상품 데이터 (코너로지스)
    await db.query(`
      CREATE TABLE IF NOT EXISTS supplier_products (
        product_code TEXT PRIMARY KEY,
        barcode TEXT,
        name TEXT,
        price INTEGER DEFAULT 0,
        brand TEXT,
        brand_kr TEXT,
        condition_status TEXT,
        labeled_size TEXT,
        recommended_size TEXT,
        season TEXT,
        gender TEXT,
        category1 TEXT,
        category2 TEXT,
        length_type TEXT,
        sleeve_type TEXT,
        category_no TEXT,
        fabric1 TEXT,
        fabric2 TEXT,
        fabric_raw TEXT,
        detail TEXT,
        style TEXT,
        color TEXT,
        defect TEXT DEFAULT 'N',
        received_at TEXT,
        processed_at TEXT,
        stock_status TEXT,
        return_status TEXT,
        return_reason TEXT,
        length1 REAL,
        chest REAL,
        length2 REAL,
        waist REAL,
        thigh REAL,
        hem REAL,
        rise REAL,
        hip REAL,
        shoulder REAL,
        arm_length REAL,
        acc_height REAL,
        acc_width REAL,
        bag_width REAL,
        bag_depth REAL,
        bag_height REAL,
        hat_circumference REAL,
        hat_depth REAL,
        hat_brim REAL,
        shoe_length REAL,
        shoe_ankle REAL,
        shoe_width REAL,
        shoe_heel REAL,
        image_urls TEXT DEFAULT '[]',
        logo_image TEXT,
        label_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_supplier_barcode ON supplier_products(barcode)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_supplier_brand ON supplier_products(brand)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS product_audit (
        origin_product_no TEXT PRIMARY KEY,
        issues TEXT NOT NULL DEFAULT '[]',
        detail_name TEXT,
        detail_image_url TEXT,
        detail_content_length INTEGER DEFAULT 0,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI 사용 로그 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature TEXT, -- 'image_analysis', 'price_suggestion', 'md_description'
        model TEXT, -- 'gemini-2.0-flash', etc.
        token_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat History Tables
    await db.query(`
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
      await db.query(`SELECT session_id FROM chat_messages LIMIT 1`);
    } catch {
      // session_id 컬럼이 없거나 테이블이 없음 → drop 후 재생성
      await db.query(`DROP TABLE IF EXISTS chat_messages`);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user', 'assistant'
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        action_data TEXT, -- JSON string
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `);

    // 인덱스 생성
    await db.query(`CREATE INDEX IF NOT EXISTS idx_naver_products_status ON naver_products(status_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_product_overrides_category ON product_overrides(internal_category)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_product_overrides_date ON product_overrides(override_date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance_logs(created_at)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_transactions_account ON account_transactions(account_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON account_transactions(transaction_date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_fitting_results_product ON fitting_results(product_no)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_fitting_results_status ON fitting_results(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_status_sold ON products(status, sold_at)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_naver_products_reg_date ON naver_products(reg_date)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_session_user ON chat_sessions(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)`);

    // 알림 테이블
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT, -- NULL for system-wide
        type TEXT NOT NULL, -- info, warning, error, deployment, success
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP -- For temporary alerts like deployment
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`);

    console.log('✅ DB 초기화 완료');
    isInitialized = true;
  } catch (error) {
    console.error('❌ DB 초기화 실패:', error);
    throw error;
  }
}

/**
 * DB가 초기화되었는지 확인하고, 안 되어있으면 초기화
 * 동시 요청 시 하나의 Promise만 실행 (race condition 방지)
 */
export async function ensureDbInitialized() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = initDatabase().catch(e => {
      initPromise = null; // 실패 시 재시도 가능하도록
      throw e;
    });
  }
  await initPromise;
}
