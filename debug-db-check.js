const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
    try {
        console.log("Checking Logs in DB...");
        const res = await db.execute("SELECT * FROM exhibition_sync_logs LIMIT 5");
        console.log("Logs Count:", res.rows.length);
        if (res.rows.length > 0) console.log(res.rows[0]);

        console.log("\nChecking CLEARANCE Logs...");
        const clearRes = await db.execute("SELECT product_no, product_name, created_at FROM exhibition_sync_logs WHERE target_category = 'CLEARANCE' AND status = 'SUCCESS' ORDER BY created_at DESC LIMIT 5");
        console.log("Found:", clearRes.rows);
    } catch (e) {
        console.error("DB Error:", e);
    }
}
main();
