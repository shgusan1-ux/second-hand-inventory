import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;

async function getToken() {
    const res = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: 'unused' })
    });
    return (await res.json()).access_token;
}

async function search(token, page, size, filters = {}) {
    const res = await fetch(`${PROXY_URL}/v1/products/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, size, ...filters })
    });
    return res.json();
}

async function run() {
    const token = await getToken();
    const STATUS_FILTER = ['SALE', 'OUTOFSTOCK', 'SUSPENSION'];

    console.log('=== 수정된 로직 시뮬레이션 (1-based) ===');

    // 수정된 코드와 동일: page 1부터 시작
    const firstPage = await search(token, 1, 100, { productStatusTypes: STATUS_FILTER });
    const totalElements = firstPage.totalElements || 0;
    const totalPages = firstPage.totalPages || Math.ceil(totalElements / 100);

    console.log(`firstPage(page=1): ${firstPage.contents?.length}개, totalElements=${totalElements}, totalPages=${totalPages}`);

    let allContents = [...(firstPage.contents || [])];

    // 수정된 코드와 동일: page 2 ~ totalPages
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    console.log(`remaining pages: [${remainingPages.join(', ')}]`);

    for (const p of remainingPages) {
        const result = await search(token, p, 100, { productStatusTypes: STATUS_FILTER });
        const count = result.contents?.length || 0;
        console.log(`  page ${p}: ${count}개`);
        if (result.contents) allContents = allContents.concat(result.contents);
    }

    console.log(`\n수집 총량 (중복 포함): ${allContents.length}개`);

    // 중복 제거 (deduplicateContents와 동일)
    const seen = new Set();
    const deduped = allContents.filter(p => {
        const id = p.originProductNo?.toString();
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    console.log(`중복 제거 후: ${deduped.length}개`);

    // channelProducts 필터 (processProducts와 동일)
    const processed = deduped.filter(p => p.channelProducts?.[0]);
    console.log(`processProducts 후: ${processed.length}개`);

    // 상태별 카운트
    const counts = { SALE: 0, OUTOFSTOCK: 0, SUSPENSION: 0 };
    processed.forEach(p => {
        const status = p.channelProducts[0].statusType;
        if (counts[status] !== undefined) counts[status]++;
    });
    console.log(`\n상태별: SALE=${counts.SALE}, OUTOFSTOCK=${counts.OUTOFSTOCK}, SUSPENSION=${counts.SUSPENSION}`);
    console.log(`합계: ${counts.SALE + counts.OUTOFSTOCK + counts.SUSPENSION}`);

    console.log(`\n✅ 최종 결과: ${processed.length}개 (목표: ${totalElements}개)`);
    if (processed.length === totalElements) {
        console.log('🎉 완벽! 모든 상품 수집 성공!');
    } else {
        console.log(`⚠️ 차이: ${totalElements - processed.length}개 누락`);
    }
}

run().catch(console.error);
