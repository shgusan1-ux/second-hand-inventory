import { db } from './src/lib/db';

async function checkSchema() {
    try {
        const result = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
        const columns = result.rows.map((r: any) => r.column_name);
        console.log('Columns in products table:', columns);

        const missing = [];
        if (!columns.includes('archive')) missing.push("ALTER TABLE products ADD COLUMN archive TEXT DEFAULT 'NEW';");
        if (!columns.includes('archive_locked')) missing.push("ALTER TABLE products ADD COLUMN archive_locked BOOLEAN DEFAULT FALSE;");

        if (missing.length > 0) {
            console.log('Missing columns. Run these:');
            missing.forEach(m => console.log(m));

            for (const m of missing) {
                console.log(`Executing: ${m}`);
                await db.query(m);
            }
            console.log('Migration completed.');
        } else {
            console.log('All required columns exist.');
        }
    } catch (err) {
        console.error('Schema check error:', err);
    }
}

checkSchema();
