import { createClient } from '@libsql/client';

const localClient = createClient({
  url: 'file:inventory.db'
});

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function checkSchema() {
  try {
    console.log('[CHECK] 🔍 attendance_logs 테이블 구조 확인...\n');

    // Check local schema
    const localSchema = await localClient.execute(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance_logs'
    `);

    console.log('[LOCAL] 로컬 DB 스키마:');
    console.log(localSchema.rows[0]?.sql || 'Table not found');

    console.log('\n');

    // Check remote schema
    const remoteSchema = await remoteClient.execute(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance_logs'
    `);

    console.log('[REMOTE] 원격 DB 스키마:');
    console.log(remoteSchema.rows[0]?.sql || 'Table not found');

    // Check if data exists
    console.log('\n[CHECK] 📊 데이터 확인...\n');

    const localData = await localClient.execute('SELECT * FROM attendance_logs LIMIT 1');
    console.log('[LOCAL] 로컬 데이터 샘플:', localData.rows[0] || 'No data');

    const remoteData = await remoteClient.execute('SELECT * FROM attendance_logs LIMIT 1');
    console.log('[REMOTE] 원격 데이터 샘플:', remoteData.rows[0] || 'No data');

  } catch (error) {
    console.error('[CHECK] ❌ 오류:', error.message);
  }
}

checkSchema();
