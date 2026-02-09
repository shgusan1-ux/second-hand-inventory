import { db } from '../src/lib/db';

async function migrate() {
    console.log('🚀 Ensuring system_settings table with JSONB...');

    try {
        // Create table with JSONB if possible (Postgres support)
        // If it's SQLite, it will fallback to TEXT in the DB adapter logic or we handle it here.
        // But the requirement is specifically for Postgres production.

        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ table system_settings is ready.');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        // Fallback for environments where JSONB is not supported (like local SQLite)
        if (error.message.includes('JSONB')) {
            console.log('Falling back to TEXT for local compatibility...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(50) PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } else {
            process.exit(1);
        }
    }
}

migrate();
