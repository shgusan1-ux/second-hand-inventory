import { db } from '../src/lib/db';

async function checkSchema() {
  try {
    const result = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products'
    `);
    console.log('Columns in products table:', result.rows.map((r: any) => r.column_name));

    // Also check categories for classification added earlier
    const catResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
    `);
    console.log('Columns in categories table:', catResult.rows.map((r: any) => r.column_name));
  } catch (err) {
    console.error('Schema check error:', err);
  }
}

checkSchema();
