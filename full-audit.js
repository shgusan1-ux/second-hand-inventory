/**
 * 전체 상품 정밀 검사 스크립트
 * 실행: node full-audit.js
 */
const { createClient } = require('@libsql/client');
const client = createClient({
    url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});

function printTable(title, rows) {
    console.log('');
    console.log('='.repeat(72));
    console.log('  ' + title);
    console.log('='.repeat(72));
    if (!rows || rows.length === 0) { console.log('  (데이터 없음)'); return; }
    const keys = Object.keys(rows[0]);
    const widths = keys.map(k => {
        const maxD = Math.max(...rows.map(r => String(r[k] != null ? r[k] : '').length));
        return Math.max(k.length, maxD, 4);
    });
    console.log('  ' + keys.map((k,i) => k.padEnd(widths[i])).join(' | '));
    console.log('  ' + widths.map(w => '-'.repeat(w)).join('-+-'));
    rows.forEach(row => {
        const line = keys.map((k,i) => {
            const v = String(row[k] != null ? row[k] : '');
            if (!isNaN(Number(v)) && v !== '') return v.padStart(widths[i]);
            return v.padEnd(widths[i]);
        }).join(' | ');
        console.log('  ' + line);
    });
}

function printSummary(title, items) {
    console.log('');
    console.log('='.repeat(72));
    console.log('  ' + title);
    console.log('='.repeat(72));
    const maxL = Math.max(...items.map(x => x[0].length), 10);
    items.forEach(([label, value]) => {
        const v = typeof value === 'number' ? value.toLocaleString() : String(value);
        console.log('  ' + label.padEnd(maxL) + '  :  ' + v);
    });
}

async function q(sql) { return (await client.execute(sql)).rows; }
async function qVal(sql) {
    const r = await client.execute(sql);
    return r.rows[0] ? Object.values(r.rows[0])[0] : 0;
}

