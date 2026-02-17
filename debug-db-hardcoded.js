const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

// Hardcode the Turso URL seen in previous steps if not in env
const DB_URL = process.env.TURSO_DATABASE_URL || "libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io";
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA";

const db = createClient({
    url: DB_URL,
    authToken: DB_TOKEN,
});

async function main() {
    try {
        console.log("Checking Logs in DB...");
        // Check for 'CLEARANCE' or the ID
        const targetId = '09f56197c74b4969ac44a18a7b5f8fb1';

        console.log(`\nQuerying for target_category = 'CLEARANCE' or ID ${targetId}`);
        const res = await db.execute({
            sql: "SELECT product_no, product_name, target_category, status, created_at FROM exhibition_sync_logs WHERE (target_category = 'CLEARANCE' OR target_category = ?) AND status = 'SUCCESS' ORDER BY created_at DESC LIMIT 20",
            args: [targetId]
        });

        console.log("Found:", res.rows.length);
        res.rows.forEach(r => {
            console.log(`[${r.created_at}] ${r.product_no} - ${r.product_name} (${r.target_category})`);
        });

    } catch (e) {
        console.error("DB Error:", e);
    }
}
main();
