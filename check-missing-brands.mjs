
import { createClient } from '@libsql/client';
import fs from 'fs';

const envProd = fs.readFileSync('.env.production', 'utf8');
const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";

const brandsToCheck = [
    "DOLCE&GABBANA", "URBAN RESEARCH", "YVES SAINT LAURENT", "LANVIN", "UNIQLO", "FILA", "TOMMY HILFIGER",
    "URBANWORKWEAR", "RALPH LAUREN", "POLO RALPH LAUREN", "GAP", "GOLDEN BEAR", "JPN", "LOWRYS FARM",
    "AZUL BY MOUSSY", "HONEYSUCKLE ROSE", "ADIDAS", "AXES FEMME", "WEST WIN", "VIENUS JEAN", "BEAMS T",
    "SUREVE", "MIA", "ZARA", "H&M", "TSCO", "AS KNOW AS PINKY", "AFT JEANS", "H.C.M.II", "MOUSSY",
    "LEVIS PREMIUM", "ADIDAS NEO", "DESIGNWORKS", "NICE CLAUP", "EARTH", "FILA GOLF", "TITLEIST",
    "NAVY", "CONVERSE", "MIRA MESA", "COUTURE BROOCH", "MIZUNO", "NIKE", "AGAIN", "CACHAREL",
    "NIKO AND", "DICKIES", "ERMENEGILDO ZEGNA", "KARLLAGERFELD", "BARNEYS NEWYORK", "MICALADY", "MIXT"
];

async function checkMissing() {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    try {
        const { rows: existing } = await client.execute("SELECT brand_name FROM custom_brands");
        const existingNames = new Set(existing.map(b => b.brand_name.toUpperCase()));

        console.log(`Checking ${brandsToCheck.length} brands from user list...`);
        const missing = brandsToCheck.filter(b => !existingNames.has(b.toUpperCase()));

        console.log(`Found ${missing.length} missing brands:`);
        missing.forEach(b => console.log(`- ${b}`));

        const latest = await client.execute("SELECT brand_name FROM custom_brands ORDER BY id DESC LIMIT 5");
        console.log("\nRecently added brands (including test run):");
        latest.rows.forEach(r => console.log(`- ${r.brand_name}`));

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkMissing();
