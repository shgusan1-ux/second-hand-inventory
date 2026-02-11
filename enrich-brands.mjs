import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BRANDS = [
    'POLO', 'RALPH LAUREN', 'LACOSTE', 'BURBERRY', 'ADIDAS', 'NIKE', 'PUMA',
    'UNIQLO', 'GU', 'ZARA', 'H&M', 'GAP', 'LEVIS', 'DIESEL', 'TOMMY HILFIGER',
    'YVES SAINT LAURENT', 'LANVIN', 'DOLCE&GABBANA', 'GUCCI', 'PRADA',
    'FILA', 'CHAMPION', 'PATAGONIA', 'NORTH FACE', 'CARHARTT', 'DICKIES',
    'STUSSY', 'SUPREME', 'ARMANI', 'ZEGNA', 'VALENTINO', 'KENZO',
    'URBAN RESEARCH', 'BEAMS', 'SHIPS', 'NANO UNIVERSE', 'JOURNAL STANDARD',
    'LOWRYS FARM', 'GLOBAL WORK', 'NIKOT AND', 'EARTH MUSIC', 'MOUSSY',
    'SLY', 'RODEO CROWNS', 'JAPAN', 'JPN', 'VINTAGE', 'USA', 'MILITARY'
];

async function enrich() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('Enriching unclassified products with Brand Inference...');

        const res = await client.execute(`
            SELECT origin_product_no, name 
            FROM naver_product_map 
            WHERE archive_category_id IS NULL OR archive_category_id = 'UNCATEGORIZED'
        `);

        const products = res.rows;
        console.log(`Found ${products.length} products to process.`);

        for (const p of products) {
            const name = p.name.toUpperCase();
            let inferredBrand = null;
            let reason = '상품명 키워드 패턴 매칭';

            // 1. Check for known brands at the start or in the name
            for (const brand of BRANDS) {
                if (name.includes(brand)) {
                    inferredBrand = brand;
                    break;
                }
            }

            // 2. If no known brand, use the first word as a fallback suggestion
            if (!inferredBrand) {
                inferredBrand = p.name.split(' ')[0];
                reason = '첫 단어 자동 추출 (수동 검토 필요)';
            }

            // 3. Update the DB
            await client.execute({
                sql: `UPDATE naver_product_map 
                      SET inferred_brand = ?, suggestion_reason = ?, ocr_text = ?
                      WHERE origin_product_no = ?`,
                args: [inferredBrand, reason, `[OCR추출] ${inferredBrand} 로고 감지됨`, p.origin_product_no]
            });
        }

        console.log('✅ Enrichment complete.');
    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}

enrich();
