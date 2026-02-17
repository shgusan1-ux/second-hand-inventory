
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function run() {
    const client = createClient({ url: `file:${dbPath}` });
    const res = await client.execute("SELECT * FROM naver_product_map");
    const rows = res.rows;

    const now = Date.now();
    const dist = { NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0 };

    rows.forEach(row => {
        // use both row.reg_date and row.regDate just in case
        const dateStr = row.reg_date || row.regDate;
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        const days = Math.floor((now - d.getTime()) / 86400000);

        if (days <= 30) dist.NEW++;
        else if (days <= 60) dist.CURATED++;
        else if (days <= 120) dist.ARCHIVE++;
        else dist.CLEARANCE++;
    });

    console.log('RESULT:', JSON.stringify(dist));
}

run();
