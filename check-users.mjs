import { createClient } from '@libsql/client';

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function checkUsers() {
  try {
    console.log('[CHECK] 🔍 사용자 계정 확인 중...\n');

    const result = await remoteClient.execute('SELECT id, username, name, role FROM users');

    console.log('[CHECK] 📋 현재 사용자 목록:');
    for (const user of result.rows) {
      console.log(`  - ID: ${user.id}`);
      console.log(`    아이디: ${user.username}`);
      console.log(`    이름: ${user.name}`);
      console.log(`    역할: ${user.role}`);
      console.log('');
    }

    console.log(`[CHECK] 총 ${result.rows.length}명의 사용자`);

  } catch (error) {
    console.error('[CHECK] ❌ 오류:', error.message);
  }
}

checkUsers();
