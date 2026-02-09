const { db } = require('@vercel/postgres');

async function setupSchema() {
    const client = await db.connect();
    console.log('Ensuring database schema exists...');

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_overrides (
                id TEXT PRIMARY KEY,
                override_date TIMESTAMP WITH TIME ZONE,
                internal_category TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table product_overrides is ready.');
    } catch (e) {
        console.error('Schema setup failed:', e);
    } finally {
        client.release();
    }
}

setupSchema();
