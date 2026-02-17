// SmartStore 공개 페이지에서 전시카테고리 정수 ID 찾기
// 1회 요청으로 __NEXT_DATA__ 추출

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept-Encoding': 'identity',
};

async function main() {
  console.log('=== SmartStore 메인 페이지 fetch ===');
  const res = await fetch('https://smartstore.naver.com/brownstreet', { headers });
  console.log('Status:', res.status);

  if (!res.ok) {
    console.log('Failed, trying category page...');
    await new Promise(r => setTimeout(r, 3000));
    const res2 = await fetch('https://smartstore.naver.com/brownstreet/category/ALL', { headers });
    console.log('Category page status:', res2.status);
    if (!res2.ok) return;
    var text = await res2.text();
  } else {
    var text = await res.text();
  }

  console.log('HTML length:', text.length);

  // __NEXT_DATA__ 추출
  const match = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    console.log('__NEXT_DATA__ not found');
    // 다른 패턴 시도
    const patterns = [
      /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});/,
      /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
      /"displayCategor[^"]*":\s*(\[[\s\S]*?\])/,
      /"storeCategory[^"]*":\s*(\[[\s\S]*?\])/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        console.log('Found pattern:', p.source.slice(0, 50));
        console.log(m[1].slice(0, 3000));
      }
    }
    // HTML에서 카테고리 관련 키워드 주변 텍스트 추출
    const idx = text.indexOf('ARCHIVE');
    if (idx > -1) {
      console.log('\nARCHIVE found at index', idx);
      console.log(text.slice(Math.max(0, idx - 200), idx + 200));
    }
    const idx2 = text.indexOf('displayCategor');
    if (idx2 > -1) {
      console.log('\ndisplayCategor found at index', idx2);
      console.log(text.slice(Math.max(0, idx2 - 100), idx2 + 300));
    }
    return;
  }

  const nextData = JSON.parse(match[1]);
  console.log('__NEXT_DATA__ keys:', Object.keys(nextData));
  console.log('props keys:', Object.keys(nextData.props || {}));
  console.log('pageProps keys:', Object.keys(nextData.props?.pageProps || {}));

  // 전체 데이터에서 카테고리 관련 정보 추출
  const json = JSON.stringify(nextData);

  // hex ID 검색
  const hexIds = [
    '53641f64b7ed4f3e8b0b252c7d3fae18', // MILITARY
    '5e9079c077484a2ba3ae224b067e6a56', // WORKWEAR
    '14ba5af8d3c64ec592ec94bbc9aad6de', // ARCHIVE ROOT
    'bedf1e439281477fb6383cfb1770eea9', // NEW
  ];

  for (const hex of hexIds) {
    const idx = json.indexOf(hex);
    if (idx > -1) {
      console.log(`\nHex ${hex} found!`);
      console.log(json.slice(Math.max(0, idx - 200), idx + hex.length + 200));
    }
  }

  // "ARCHIVE" 문자열 검색
  let searchIdx = 0;
  while (true) {
    const idx = json.indexOf('ARCHIVE', searchIdx);
    if (idx === -1) break;
    console.log(`\nARCHIVE at ${idx}:`, json.slice(Math.max(0, idx - 100), idx + 100));
    searchIdx = idx + 7;
  }

  // categoryNo, displayCategoryNo 검색
  for (const key of ['categoryNo', 'displayCategoryNo', 'storeCategoryNo', 'displayCategory']) {
    const idx = json.indexOf(key);
    if (idx > -1) {
      console.log(`\n${key} found at ${idx}:`, json.slice(idx, idx + 200));
    }
  }

  // 전체 카테고리 트리 추출 시도
  const pageProps = nextData.props?.pageProps;
  if (pageProps) {
    // 재귀적으로 모든 키 검색
    function findCategories(obj, path = '') {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => findCategories(item, `${path}[${i}]`));
        return;
      }
      for (const [k, v] of Object.entries(obj)) {
        const p = path ? `${path}.${k}` : k;
        if (k.toLowerCase().includes('categor') || k.toLowerCase().includes('display')) {
          const str = JSON.stringify(v);
          console.log(`\nFOUND: ${p} (${str.length} chars)`);
          console.log(str.slice(0, 1000));
        } else if (typeof v === 'object' && v !== null && p.split('.').length < 6) {
          findCategories(v, p);
        }
      }
    }
    findCategories(pageProps);
  }
}

main().catch(e => console.error('Fatal:', e));
