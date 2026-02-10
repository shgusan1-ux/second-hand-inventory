import { createClient } from '@libsql/client';

const localClient = createClient({
  url: 'file:inventory.db'
});

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  try {
    // Disable foreign keys during migration
    await remoteClient.execute('PRAGMA foreign_keys = OFF');
    console.log('[MIGRATE] 🔓 외래 키 제약 조건 일시 비활성화...\n');

    console.log('[MIGRATE] 🔧 원격 데이터베이스 테이블 생성 중...');

    // First, ensure all tables exist in remote
    // Get table schemas from local database
    const tables = await localClient.execute(`
      SELECT name, sql FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);

    // Create tables in remote if they don't exist
    for (const table of tables.rows) {
      if (table.sql) {
        console.log(`[MIGRATE]   📋 ${table.name} 테이블 확인...`);
        // Add IF NOT EXISTS to the CREATE TABLE statement
        const modifiedSql = table.sql.replace(/CREATE TABLE (\w+)/i, 'CREATE TABLE IF NOT EXISTS $1');
        try {
          await remoteClient.execute(modifiedSql);
        } catch (e) {
          console.log(`[MIGRATE]   ⚠️  ${table.name} 이미 존재함`);
        }
      }
    }

    console.log('\n[MIGRATE] 🔍 데이터 마이그레이션 시작...');
    console.log('[MIGRATE] 📋 발견된 테이블:', tables.rows.map(r => r.name).join(', '));

    // Process tables in dependency order (parent tables first)
    const tableOrder = [
      'users',
      'categories',
      'products',
      'product_overrides',
      'attendance_logs',
      'audit_logs',
      'security_logs',
      'messages',
      'chat_messages',
      'memos',
      'dashboard_tasks',
      'password_accounts',
      'user_permissions',
      'user_presence'
    ];

    const orderedTables = [];
    for (const name of tableOrder) {
      const found = tables.rows.find(t => t.name === name);
      if (found) orderedTables.push(found);
    }
    // Add any remaining tables not in the order list
    for (const table of tables.rows) {
      if (!orderedTables.find(t => t.name === table.name)) {
        orderedTables.push(table);
      }
    }

    for (const table of orderedTables) {
      const tableName = table.name;
      console.log(`\n[MIGRATE] 📦 ${tableName} 마이그레이션 중...`);

      // Get row count
      const countResult = await localClient.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult.rows[0].count;
      console.log(`[MIGRATE]   로컬 데이터: ${rowCount}개 레코드`);

      if (rowCount === 0) {
        console.log(`[MIGRATE]   ⏭️  건너뛰기 (데이터 없음)`);
        continue;
      }

      // Get all data
      const data = await localClient.execute(`SELECT * FROM ${tableName}`);

      // Get column names
      const columns = Object.keys(data.rows[0] || {});

      if (columns.length === 0) {
        console.log(`[MIGRATE]   ⏭️  건너뛰기 (컬럼 없음)`);
        continue;
      }

      // Clear remote table first
      console.log(`[MIGRATE]   🗑️  원격 테이블 초기화...`);
      await remoteClient.execute(`DELETE FROM ${tableName}`);

      // Insert data in batches
      let inserted = 0;
      const batchSize = 100;

      for (let i = 0; i < data.rows.length; i += batchSize) {
        const batch = data.rows.slice(i, i + batchSize);

        for (const row of batch) {
          const values = columns.map(col => row[col]);
          const placeholders = columns.map(() => '?').join(', ');
          const columnList = columns.join(', ');

          await remoteClient.execute({
            sql: `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
            args: values
          });

          inserted++;
          if (inserted % 50 === 0) {
            console.log(`[MIGRATE]   ⏳ ${inserted}/${rowCount} 완료...`);
          }
        }
      }

      console.log(`[MIGRATE]   ✅ ${inserted}개 레코드 마이그레이션 완료`);
    }

    // Verify migration
    console.log('\n[MIGRATE] 🔍 마이그레이션 검증 중...');
    for (const table of tables.rows) {
      const tableName = table.name;
      const localCount = await localClient.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const remoteCount = await remoteClient.execute(`SELECT COUNT(*) as count FROM ${tableName}`);

      const local = localCount.rows[0].count;
      const remote = remoteCount.rows[0].count;

      if (local === remote) {
        console.log(`[MIGRATE]   ✅ ${tableName}: ${local} = ${remote}`);
      } else {
        console.log(`[MIGRATE]   ❌ ${tableName}: ${local} ≠ ${remote} (불일치!)`);
      }
    }

    // Re-enable foreign keys
    await remoteClient.execute('PRAGMA foreign_keys = ON');
    console.log('\n[MIGRATE] 🔒 외래 키 제약 조건 재활성화...');

    console.log('\n[MIGRATE] 🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('[MIGRATE] ❌ 오류 발생:', error);
    console.error('[MIGRATE] 상세:', error.message);
    // Re-enable foreign keys even on error
    try {
      await remoteClient.execute('PRAGMA foreign_keys = ON');
    } catch (e) {
      // ignore
    }
    throw error;
  }
}

migrate();
