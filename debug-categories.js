
const { db } = require('./src/lib/db');
require('dotenv').config();

async function check() {
    try {
        const result = await db.query('SELECT internal_category, COUNT(*) as count FROM product_overrides GROUP BY internal_category');
        console.log('Category Distribution:', result.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
