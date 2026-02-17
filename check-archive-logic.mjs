import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function check() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        // lifecycle calculation logic from lifecycle.ts
        const STAGE_NEW_DAYS = 30;
        const STAGE_CURATED_DAYS = 60;
        const STAGE_ARCHIVE_DAYS = 120;

        const products = await client.execute(`
            SELECT 
                n.origin_product_no, 
                n.name, 
                n.reg_date,
                p.override_date,
                p.internal_category
            FROM naver_products n
            LEFT JOIN product_overrides p ON n.origin_product_no = p.id
            WHERE n.status_type IN ('SALE', 'OUTOFSTOCK', 'SUSPENSION')
        `);

        let archiveUnassigned = 0;
        const today = new Date();

        for (const row of products.rows) {
            const baseDateStr = row.override_date || row.reg_date || today.toISOString();
            const baseDate = new Date(baseDateStr);
            const diffDays = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

            let stage = 'NEW';
            if (diffDays >= STAGE_ARCHIVE_DAYS) stage = 'ARCHIVE';
            else if (diffDays >= STAGE_CURATED_DAYS) stage = 'CURATED';
            else if (diffDays >= STAGE_NEW_DAYS) stage = 'NEW';

            const internalCategory = row.internal_category;
            const isAssigned = [
                'MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE',
                'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE'
            ].includes(internalCategory);

            if (stage === 'ARCHIVE' && !isAssigned) {
                archiveUnassigned++;
                // console.log(`Unassigned Archive: ${row.name} (${diffDays} days)`);
            }
        }

        console.log('Archive Unassigned Count:', archiveUnassigned);
    } catch (e) {
        console.error(e);
    }
}

check();
