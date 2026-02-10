import { createClient } from '@libsql/client';

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function fixAdmin() {
  try {
    console.log('[FIX] 🔧 관리자 권한 설정 중...');

    // Update user role to admin
    await remoteClient.execute({
      sql: 'UPDATE users SET role = ? WHERE username = ?',
      args: ['admin', '01033081114']
    });

    console.log('[FIX] ✅ 01033081114 계정을 관리자로 변경 완료!');

    // Verify
    const result = await remoteClient.execute({
      sql: 'SELECT id, username, name, role FROM users WHERE username = ?',
      args: ['01033081114']
    });

    console.log('[FIX] 🔍 변경 확인:', result.rows[0]);

  } catch (error) {
    console.error('[FIX] ❌ 오류:', error.message);
  }
}

fixAdmin();
