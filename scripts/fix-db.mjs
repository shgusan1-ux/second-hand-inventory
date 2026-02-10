
import { sql } from '@vercel/postgres';

async function main() {
    console.log('Starting DB fix script...');
    try {
        console.log('Constructing users table...');
        await sql`
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        console.log('Constructing attendance_logs table...');
        await sql`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        console.log('Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_logs(user_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance_logs(created_at);`;

        console.log('✅ DB Fix completed successfully.');
    } catch (err) {
        console.error('❌ DB Fix failed:');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        console.error('Detail:', err.detail);
        console.error('Full Error:', err);
        process.exit(1);
    }
}

main();
