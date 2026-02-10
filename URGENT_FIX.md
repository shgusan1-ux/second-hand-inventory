# 🚨 긴급 최적화 TODO

## 1. SELECT * 제거 (30분)

### 파일: src/app/api/smartstore/classify/route.ts
```typescript
// ❌ Before (Line 47)
const res = await db.query('SELECT * FROM product_overrides');

// ✅ After
const res = await db.query('SELECT id, override_date, internal_category FROM product_overrides');
```

### 파일: src/app/api/smartstore/products/route.ts
```typescript
// ❌ Before (Line 72)
const { rows: overrides } = await db.query(
    `SELECT * FROM product_overrides WHERE id IN (${placeholders})`,
    ids
);

// ✅ After
const { rows: overrides } = await db.query(
    `SELECT id, override_date, internal_category FROM product_overrides WHERE id IN (${placeholders})`,
    ids
);
```

## 2. 응답 데이터 압축 (10분)

### 파일: src/app/api/smartstore/products/route.ts
```typescript
// 이미지 배열 제한
images: (cp.images || []).slice(0, 3), // 최대 3개만

// 불필요한 필드 제거
const { sellerTags, ...essentialData } = cp;
```

## 3. 캐싱 추가 (20분)

```typescript
// src/lib/cache.ts
const overrideCache = new Map();
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export async function getCachedOverrides() {
    if (Date.now() - cacheTime < CACHE_TTL && overrideCache.size > 0) {
        return overrideCache;
    }
    
    const { rows } = await db.query('SELECT id, override_date, internal_category FROM product_overrides');
    overrideCache.clear();
    rows.forEach(r => overrideCache.set(r.id, r));
    cacheTime = Date.now();
    return overrideCache;
}
```

## 예상 효과
- 데이터 전송량: **70% 감소**
- Neon 무료 한도로 충분히 운영 가능
