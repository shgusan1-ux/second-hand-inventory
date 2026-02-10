# Turso CLI 빠른 설정 (사이트 없이)

## Windows에서 CLI로 바로 설정하기

### 1단계: Turso CLI 설치 (30초)

PowerShell 관리자 권한으로:
```powershell
irm get.tur.so/install.ps1 | iex
```

또는 Scoop 사용:
```powershell
scoop install turso
```

### 2단계: 로그인 (30초)
```bash
turso auth login
```
→ 브라우저 창이 열리면서 GitHub 로그인
→ 자동으로 인증 완료

### 3단계: DB 생성 (10초)
```bash
turso db create second-hand-inventory --location icn
```

### 4단계: 연결 정보 확인 (10초)
```bash
turso db show second-hand-inventory

# 출력 예시:
# Name:          second-hand-inventory
# URL:           libsql://second-hand-inventory-xxxxx.turso.io
# Auth Token:    eyJhbGci...
```

### 5단계: 토큰 생성 (만약 안 보이면)
```bash
turso db tokens create second-hand-inventory
```

### 완료!
이제 URL과 Token을 복사해서 .env.local에 추가하면 됩니다.

---

## 문제 해결

**CLI 설치 안 되면:**
- NPX 사용: `npx @turso/cli auth login`

**브라우저 안 열리면:**
- 수동: https://api.turso.tech/v1/auth/signin

**도움말:**
```bash
turso --help
turso db --help
```
