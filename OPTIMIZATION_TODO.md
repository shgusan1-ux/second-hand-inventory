# 🚀 DB 쿼리 최적화 TODO

## 현재 문제점

### 1. SELECT * 쿼리 (불필요한 데이터 전송)
- `src/app/api/smartstore/classify/route.ts:47`
- `src/app/api/smartstore/products/route.ts:65`
- `src/app/api/inventory/bulk-search/route.ts:25`

**개선:**
```typescript
// ❌ Before
SELECT * FROM product_overrides

// ✅ After
SELECT id, override_date, internal_category FROM product_overrides
```

### 2. 캐싱 부재

product_overrides 같은 자주 조회되는 데이터는 메모리 캐싱 필요

**개선:**
```typescript
// LRU Cache 추가
import { LRUCache } from 'lru-cache'
const overrideCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 })
```

### 3. 페이지네이션 최적화

현재 전체 데이터를 가져온 후 필터링

**개선:**
```sql
-- DB 레벨에서 필터링
SELECT ... FROM products
WHERE status != '폐기'
LIMIT 20 OFFSET 0
```

## 우선순위

1. **긴급**: Neon DB 마이그레이션 또는 SQLite 전환
2. **높음**: SELECT * → SELECT 필요한 컬럼만
3. **중간**: 캐싱 레이어 추가
4. **낮음**: 불필요한 로그 제거

## 예상 효과

- 데이터 전송량: 60-70% 감소
- API 응답 속도: 30-40% 개선
- DB 부하: 50% 감소
