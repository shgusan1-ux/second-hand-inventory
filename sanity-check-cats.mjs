
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function checkSync() {
    const client = createClient({ url: `file:${dbPath}` });

    // 1. Get all category IDs from settings
    const settingsRows = await client.execute("SELECT category_id FROM archive_category_settings");
    const settingsIds = settingsRows.rows.map(r => r.category_id as string);

    // 2. Check product_overrides for any categories NOT in the set
    const overrideCats = await client.execute("SELECT DISTINCT internal_category FROM product_overrides");
    const categoriesInOverrides = overrideCats.rows.map(r => r.internal_category as string);

    console.log('Categories in settings:', settingsIds);
    console.log('Categories in overrides:', categoriesInOverrides);

    const missingInSettings = categoriesInOverrides.filter(cat => cat && !settingsIds.includes(cat) && !['NEW', 'CURATED', 'ARCHIVE', 'CLEARANCE', 'KIDS'].includes(cat));

    if (missingInSettings.length > 0) {
        console.warn('⚠️ Found categories in overrides that are NOT in settings or core list:', missingInSettings);
    }

    // 3. Check for any products that have NO internal_category
    const noCat = await client.execute("SELECT COUNT(*) as cnt FROM product_overrides WHERE internal_category IS NULL OR internal_category = ''");
    console.log('Products with NO category in overrides:', noCat.rows[0].cnt);
}

checkSync();
