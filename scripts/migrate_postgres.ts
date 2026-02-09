import { db } from '../src/lib/db';

async function migrate() {
    console.log('🚀 Starting Postgres Migration...');

    try {
        // 1. system_settings table
        console.log('Creating system_settings table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. products table extensions (archive columns)
        console.log('Extensions to products table...');
        try {
            await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS archive TEXT DEFAULT 'NEW'`);
            await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS archive_locked BOOLEAN DEFAULT FALSE`);
        } catch (e) {
            console.log('Note: archive columns might already exist.');
        }

        // 3. Seed initial config if empty
        const configCheck = await db.query("SELECT key FROM system_settings WHERE key = 'smartstore_config'");
        if (configCheck.rows.length === 0) {
            console.log('Seeding default smartstore_config...');
            const defaultConfig = {
                sellerId: 'ncp_1p4o0e_01',
                clientId: '',
                clientSecret: ''
            };
            await db.query(
                "INSERT INTO system_settings (key, value) VALUES ('smartstore_config', $1)",
                [JSON.stringify(defaultConfig)]
            );
        }

        console.log('✅ Migration completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
