
import { db } from '../src/lib/db';

async function verifyDashboardTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS dashboard_tasks (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP
            )
        `);
        console.log('Dashboard tasks table verified');
    } catch (e) {
        console.error('Failed to init dashboard table', e);
    }
}

verifyDashboardTable();
