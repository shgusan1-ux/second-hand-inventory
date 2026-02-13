require('dotenv').config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';

(async () => {
    const tokenRes = await fetch(PROXY_URL + '/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) { console.log('Token error:', tokenData); return; }
    const token = tokenData.access_token;

    // 1) 첫 5개 상품 구조 확인
    const r = await fetch(PROXY_URL + '/v1/products/search', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({ page: 1, size: 5 })
    });
    const d = await r.json();

    if (d.contents && d.contents[0]) {
        const p = d.contents[0];
        console.log('=== Parent Product keys ===');
        console.log(Object.keys(p).join(', '));
        console.log('sellerManagementCode (parent):', JSON.stringify(p.sellerManagementCode));

        const cp = p.channelProducts && p.channelProducts[0];
        if (cp) {
            console.log('\n=== ChannelProduct keys ===');
            console.log(Object.keys(cp).join(', '));
            console.log('sellerManagementCode (cp):', JSON.stringify(cp.sellerManagementCode));
            console.log('name:', cp.name);
        }
    }

    // 2) DOLCE 찾기
    let page = 1;
    let found = false;
    while (!found && page <= 15) {
        const r2 = await fetch(PROXY_URL + '/v1/products/search', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                'x-proxy-key': PROXY_KEY
            },
            body: JSON.stringify({ page: page, size: 100 })
        });
        const d2 = await r2.json();
        if (!d2.contents || d2.contents.length === 0) break;

        for (const p of d2.contents) {
            const cp = p.channelProducts && p.channelProducts[0];
            if (cp && cp.name && cp.name.includes('DOLCE')) {
                console.log('\n=== DOLCE product ===');
                console.log('name:', cp.name);
                console.log('originProductNo:', p.originProductNo);
                console.log('sellerManagementCode (cp):', JSON.stringify(cp.sellerManagementCode));
                console.log('sellerManagementCode (p):', JSON.stringify(p.sellerManagementCode));
                found = true;
                break;
            }
        }
        page++;
    }
    if (!found) console.log('\nDOLCE not found in first', (page - 1) * 100, 'products');
})();
