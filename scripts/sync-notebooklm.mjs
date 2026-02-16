import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const OUTPUT_FILE = 'NOTEBOOK_LM_BRAIN.md';
const DOCS_DIR = 'docs';
const REPORTS_DIR = '결과보고';
const DB_URL = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

async function sync() {
    console.log('🚀 Starting NotebookLM Synchronization...');

    let content = `# 🧠 Second-Hand Inventory & MD-SOGAE Knowledge Base\n\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n\n`;
    content += `--- \n\n`;

    // 1. Add PRD & README
    console.log('📄 Adding Core Documents...');
    const coreFiles = ['PRD.md', 'README.md', 'BACKUP_GUIDE.md'];
    for (const file of coreFiles) {
        if (fs.existsSync(file)) {
            content += `## 📑 CORE: ${file}\n\n`;
            content += fs.readFileSync(file, 'utf8') + '\n\n';
            content += `--- \n\n`;
        }
    }

    // 2. Add Documentation from docs/
    console.log('📚 Adding Documentation from docs/...');
    if (fs.existsSync(DOCS_DIR)) {
        const docs = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
        for (const doc of docs) {
            content += `## 📖 DOC: ${doc}\n\n`;
            content += fs.readFileSync(path.join(DOCS_DIR, doc), 'utf8') + '\n\n';
            content += `--- \n\n`;
        }
    }

    // 3. Add Reports from 결과보고/
    console.log('📊 Adding Reports from 결과보고/...');
    if (fs.existsSync(REPORTS_DIR)) {
        const reports = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
        for (const report of reports) {
            content += `## 📝 REPORT: ${report}\n\n`;
            content += fs.readFileSync(path.join(REPORTS_DIR, report), 'utf8') + '\n\n';
            content += `--- \n\n`;
        }
    }

    // 4. Add Knowledge Base Articles from Database
    console.log('🧠 Fetching Knowledge Base from Database...');
    try {
        const client = createClient({ url: DB_URL, authToken: DB_TOKEN });

        // Fetch Categories
        const catRes = await client.execute('SELECT * FROM kb_categories ORDER BY order_index ASC');
        const categories = catRes.rows;

        for (const cat of categories) {
            content += `## 🗂️ KB CATEGORY: ${cat.name}\n`;
            content += `${cat.description || ''}\n\n`;

            const artRes = await client.execute('SELECT * FROM kb_articles WHERE category_id = ? ORDER BY created_at DESC', [cat.id]);
            const articles = artRes.rows;

            for (const art of articles) {
                content += `### 📄 ARTICLE: ${art.title}\n`;
                content += `Created: ${art.created_at}\n\n`;
                content += art.content + '\n\n';
            }
            content += `--- \n\n`;
        }
    } catch (err) {
        console.warn('⚠️ Could not fetch KB from database. Skipping DB sync.', err.message);
    }

    // 5. Add Important Script Snippets
    console.log('💻 Adding Key Script Logic Summaries...');
    const libFiles = ['md-sogae.ts', 'ai-archive-engine.ts', 'kb-actions.ts'];
    for (const file of libFiles) {
        const fullPath = path.join('src/lib', file);
        if (fs.existsSync(fullPath)) {
            content += `## 🛠️ LOGIC: ${file}\n\n`;
            content += '```typescript\n';
            // Only take the first 200 lines to avoid blowing up the context too much
            const fileLines = fs.readFileSync(fullPath, 'utf8').split('\n');
            content += fileLines.slice(0, 300).join('\n') + '\n';
            if (fileLines.length > 300) content += '// ... (truncated)\n';
            content += '```\n\n';
            content += `--- \n\n`;
        }
    }

    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`✅ Synchronization Complete! File saved to: ${OUTPUT_FILE}`);
}

sync().catch(console.error);