async function run() {
    console.log('');
    console.log('+======================================================================+');
    console.log('|              전체 상품 정밀 검사 리포트                               |');
    console.log('|              실행일: ' + new Date().toLocaleString('ko-KR') + '                     |');
    console.log('+======================================================================+');

    const totalProducts = await qVal('SELECT COUNT(*) FROM products');
    const totalSupplier = await qVal('SELECT COUNT(*) FROM supplier_products');
    const totalCategories = await qVal('SELECT COUNT(*) FROM categories');

    printSummary('기본 통계', [
        ['products 전체 수', totalProducts],
        ['supplier_products 전체 수', totalSupplier],
        ['categories 전체 수', totalCategories],
    ]);

    // === 1. 이미지 검사 ===
    const imgEmpty = await qVal("SELECT COUNT(*) FROM products WHERE images IS NULL OR images = '' OR images = '[]'");
    const imgHas = totalProducts - imgEmpty;
    const supImgEmpty = await qVal("SELECT COUNT(*) FROM supplier_products WHERE image_urls IS NULL OR image_urls = '' OR image_urls = '[]'");
    const supImgHas = totalSupplier - supImgEmpty;
    const noImgButSupHas = await qVal("SELECT COUNT(*) FROM products p JOIN supplier_products sp ON p.id = sp.product_code WHERE (p.images IS NULL OR p.images = '' OR p.images = '[]') AND sp.image_urls IS NOT NULL AND sp.image_urls != '' AND sp.image_urls != '[]'");
    const labelImageTotal = await qVal("SELECT COUNT(*) FROM supplier_products WHERE label_image IS NOT NULL AND label_image != ''");
    const labelImageAiCompleted = await qVal("SELECT COUNT(*) FROM supplier_products sp JOIN products p ON sp.product_code = p.id WHERE sp.label_image IS NOT NULL AND sp.label_image != '' AND p.ai_completed = 1");

    printSummary('1. 이미지 검사', [
        ['products 이미지 있음', imgHas],
        ['products 이미지 없음', imgEmpty],
        ['supplier 이미지 있음', supImgHas],
        ['supplier 이미지 없음', supImgEmpty],
        ['products 이미지없음 + supplier 있음 (보완가능)', noImgButSupHas],
        ['label_image 있는 supplier 전체', labelImageTotal],
        ['label_image 있는 + ai_completed=1', labelImageAiCompleted],
    ]);

    // === 2. 카테고리 검사 ===
    const catMatched = await qVal('SELECT COUNT(*) FROM products p WHERE EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category)');
    const catUnmatched = totalProducts - catMatched;
    const unmatchedCatList = await q('SELECT p.category AS cat_value, COUNT(*) AS cnt FROM products p WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category) GROUP BY p.category ORDER BY COUNT(*) DESC LIMIT 30');
    const aiCatUnmatched = await qVal('SELECT COUNT(*) FROM products p WHERE p.ai_completed = 1 AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category)');
    const catDistribution = await q('SELECT c.classification AS cls, c.name AS category, COUNT(p.id) AS cnt FROM products p JOIN categories c ON c.id = p.category GROUP BY c.classification, c.name ORDER BY c.classification, COUNT(p.id) DESC');

    printSummary('2. 카테고리 검사', [
        ['카테고리 매칭됨', catMatched],
        ['카테고리 매칭 안 됨', catUnmatched],
        ['ai_completed=1 중 카테고리 매칭 안 됨', aiCatUnmatched],
    ]);
    if (unmatchedCatList.length > 0) printTable('2-1. 매칭 안 되는 카테고리 값 목록', unmatchedCatList);
    if (catDistribution.length > 0) printTable('2-2. 카테고리별 상품 수 분포', catDistribution);

    // === 3. AI 완료 상태 검사 ===
    const aiTotal = await qVal('SELECT COUNT(*) FROM products WHERE ai_completed = 1');
    const aiNotCompleted = totalProducts - aiTotal;
    const aiWithLabel = await qVal("SELECT COUNT(*) FROM products p JOIN supplier_products sp ON sp.product_code = p.id WHERE p.ai_completed = 1 AND sp.label_image IS NOT NULL AND sp.label_image != ''");
    const aiBadFabric = await qVal("SELECT COUNT(*) FROM products WHERE ai_completed = 1 AND (fabric IS NULL OR fabric = '' OR fabric = '확인불가')");
    const aiNoComment = await qVal("SELECT COUNT(*) FROM products WHERE ai_completed = 1 AND (md_comment IS NULL OR md_comment = '')");
    const aiNoBrand = await qVal("SELECT COUNT(*) FROM products WHERE ai_completed = 1 AND (brand IS NULL OR brand = '')");

    printSummary('3. AI 완료 상태 검사', [
        ['ai_completed = 1 (완료)', aiTotal],
        ['ai_completed != 1 (미완료)', aiNotCompleted],
        ['ai_completed=1 + label_image 있음', aiWithLabel],
        ['ai_completed=1 + fabric 확인불가/빈값', aiBadFabric],
        ['ai_completed=1 + md_comment 빈값', aiNoComment],
        ['ai_completed=1 + brand 빈값', aiNoBrand],
    ]);

    // === 4. 실측 데이터 검사 ===
    const mCols = ['shoulder','chest','length1','length2','waist','thigh','hem','rise','hip','arm_length','acc_height','acc_width','bag_width','bag_depth','bag_height','hat_circumference','hat_depth','hat_brim','shoe_length','shoe_ankle','shoe_width','shoe_heel'];
    const anyM = mCols.map(c => c + ' IS NOT NULL AND ' + c + ' > 0').join(' OR ');
    const allMNull = mCols.map(c => '(sp.' + c + ' IS NULL OR sp.' + c + ' = 0)').join(' AND ');
    const supWithMeasure = await qVal('SELECT COUNT(*) FROM supplier_products WHERE ' + anyM);
    const supWithoutMeasure = totalSupplier - supWithMeasure;
    const matchedCount = await qVal('SELECT COUNT(*) FROM products p WHERE EXISTS (SELECT 1 FROM supplier_products sp WHERE sp.product_code = p.id)');
    const unmatchedProducts = totalProducts - matchedCount;
    const matchedNoMeasure = await qVal('SELECT COUNT(*) FROM products p JOIN supplier_products sp ON sp.product_code = p.id WHERE ' + allMNull);

    const measureStats = [];
    for (const col of mCols) {
        const cnt = await qVal('SELECT COUNT(*) FROM supplier_products WHERE ' + col + ' IS NOT NULL AND ' + col + ' > 0');
        if (cnt > 0) measureStats.push({ col: col, count: cnt });
    }

    printSummary('4. 실측 데이터 검사', [
        ['supplier 실측 데이터 있음 (1개 이상)', supWithMeasure],
        ['supplier 실측 데이터 없음', supWithoutMeasure],
        ['products-supplier 매칭 수', matchedCount],
        ['products에서 supplier 매칭 안 됨', unmatchedProducts],
        ['매칭됨 + 실측 데이터 전무', matchedNoMeasure],
    ]);
    if (measureStats.length > 0) printTable('4-1. 실측 컬럼별 데이터 보유 현황', measureStats);

    // === 5. 가격 검사 ===
    const priceSellZero = await qVal('SELECT COUNT(*) FROM products WHERE price_sell IS NULL OR price_sell = 0');
    const priceConsZero = await qVal('SELECT COUNT(*) FROM products WHERE price_consumer IS NULL OR price_consumer = 0');
    const priceAbnormal = await qVal('SELECT COUNT(*) FROM products WHERE price_sell > 0 AND price_consumer > 0 AND price_sell > price_consumer');
    const priceRanges = await q("SELECT CASE WHEN price_sell IS NULL OR price_sell = 0 THEN '가격없음' WHEN price_sell < 10000 THEN '1만원 미만' WHEN price_sell < 30000 THEN '1~3만원' WHEN price_sell < 50000 THEN '3~5만원' WHEN price_sell < 100000 THEN '5~10만원' WHEN price_sell < 300000 THEN '10~30만원' ELSE '30만원 이상' END AS price_range, COUNT(*) AS cnt FROM products GROUP BY 1 ORDER BY MIN(COALESCE(price_sell, 0))");

    printSummary('5. 가격 검사', [
        ['price_sell = 0 또는 NULL', priceSellZero],
        ['price_consumer = 0 또는 NULL', priceConsZero],
        ['price_sell > price_consumer (비정상)', priceAbnormal],
    ]);
    if (priceRanges.length > 0) printTable('5-1. 판매가(price_sell) 분포', priceRanges);
    if (priceAbnormal > 0) {
        const abSamples = await q('SELECT id, name, price_sell, price_consumer FROM products WHERE price_sell > 0 AND price_consumer > 0 AND price_sell > price_consumer LIMIT 10');
        printTable('5-2. price_sell > price_consumer 비정상 샘플 (최대10건)', abSamples);
    }

    // === 6. 버그 가능성 검사 ===
    const nameEmpty = await qVal("SELECT COUNT(*) FROM products WHERE name IS NULL OR TRIM(name) = ''");
    const statusDist = await q("SELECT COALESCE(status, '(NULL)') AS status_val, COUNT(*) AS cnt FROM products GROUP BY status ORDER BY COUNT(*) DESC");
    const conditionDist = await q("SELECT COALESCE(condition, '(NULL)') AS cond_val, COUNT(*) AS cnt FROM products GROUP BY condition ORDER BY COUNT(*) DESC");
    const noSupplierMatch = await qVal('SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM supplier_products sp WHERE sp.product_code = p.id)');
    const noProductMatch = await qVal('SELECT COUNT(*) FROM supplier_products sp WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = sp.product_code)');
    const dupProducts = await qVal('SELECT COUNT(*) FROM (SELECT id, COUNT(*) as cnt FROM products GROUP BY id HAVING cnt > 1)');
    const dupSupplier = await qVal('SELECT COUNT(*) FROM (SELECT product_code, COUNT(*) as cnt FROM supplier_products GROUP BY product_code HAVING cnt > 1)');

    printSummary('6. 버그 가능성 검사', [
        ['products.name 빈값', nameEmpty],
        ['products에서 supplier 매칭 안 됨', noSupplierMatch],
        ['supplier에서 products 매칭 안 됨', noProductMatch],
        ['products 중복 ID', dupProducts],
        ['supplier_products 중복 product_code', dupSupplier],
    ]);
    printTable('6-1. status별 분포', statusDist);
    printTable('6-2. condition별 분포', conditionDist);
    if (nameEmpty > 0) {
        const emptyNames = await q("SELECT id, brand, category, status FROM products WHERE name IS NULL OR TRIM(name) = '' LIMIT 10");
        printTable('6-3. name 빈값 상품 샘플 (최대10건)', emptyNames);
    }

    // === 종합 요약 ===
    console.log('');
    console.log('');
    console.log('+======================================================================+');
    console.log('|                         종합 요약                                    |');
    console.log('+======================================================================+');
    const issues = [];
    if (imgEmpty > 0) issues.push('[이미지] products 이미지 없음: ' + imgEmpty + '건');
    if (noImgButSupHas > 0) issues.push('[이미지] supplier에서 보완 가능: ' + noImgButSupHas + '건');
    if (catUnmatched > 0) issues.push('[카테고리] 매칭 안 됨: ' + catUnmatched + '건');
    if (aiCatUnmatched > 0) issues.push('[카테고리] AI완료 중 매칭 안 됨: ' + aiCatUnmatched + '건');
    if (aiBadFabric > 0) issues.push('[AI] fabric 확인불가/빈값: ' + aiBadFabric + '건');
    if (aiNoComment > 0) issues.push('[AI] md_comment 빈값: ' + aiNoComment + '건');
    if (aiNoBrand > 0) issues.push('[AI] brand 빈값: ' + aiNoBrand + '건');
    if (matchedNoMeasure > 0) issues.push('[실측] 매칭됨+실측 전무: ' + matchedNoMeasure + '건');
    if (priceSellZero > 0) issues.push('[가격] 판매가 0/NULL: ' + priceSellZero + '건');
    if (priceAbnormal > 0) issues.push('[가격] 판매가 > 소비자가: ' + priceAbnormal + '건');
    if (nameEmpty > 0) issues.push('[버그] 이름 빈값: ' + nameEmpty + '건');
    if (noSupplierMatch > 0) issues.push('[버그] supplier 매칭 안 됨: ' + noSupplierMatch + '건');
    if (dupProducts > 0) issues.push('[버그] 중복 product ID: ' + dupProducts + '건');
    if (dupSupplier > 0) issues.push('[버그] 중복 supplier product_code: ' + dupSupplier + '건');

    if (issues.length === 0) {
        console.log('  모든 검사 항목 정상!');
    } else {
        console.log('  발견된 이슈: 총 ' + issues.length + '건');
        console.log('+----------------------------------------------------------------------+');
        issues.forEach((issue, i) => {
            console.log('  ' + String(i + 1).padStart(2) + '. ' + issue);
        });
    }
    console.log('+======================================================================+');
    console.log('');
}

run().catch(err => { console.error('오류:', err); process.exit(1); });
