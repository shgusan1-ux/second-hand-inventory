import { createClient } from '@libsql/client';

const localClient = createClient({
  url: 'file:inventory.db'
});

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function restoreAllData() {
  try {
    console.log('[RESTORE] 🔍 로컬 데이터베이스에서 데이터 읽는 중...\n');

    // Table order for proper foreign key handling
    const tableOrder = [
      'users',
      'categories',
      'products',
      'product_overrides',
      'memos',
      'dashboard_tasks',
      'attendance_logs',
      'audit_logs',
      'security_logs',
      'chat_messages',
      'password_accounts',
      'user_permissions',
      'user_presence'
    ];

    for (const tableName of tableOrder) {
      console.log(`[RESTORE] 📦 ${tableName} 복구 중...`);

      // Check if table exists in local
      const tableCheck = await localClient.execute({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        args: [tableName]
      });

      if (tableCheck.rows.length === 0) {
        console.log(`[RESTORE]   ⏭️  테이블 없음, 건너뛰기`);
        continue;
      }

      // Get all data from local
      const localData = await localClient.execute(`SELECT * FROM ${tableName}`);

      if (localData.rows.length === 0) {
        console.log(`[RESTORE]   ⏭️  데이터 없음 (0개)`);
        continue;
      }

      console.log(`[RESTORE]   📊 ${localData.rows.length}개 레코드 발견`);

      // Clear remote table
      await remoteClient.execute(`DELETE FROM ${tableName}`);
      console.log(`[RESTORE]   🗑️  원격 테이블 초기화 완료`);

      // Get column names from first row
      const columns = Object.keys(localData.rows[0]);

      // Insert data one by one (slow but safe)
      let inserted = 0;
      for (const row of localData.rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map(() => '?').join(', ');
        const columnList = columns.join(', ');

        try {
          await remoteClient.execute({
            sql: `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
            args: values
          });
          inserted++;

          if (inserted % 10 === 0) {
            process.stdout.write(`\r[RESTORE]   ⏳ ${inserted}/${localData.rows.length}...`);
          }
        } catch (err) {
          console.error(`\n[RESTORE]   ⚠️  행 삽입 실패:`, err.message);
          // Continue with next row
        }
      }

      console.log(`\r[RESTORE]   ✅ ${inserted}개 레코드 복구 완료`);
    }

    // Verify restoration
    console.log('\n[RESTORE] 🔍 복구 검증 중...\n');
    for (const tableName of tableOrder) {
      const tableCheck = await localClient.execute({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        args: [tableName]
      });

      if (tableCheck.rows.length === 0) continue;

      const localCount = await localClient.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      const remoteCount = await remoteClient.execute(`SELECT COUNT(*) as count FROM ${tableName}`);

      const local = localCount.rows[0].count;
      const remote = remoteCount.rows[0].count;

      if (local === remote) {
        console.log(`[RESTORE]   ✅ ${tableName}: ${remote}개`);
      } else {
        console.log(`[RESTORE]   ⚠️  ${tableName}: 로컬 ${local}개, 원격 ${remote}개`);
      }
    }

    console.log('\n[RESTORE] 🎉 전체 데이터 복구 완료!');

  } catch (error) {
    console.error('\n[RESTORE] ❌ 오류:', error);
    console.error('[RESTORE] 상세:', error.message);
    throw error;
  }
}

restoreAllData();
