
import { db } from './src/lib/db.js';

async function checkDistribution() {
    try {
        const res = await db.query('SELECT reg_date FROM naver_products');
        const rows = res.rows;
        console.log(`Total products in DB: ${rows.length}`);

        const now = Date.now();
        const distribution = { NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0 };

        rows.forEach(row => {
            const regDate = row.reg_date;
            if (!regDate) return;
            const d = new Date(regDate);
            const daysSince = Math.floor((now - d.getTime()) / 86400000);

            if (daysSince <= 30) distribution.NEW++;
            else if (daysSince <= 60) distribution.CURATED++;
            else if (daysSince <= 120) distribution.ARCHIVE++;
            else distribution.CLEARANCE++;
        });

        console.log('Current Distribution (30/60/120):', distribution);
    } catch (e) {
        console.error(e);
    }
}

checkDistribution();
