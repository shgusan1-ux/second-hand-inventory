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

    // 1. 통합 검색 - 모든 상태 한번에
    console.log('=== 통합 검색 (3개 상태 동시) ===');
    const first = await search(token, 0, 100, { productStatusTypes: STATUS_FILTER });
    console.log(`totalElements: ${first.totalElements}, totalPages: ${first.totalPages}`);

    let allContents = [...(first.contents || [])];
    const totalPages = Math.ceil(first.totalElements / 100);

    for (let p = 1; p < Math.min(totalPages + 2, 15); p++) {
        const result = await search(token, p, 100, { productStatusTypes: STATUS_FILTER });
        const count = result.contents?.length || 0;
        console.log(`  page ${p}: ${count}개 (totalElements=${result.totalElements})`);
        if (result.contents) allContents = allContents.concat(result.contents);
        if (count === 0) break;
    }

    console.log(`\n통합 검색 총 수집: ${allContents.length}개`);

    // 중복 체크
    const ids = new Set();
    let noChannel = 0;
    allContents.forEach(p => {
        ids.add(p.originProductNo);
        if (!p.channelProducts?.[0]) noChannel++;
    });
    console.log(`고유 상품: ${ids.size}개`);
    console.log(`channelProducts 없는 상품: ${noChannel}개`);

    // 2. 개별 상태 검색
    console.log('\n=== 개별 상태 검색 ===');
    let totalByStatus = 0;
    const allByStatus = [];

    for (const status of STATUS_FILTER) {
        const res = await search(token, 0, 100, { productStatusTypes: [status] });
        console.log(`${status}: totalElements=${res.totalElements}, page0=${res.contents?.length || 0}개`);
        totalByStatus += res.totalElements;

        let statusContents = [...(res.contents || [])];
        const statusPages = Math.ceil(res.totalElements / 100);

        for (let p = 1; p < Math.min(statusPages + 2, 15); p++) {
            const pageRes = await search(token, p, 100, { productStatusTypes: [status] });
            const count = pageRes.contents?.length || 0;
            if (count > 0) {
                statusContents = statusContents.concat(pageRes.contents);
                console.log(`  ${status} page ${p}: ${count}개`);
            }
            if (count === 0) {
                console.log(`  ${status} page ${p}: 0개 (끝)`);
                break;
            }
        }

        allByStatus.push(...statusContents);
        console.log(`  ${status} 총 수집: ${statusContents.length}개`);
    }

    const idsByStatus = new Set();
    let noChannelByStatus = 0;
    allByStatus.forEach(p => {
        idsByStatus.add(p.originProductNo);
        if (!p.channelProducts?.[0]) noChannelByStatus++;
    });

    console.log(`\n개별 검색 합계: totalElements=${totalByStatus}, 수집=${allByStatus.length}개, 고유=${idsByStatus.size}개`);
    console.log(`channelProducts 없는 상품: ${noChannelByStatus}개`);

    // 3. 차이 분석
    const combined = new Set([...ids, ...idsByStatus]);
    console.log(`\n=== 결과 ===`);
    console.log(`통합 검색: ${ids.size}개`);
    console.log(`개별 검색: ${idsByStatus.size}개`);
    console.log(`합산 고유: ${combined.size}개`);
    console.log(`Naver 보고 totalElements: ${first.totalElements}개`);
}

run().catch(console.error);
