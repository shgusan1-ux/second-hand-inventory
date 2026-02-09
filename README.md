## 🚀 실행 명령 가이드

### 1. 로컬 개발 (SQLite 사용)
로컬 DB(`inventory.db`)를 사용하여 개발합니다.
```bash
npm run dev
```

### 2. 프로덕션 환경 테스트 (Postgres 사용)
Vercel Postgres 실DB에 연결하여 스크립트나 API를 테스트합니다. 
`.env.production` 파일이 필요합니다.
```bash
# DB 마이그레이션 실행
npx tsx --env-file=.env.production scripts/migrate_postgres.ts

# 프로덕션 모드로 로컬 서버 실행
npm run build && npx vercel dev --env .env.production
```

## 🛠 DB 구조 (Schema)
- `products`: 상품 정보 (id, name, brand, category, price_sell, status, created_at, archive, archive_locked 등)
- `categories`: 카테고리 정보 (id, name, classification, sort_order)
- `system_settings`: 시스템 설정 (smartstore_config 등)

