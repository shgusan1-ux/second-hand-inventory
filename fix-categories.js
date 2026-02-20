const { createClient } = require('@libsql/client');
const client = createClient({
    url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});

async function main() {
    console.log('=== categories 테이블 재생성 (UNIQUE 제약 제거) ===\n');

    // 1. 기존 테이블 삭제 후 UNIQUE 없이 재생성
    await client.execute('DROP TABLE IF EXISTS categories');
    console.log('기존 categories 테이블 삭제');

    await client.execute(`
        CREATE TABLE categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            classification TEXT DEFAULT 'MAN'
        )
    `);
    console.log('categories 테이블 재생성 (name UNIQUE 제거)\n');

    // 2. PlayAuto 카테고리 전체 입력
    const playautoCats = [
        // MAN
        { id: '468234', name: '코트', classification: 'MAN', sort_order: 1 },
        { id: '468241', name: '아우터', classification: 'MAN', sort_order: 2 },
        { id: '468242', name: '사파리', classification: 'MAN', sort_order: 3 },
        { id: '468243', name: '패딩', classification: 'MAN', sort_order: 4 },
        { id: '468244', name: '데님자켓', classification: 'MAN', sort_order: 5 },
        { id: '468247', name: '블레이저', classification: 'MAN', sort_order: 6 },
        { id: '468248', name: '후드집업/후리스', classification: 'MAN', sort_order: 7 },
        { id: '468249', name: '스포츠', classification: 'MAN', sort_order: 8 },
        { id: '468250', name: '니트', classification: 'MAN', sort_order: 9 },
        { id: '468251', name: '가디건', classification: 'MAN', sort_order: 10 },
        { id: '468252', name: '맨투맨', classification: 'MAN', sort_order: 11 },
        { id: '468253', name: '티셔츠', classification: 'MAN', sort_order: 12 },
        { id: '468257', name: '1/2 티셔츠', classification: 'MAN', sort_order: 13 },
        { id: '468258', name: '셔츠', classification: 'MAN', sort_order: 14 },
        { id: '468259', name: '데님셔츠', classification: 'MAN', sort_order: 15 },
        { id: '468263', name: '1/2 셔츠', classification: 'MAN', sort_order: 16 },
        { id: '468264', name: '팬츠', classification: 'MAN', sort_order: 17 },
        { id: '468269', name: '1/2 팬츠', classification: 'MAN', sort_order: 18 },
        { id: '468270', name: '데님팬츠', classification: 'MAN', sort_order: 19 },
        // WOMAN
        { id: '468271', name: '아우터', classification: 'WOMAN', sort_order: 1 },
        { id: '468272', name: '코트', classification: 'WOMAN', sort_order: 2 },
        { id: '468273', name: '셔츠', classification: 'WOMAN', sort_order: 3 },
        { id: '468274', name: '블라우스', classification: 'WOMAN', sort_order: 4 },
        { id: '468275', name: '티셔츠', classification: 'WOMAN', sort_order: 5 },
        { id: '468276', name: '니트/가디건', classification: 'WOMAN', sort_order: 6 },
        { id: '468277', name: '후드/맨투맨', classification: 'WOMAN', sort_order: 7 },
        { id: '468278', name: '원피스', classification: 'WOMAN', sort_order: 8 },
        { id: '468279', name: '스커트', classification: 'WOMAN', sort_order: 9 },
        { id: '468280', name: '팬츠', classification: 'WOMAN', sort_order: 10 },
        { id: '468281', name: '데님팬츠', classification: 'WOMAN', sort_order: 11 },
        { id: '5529082', name: '반팔 티셔츠/블라우스', classification: 'WOMAN', sort_order: 12 },
        { id: '6191122', name: '재킷', classification: 'WOMAN', sort_order: 13 },
        // KIDS
        { id: '468288', name: '아우터', classification: 'KIDS', sort_order: 1 },
        { id: '468289', name: '후드집업/후리스', classification: 'KIDS', sort_order: 2 },
        { id: '468291', name: '니트', classification: 'KIDS', sort_order: 3 },
        { id: '468292', name: '가디건', classification: 'KIDS', sort_order: 4 },
        { id: '468293', name: '맨투맨/후드맨투맨', classification: 'KIDS', sort_order: 5 },
        { id: '468295', name: '티셔츠', classification: 'KIDS', sort_order: 6 },
        { id: '468296', name: '셔츠', classification: 'KIDS', sort_order: 7 },
        { id: '468297', name: '팬츠', classification: 'KIDS', sort_order: 8 },
        { id: '468298', name: '데님팬츠', classification: 'KIDS', sort_order: 9 },
        { id: '468299', name: '원피스', classification: 'KIDS', sort_order: 10 },
        { id: '468300', name: '스커트', classification: 'KIDS', sort_order: 11 },
        { id: '468302', name: '악세사리', classification: 'KIDS', sort_order: 12 },
        // 악세사리
        { id: '468310', name: '넥타이', classification: '악세사리', sort_order: 1 },
        { id: '468311', name: '머플러/스카프/행거치프', classification: '악세사리', sort_order: 2 },
        { id: '468312', name: '가방', classification: '악세사리', sort_order: 3 },
        { id: '468313', name: '모자', classification: '악세사리', sort_order: 4 },
        { id: '468314', name: '양말', classification: '악세사리', sort_order: 5 },
        { id: '468315', name: '타월', classification: '악세사리', sort_order: 6 },
        { id: '468316', name: '신발', classification: '악세사리', sort_order: 7 },
        { id: '468317', name: '벨트 및 기타', classification: '악세사리', sort_order: 8 },
        { id: '5305599', name: '기타시즌잡화', classification: '악세사리', sort_order: 9 },
        { id: '6245766', name: '기타패션소품', classification: '악세사리', sort_order: 10 },
        // 시즌오프
        { id: '6199094', name: '시즌오프 clear', classification: '시즌오프', sort_order: 1 },
    ];

    for (const cat of playautoCats) {
        await client.execute({
            sql: 'INSERT INTO categories (id, name, sort_order, classification) VALUES (?, ?, ?, ?)',
            args: [cat.id, cat.name, cat.sort_order, cat.classification]
        });
    }
    console.log('PlayAuto 카테고리 ' + playautoCats.length + '건 입력 완료\n');

    // 3. 검증
    console.log('=== 검증: 분류별 카테고리 수 ===');
    const verify = await client.execute('SELECT classification, COUNT(*) as cnt FROM categories GROUP BY classification ORDER BY classification');
    verify.rows.forEach(r => {
        console.log('  ' + r.classification + ': ' + r.cnt + '건');
    });

    // 4. 전체 목록 출력
    console.log('\n=== 전체 카테고리 목록 ===');
    const all = await client.execute('SELECT * FROM categories ORDER BY classification, sort_order');
    let lastClass = '';
    all.rows.forEach(r => {
        if (r.classification !== lastClass) {
            console.log('\n  [' + r.classification + ']');
            lastClass = r.classification;
        }
        console.log('    ' + r.id + ' - ' + r.name);
    });

    // 5. 기존 상품 카테고리 매칭 확인
    console.log('\n\n=== 기존 상품 카테고리 매칭 확인 ===');
    const productCats = await client.execute(
        "SELECT p.category, COUNT(*) as cnt, c.name as cat_name, c.classification " +
        "FROM products p " +
        "LEFT JOIN categories c ON p.category = c.id " +
        "WHERE p.category IS NOT NULL AND p.category != '' " +
        "GROUP BY p.category " +
        "ORDER BY cnt DESC"
    );
    let matched = 0, unmatched = 0;
    const unmatchedList = [];
    productCats.rows.forEach(r => {
        if (r.cat_name) {
            matched += Number(r.cnt);
        } else {
            unmatched += Number(r.cnt);
            unmatchedList.push({ category: r.category, cnt: r.cnt });
        }
    });
    console.log('  매칭됨:', matched, '건');
    console.log('  매칭안됨:', unmatched, '건');
    if (unmatchedList.length > 0) {
        console.log('  매칭 안되는 카테고리:');
        unmatchedList.forEach(u => {
            console.log('    "' + u.category + '": ' + u.cnt + '건');
        });
    }

    console.log('\n=== 완료 ===');
}

main().catch(e => console.error('ERROR:', e));
