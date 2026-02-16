// 라이프사이클 갱신 스크립트
async function main() {
    console.log('네이버 → 관리자 페이지 전체 동기화 시작...');
    const startTime = Date.now();

    const res = await fetch('https://factory.brownstreet.co.kr/api/smartstore/products?fetchAll=true&refresh=true', {
        headers: { 'Cookie': 'inventory_session=admin' }
    });

    if (res.status !== 200) {
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Error:', text.substring(0, 500));
        return;
    }

    const data = await res.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`동기화 완료! (${elapsed}초)`);

    const products = data.data?.contents || [];
    console.log('총 상품:', products.length);

    // 라이프사이클별 분류
    const stages = {};
    products.forEach(p => {
        const cat = p.internalCategory || 'UNKNOWN';
        stages[cat] = (stages[cat] || 0) + 1;
    });

    let newCount = stages['NEW'] || 0;
    let curatedCount = stages['CURATED'] || 0;
    let archiveTotal = 0;
    let clearanceTotal = 0;

    Object.entries(stages).forEach(([k, v]) => {
        if (k.includes('ARCHIVE')) archiveTotal += v;
        if (k.startsWith('CLEARANCE')) clearanceTotal += v;
    });

    console.log('\n=== 라이프사이클 분포 ===');
    console.log('NEW:', newCount);
    console.log('CURATED:', curatedCount);
    console.log('ARCHIVE (합계):', archiveTotal);
    Object.entries(stages)
        .filter(([k]) => k.includes('ARCHIVE'))
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    console.log('CLEARANCE (합계):', clearanceTotal);
    Object.entries(stages)
        .filter(([k]) => k.startsWith('CLEARANCE'))
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

    // 일별 분포 (등록일 기준)
    const now = new Date();
    const dayBuckets = { '0-7일': 0, '8-14일': 0, '15-30일': 0, '31-60일': 0, '61-90일': 0, '91-120일': 0, '120일+': 0 };
    products.forEach(p => {
        if (!p.regDate) return;
        const days = Math.floor((now.getTime() - new Date(p.regDate).getTime()) / 86400000);
        if (days <= 7) dayBuckets['0-7일']++;
        else if (days <= 14) dayBuckets['8-14일']++;
        else if (days <= 30) dayBuckets['15-30일']++;
        else if (days <= 60) dayBuckets['31-60일']++;
        else if (days <= 90) dayBuckets['61-90일']++;
        else if (days <= 120) dayBuckets['91-120일']++;
        else dayBuckets['120일+']++;
    });

    console.log('\n=== 등록일 기준 분포 ===');
    Object.entries(dayBuckets).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main().catch(e => console.error('Error:', e.message));
