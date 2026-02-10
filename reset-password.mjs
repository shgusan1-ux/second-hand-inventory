import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const remoteClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function resetPassword() {
  try {
    const username = '01033081114';
    const newPassword = 'zmffldkd1*';

    console.log('[RESET] 🔐 비밀번호 재설정 중...');
    console.log(`[RESET] 계정: ${username}`);
    console.log(`[RESET] 새 비밀번호: ${newPassword}`);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('[RESET] ✅ 해시 생성 완료');

    // Update password
    await remoteClient.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE username = ?',
      args: [passwordHash, username]
    });

    console.log('[RESET] ✅ 비밀번호 업데이트 완료!');

    // Verify
    const result = await remoteClient.execute({
      sql: 'SELECT id, username, name, role FROM users WHERE username = ?',
      args: [username]
    });

    console.log('[RESET] 🔍 계정 정보:', result.rows[0]);
    console.log('\n[RESET] 🎉 이제 로그인하세요!');
    console.log(`[RESET] URL: https://factory.brownstreet.co.kr/login`);
    console.log(`[RESET] 아이디: ${username}`);
    console.log(`[RESET] 비밀번호: ${newPassword}`);

  } catch (error) {
    console.error('[RESET] ❌ 오류:', error.message);
  }
}

resetPassword();
