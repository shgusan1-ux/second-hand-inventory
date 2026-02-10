# Turso 빠른 설정 가이드

## 1단계: Turso 계정 생성 (2분)

```bash
# Turso 가입
https://turso.tech/ 접속하여 GitHub 계정으로 가입
```

## 2단계: DB 생성 (1분)

Turso 대시보드에서:
1. "Create Database" 클릭
2. 이름: `second-hand-inventory`
3. 리전: `Seoul (icn)` 선택
4. "Create" 클릭

## 3단계: 연결 정보 복사 (1분)

대시보드에서 방금 생성한 DB 클릭 후:

```
Database URL: libsql://second-hand-inventory-[your-id].turso.io
Auth Token: [매우 긴 토큰 문자열]
```

**이 두 값을 복사해두세요!**

## 4단계: 로컬 환경 변수 설정 (30초)

`.env.local` 파일에 추가:

```env
TURSO_DATABASE_URL=libsql://second-hand-inventory-[your-id].turso.io
TURSO_AUTH_TOKEN=[복사한 토큰]
```

## 5단계: Vercel 환경 변수 설정 (1분)

```bash
vercel env add TURSO_DATABASE_URL production
# 입력: libsql://second-hand-inventory-[your-id].turso.io

vercel env add TURSO_AUTH_TOKEN production
# 입력: [복사한 토큰]
```

## 6단계: 배포 (1분)

```bash
git add .
git commit -m "feat: migrate to Turso for Vercel compatibility"
git push origin main
```

## 완료!

배포 완료 후 https://factory.brownstreet.co.kr 접속하여 테스트하세요.

---

**문제 발생 시:**
- Turso 대시보드에서 "Query" 탭으로 테이블 생성 확인 가능
- 로그: `vercel logs production`
