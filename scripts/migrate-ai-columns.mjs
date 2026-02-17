// scripts/migrate-ai-columns.mjs
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

console.log(`🚀 Using DB URL: ${url}`);

const db = createClient({
    url,
    authToken,
});

async function migrate() {
    console.log("🚀 product_overrides 테이블 스키마 확장 중...");

    const columns = [
        { name: "ai_price", type: "INTEGER" },
        { name: "optimized_title", type: "TEXT" },
        { name: "ai_description", type: "TEXT" }
    ];

    for (const col of columns) {
        try {
            await db.execute(`ALTER TABLE product_overrides ADD COLUMN ${col.name} ${col.type}`);
            console.log(`✅ ${col.name} 컬럼 추가 완료`);
        } catch (e) {
            console.log(`ℹ️ ${col.name} 컬럼 관련 정보: ${e.message}`);
        }
    }

    console.log("🎉 마이그레이션 완료!");
}

migrate();
