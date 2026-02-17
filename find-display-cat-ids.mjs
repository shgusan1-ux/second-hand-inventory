// SmartStore 공개 페이지/API에서 전시카테고리 정수 ID 추출 시도

const STORE = 'brownstreet';
const BASE = `https://smartstore.naver.com`;

// 알려진 hex ID 목록 (.env.production)
const knownHexIds = {
  'ARCHIVE_ROOT': '14ba5af8d3c64ec592ec94bbc9aad6de',
  'MILITARY_ARCHIVE': '53641f64b7ed4f3e8b0b252c7d3fae18',
  'WORKWEAR_ARCHIVE': '5e9079c077484a2ba3ae224b067e6a56',
  'OUTDOOR_ARCHIVE': 'a07458e8c6484cf8b1eb71676e8b8d38',
  'JAPAN_ARCHIVE': 'e9c686dbfaae4873b33b4e875d18c8ab',
  'EUROPE_HERITAGE': 'ef5b17e6a0794f7ea73d414cfb1e7e5a',
  'BRITISH_ARCHIVE': 'b220dc4fcbfb468c865db970e5db9acf',
  'UNISEX_ARCHIVE': 'd2f2c0b1856a42db9bf3f790ffb1d60a',
  'NEW': 'bedf1e439281477fb6383cfb1770eea9',
  'CLEARANCE': '09f56197c74b4969ac44a18a7b5f8fb1',
  'CURATED': '4efdba18ec5c4bdfb72d25bf0b8ddcca',
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

async function tryUrl(url, label) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    const ct = res.headers.get('content-type') || '';
    if (res.ok) {
      if (ct.includes('json')) {
        const data = await res.json();
        console.log(`\n✓ ${label} (${res.status}):`);
        console.log(JSON.stringify(data).slice(0, 2000));
        return data;
      } else {
        const text = await res.text();
        // __NEXT_DATA__ 추출
        const nextDataMatch = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
          console.log(`\n✓ ${label} - __NEXT_DATA__ found (${text.length} bytes)`);
          const nextData = JSON.parse(nextDataMatch[1]);
          return nextData;
        }
        // 카테고리 관련 JSON 추출
        const catMatch = text.match(/displayCategor[^"]*":\s*(\[[\s\S]*?\])/);
        if (catMatch) {
          console.log(`\n✓ ${label} - displayCategory data found`);
          console.log(catMatch[1].slice(0, 1000));
        }
        // window.__PRELOADED_STATE__ 추출
        const preloadMatch = text.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/);
        if (preloadMatch) {
          console.log(`\n✓ ${label} - __PRELOADED_STATE__ found`);
          const state = JSON.parse(preloadMatch[1]);
          return state;
        }
        console.log(`  ${label} → HTML (${text.length} bytes), no embedded JSON found`);
        return null;
      }
    } else {
      console.log(`  ${label} → ${res.status}`);
      return null;
    }
  } catch (e) {
    console.log(`  ${label} → ERROR: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('=== SmartStore 공개 API에서 전시카테고리 정수 ID 찾기 ===\n');

  // 1. 스토어 메인 페이지
  const mainData = await tryUrl(`${BASE}/${STORE}`, '스토어 메인');

  // 2. 카테고리 페이지 (hex ID로)
  const catData = await tryUrl(
    `${BASE}/${STORE}/category/${knownHexIds['MILITARY_ARCHIVE']}`,
    'MILITARY ARCHIVE 카테고리 페이지'
  );

  // 3. 가능한 API 엔드포인트들
  const apiEndpoints = [
    `${BASE}/i/v1/stores/${STORE}/categories`,
    `${BASE}/i/v2/stores/${STORE}/categories`,
    `${BASE}/i/v1/stores/${STORE}/display-categories`,
    `${BASE}/i/v2/stores/${STORE}/display-categories`,
    `${BASE}/api/stores/${STORE}/categories`,
    `${BASE}/api/v1/stores/${STORE}/categories`,
    `${BASE}/i/v1/channels/${STORE}/categories`,
  ];

  for (const url of apiEndpoints) {
    await tryUrl(url, url.replace(BASE, ''));
  }

  // 4. __NEXT_DATA__에서 카테고리 추출
  if (mainData?.props?.pageProps) {
    console.log('\n=== __NEXT_DATA__ pageProps keys ===');
    console.log(Object.keys(mainData.props.pageProps));

    // 카테고리 관련 키 찾기
    const findCategoryData = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${k}` : k;
        if (typeof k === 'string' && (k.toLowerCase().includes('categor') || k.toLowerCase().includes('display'))) {
          console.log(`  FOUND: ${fullPath} = ${JSON.stringify(v).slice(0, 500)}`);
        }
        if (typeof v === 'object' && v !== null && !Array.isArray(v) && path.split('.').length < 4) {
          findCategoryData(v, fullPath);
        }
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          // 배열 첫 항목만 검사
          findCategoryData(v[0], `${fullPath}[0]`);
        }
      }
    };
    findCategoryData(mainData.props.pageProps);
  }

  if (catData?.props?.pageProps) {
    console.log('\n=== 카테고리 페이지 __NEXT_DATA__ pageProps keys ===');
    console.log(Object.keys(catData.props.pageProps));

    const findCategoryData = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${k}` : k;
        if (typeof k === 'string' && (k.toLowerCase().includes('categor') || k.toLowerCase().includes('display'))) {
          console.log(`  FOUND: ${fullPath} = ${JSON.stringify(v).slice(0, 500)}`);
        }
        // hex ID 검색
        if (typeof v === 'string' && Object.values(knownHexIds).includes(v)) {
          console.log(`  HEX MATCH: ${fullPath} = ${v}`);
        }
        if (typeof v === 'object' && v !== null && !Array.isArray(v) && path.split('.').length < 5) {
          findCategoryData(v, fullPath);
        }
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          findCategoryData(v[0], `${fullPath}[0]`);
        }
      }
    };
    findCategoryData(catData.props.pageProps);
  }

  // 5. hex → 정수 변환 시도 (혹시 hex가 정수를 인코딩한 것인지)
  console.log('\n=== Hex → 정수 변환 시도 ===');
  for (const [name, hex] of Object.entries(knownHexIds)) {
    const num = parseInt(hex.slice(0, 8), 16);
    console.log(`${name}: hex=${hex.slice(0,8)}... → int=${num}`);
  }
}

main().catch(e => console.error('Fatal:', e));
