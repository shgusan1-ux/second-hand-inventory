import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

const ARCHIVE_SUB_CATEGORIES = [
    'MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE',
    'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE',
    'ARCHIVE', 'UNCATEGORIZED',
];

async function check() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const markers = ARCHIVE_SUB_CATEGORIES.map(() => '?').join(',');
        const result = await client.execute({
            sql: `SELECT internal_category, COUNT(*) as cnt
                  FROM product_overrides
                  WHERE internal_category IN (${markers})
                  GROUP BY internal_category
                  ORDER BY cnt DESC`,
            args: ARCHIVE_SUB_CATEGORIES
        });

        const totalResult = await client.execute({
            sql: `SELECT COUNT(*) as cnt FROM product_overrides WHERE internal_category IN (${markers})`,
            args: ARCHIVE_SUB_CATEGORIES
        });

        console.log('Total Archive Items:', totalResult.rows[0].cnt);
        console.log('Categories:', JSON.stringify(result.rows, null, 2));

        // Let's also check if there are any products that ARE NOT in product_overrides but should be (i.e. in naver_product_map)
        // Or if they have NULL category?
        const nullCategory = await client.execute("SELECT COUNT(*) as cnt FROM product_overrides WHERE internal_category IS NULL");
        console.log('Null Category Items:', nullCategory.rows[0].cnt);

    } catch (e) {
        console.error(e);
    }
}

check();
