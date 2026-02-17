// 단일 요청 - 10초 대기 후 SmartStore 페이지 fetch
console.log('10초 대기 중...');
await new Promise(r => setTimeout(r, 10000));

const res = await fetch('https://smartstore.naver.com/brownstreet', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Referer': 'https://www.naver.com/',
  }
});
console.log('Status:', res.status);

if (!res.ok) {
  console.log('Headers:', Object.fromEntries(res.headers));
  process.exit(1);
}

const text = await res.text();
console.log('HTML bytes:', text.length);

// __NEXT_DATA__ 추출
const m = text.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (!m) {
  // script 태그들에서 category 관련 데이터 검색
  console.log('No __NEXT_DATA__');

  // 카테고리 관련 키워드 검색
  for (const keyword of ['ARCHIVE', 'displayCategor', '53641f64', '5e9079c0', '14ba5af8', 'storeCategoryNo', 'categoryNo']) {
    const idx = text.indexOf(keyword);
    if (idx > -1) {
      console.log(`\n"${keyword}" at ${idx}:`);
      console.log(text.slice(Math.max(0, idx - 200), idx + 300));
    }
  }
  process.exit(0);
}

const data = JSON.parse(m[1]);
const json = JSON.stringify(data);
console.log('JSON bytes:', json.length);

// hex ID 검색
for (const [name, hex] of [
  ['MILITARY', '53641f64b7ed4f3e8b0b252c7d3fae18'],
  ['WORKWEAR', '5e9079c077484a2ba3ae224b067e6a56'],
  ['ARCHIVE_ROOT', '14ba5af8d3c64ec592ec94bbc9aad6de'],
  ['NEW', 'bedf1e439281477fb6383cfb1770eea9'],
]) {
  const idx = json.indexOf(hex);
  if (idx > -1) {
    console.log(`\n✓ ${name}: ${json.slice(Math.max(0, idx - 300), idx + hex.length + 300)}`);
  }
}

// "No" 패턴으로 정수 ID 찾기
const noPattern = /"(\w*[Nn]o)"\s*:\s*(\d+)/g;
const found = new Map();
let match;
while ((match = noPattern.exec(json)) !== null) {
  const key = match[1];
  const val = match[2];
  if (!found.has(key)) found.set(key, new Set());
  found.get(key).add(val);
}
console.log('\n=== All "No" fields ===');
for (const [key, vals] of found) {
  console.log(`  ${key}: [${[...vals].slice(0, 5).join(', ')}]${vals.size > 5 ? ` ...+${vals.size - 5}` : ''}`);
}

// storeCategory 또는 displayCategory 검색
for (const term of ['storeCategor', 'displayCategor', 'DISPLAY_CATEGORY']) {
  let idx = 0;
  while (true) {
    idx = json.indexOf(term, idx);
    if (idx === -1) break;
    console.log(`\n${term} at ${idx}: ${json.slice(Math.max(0, idx - 50), idx + 200)}`);
    idx += term.length;
  }
}
