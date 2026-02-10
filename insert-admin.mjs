import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function insertAdmin() {
  try {
    const username = '01033081114';
    const password = 'zmffldkd1*';
    const userId = 'admin-' + Date.now();

    console.log('[ADMIN] 🔐 비밀번호 해시 생성 중...');
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('[ADMIN] 👤 관리자 계정 생성 중...');

    // Delete existing user if exists
    await remoteClient.execute({
      sql: 'DELETE FROM users WHERE username = ?',
      args: [username]
    });

    // Insert admin user
    await remoteClient.execute({
      sql: `INSERT INTO users (id, username, password_hash, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [userId, username, passwordHash, '대표자', 'admin']
    });

    console.log('[ADMIN] ✅ 관리자 계정 생성 완료!');
    console.log('[ADMIN] 📋 아이디:', username);
    console.log('[ADMIN] 🔑 비밀번호:', password);
    console.log('[ADMIN] 👑 역할: admin');

    // Verify
    const result = await remoteClient.execute({
      sql: 'SELECT id, username, name, role FROM users WHERE username = ?',
      args: [username]
    });

    if (result.rows.length > 0) {
      console.log('\n[ADMIN] 🔍 검증 결과:', result.rows[0]);
      console.log('\n[ADMIN] 🎉 이제 https://factory.brownstreet.co.kr/login 에서 로그인하세요!');
    }

  } catch (error) {
    console.error('[ADMIN] ❌ 오류:', error);
    console.error('[ADMIN] 상세:', error.message);
  }
}

insertAdmin();
