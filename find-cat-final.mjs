// SmartStore 공개 페이지에서 카테고리 데이터 추출 (단일 요청)

async function main() {
  // 5초 대기 후 시도 (rate limit 회피)
  console.log('Waiting 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
  };

  // 시도 1: 메인 페이지
  console.log('\n[1] Fetching main store page...');
  const res = await fetch('https://smartstore.naver.com/brownstreet', {
    headers,
    redirect: 'follow',
  });
  console.log('Status:', res.status);

  if (res.status === 429) {
    console.log('Rate limited. Trying mobile...');
    await new Promise(r => setTimeout(r, 3000));

    const res2 = await fetch('https://m.smartstore.naver.com/brownstreet', {
      headers: { ...headers, 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' },
      redirect: 'follow',
    });
    console.log('Mobile status:', res2.status);

    if (!res2.ok) {
      // 시도 3: 채널 API
      console.log('Trying channel API...');
      await new Promise(r => setTimeout(r, 3000));

      // Naver Shopping 내부 API
      const apiUrls = [
        'https://shopping.naver.com/v1/stores/100860005/products',
        'https://shp.pay.naver.com/api/v1/stores/brownstreet',
      ];

      for (const url of apiUrls) {
        try {
          const r = await fetch(url, { headers: { ...headers, Accept: 'application/json' } });
          console.log(`  ${url} → ${r.status}`);
          if (r.ok) {
            const d = await r.text();
            console.log(d.slice(0, 2000));
          }
        } catch (e) {
          console.log(`  ${url} → ERROR: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      return;
    }
    var text = await res2.text();
  } else if (!res.ok) {
    console.log('Failed');
    return;
  } else {
    var text = await res.text();
  }

  console.log('HTML length:', text.length);

  // __NEXT_DATA__ 추출
  const match = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (match) {
    const nextData = JSON.parse(match[1]);

    // 전체 JSON에서 카테고리 관련 데이터 추출
    const json = JSON.stringify(nextData);

    // 알려진 hex ID 검색
    const hexIds = {
      'ARCHIVE_ROOT': '14ba5af8d3c64ec592ec94bbc9aad6de',
      'MILITARY': '53641f64b7ed4f3e8b0b252c7d3fae18',
      'WORKWEAR': '5e9079c077484a2ba3ae224b067e6a56',
      'NEW': 'bedf1e439281477fb6383cfb1770eea9',
    };

    for (const [name, hex] of Object.entries(hexIds)) {
      const idx = json.indexOf(hex);
      if (idx > -1) {
        console.log(`\n✓ ${name} (${hex}) found!`);
        // 주변 200자 출력
        console.log(json.slice(Math.max(0, idx - 300), idx + hex.length + 300));
      }
    }

    // displayCategory 키 검색
    const displayCatRegex = /\"(displayCategor[^"]*|storeCateogr[^"]*|storeCategory[^"]*)\"/g;
    let m;
    while ((m = displayCatRegex.exec(json)) !== null) {
      console.log(`\nKey found: ${m[1]}`);
      console.log(json.slice(m.index, m.index + 300));
    }

    // categoryNo 검색
    const catNoRegex = /"(categoryNo|displayCategoryNo|storeCategoryNo)"\s*:\s*(\d+)/g;
    while ((m = catNoRegex.exec(json)) !== null) {
      console.log(`\n✓ ${m[1]} = ${m[2]}`);
    }

    // 6자리 이상 숫자 키 검색 (잠재적 카테고리 ID)
    const bigNumRegex = /"([\w]+No|[\w]+Id)"\s*:\s*(\d{5,})/g;
    const nums = new Set();
    while ((m = bigNumRegex.exec(json)) !== null) {
      nums.add(`${m[1]}=${m[2]}`);
    }
    if (nums.size > 0) {
      console.log('\n=== Large numeric IDs found ===');
      for (const n of nums) console.log(`  ${n}`);
    }

    // pageProps 구조 분석
    const pp = nextData.props?.pageProps;
    if (pp) {
      console.log('\n=== pageProps top keys ===');
      for (const [k, v] of Object.entries(pp)) {
        const type = Array.isArray(v) ? `array[${v.length}]` : typeof v;
        console.log(`  ${k}: ${type}`);
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          for (const [k2, v2] of Object.entries(v)) {
            const t2 = Array.isArray(v2) ? `array[${v2.length}]` : typeof v2;
            console.log(`    ${k2}: ${t2}`);
          }
        }
      }
    }
  } else {
    console.log('__NEXT_DATA__ not found, searching for embedded data...');

    // 모든 script 태그의 내용 검색
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let s;
    while ((s = scriptRegex.exec(text)) !== null) {
      const content = s[1];
      if (content.includes('ARCHIVE') || content.includes('displayCategor') || content.includes('53641f64')) {
        console.log('\nRelevant script found:');
        console.log(content.slice(0, 2000));
      }
    }
  }
}

main().catch(e => console.error('Fatal:', e));
