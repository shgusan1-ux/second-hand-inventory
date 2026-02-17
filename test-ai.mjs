import { classifyForArchive } from './src/lib/ai-archive-engine.ts';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.production' }); // Use pro key for testing

async function test() {
    const title = "GAP 갭 아카이브 에센셜 헤비 코튼 후디드 스웨트셔츠 WOMAN-S";
    console.log('Testing Title:', title);

    try {
        const result = await classifyForArchive({
            id: 'test',
            name: title,
        });
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
