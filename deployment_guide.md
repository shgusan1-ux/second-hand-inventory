# 클라우드 배포 가이드 (Vercel + Postgres)

이 프로젝트를 인터넷(클라우드)에 배포하여 언제 어디서나 접속할 수 있게 만드는 방법입니다.

## 1. 배포 방식 변경 필요성
현재는 **내 컴퓨터의 파일(SQLite)**에 데이터를 저장하고 있습니다. 하지만 클라우드 서비스(Vercel 등)는 이 파일 저장 방식을 지원하지 않습니다. 따라서 **클라우드 데이터베이스(Postgres)**로 변경해야 합니다.

## 2. 배포 단계 요약

### 단계 1: 프로젝트 코드 준비 (진행 중)
제가 코드를 수정하여 **로컬(내 컴퓨터)**에서는 SQLite를 쓰고, **클라우드(서버)**에서는 Postgres를 쓰도록 만들겠습니다.

### 단계 2: GitHub에 코드 올리기
1.  [GitHub](https://github.com/) 회원가입.
2.  새 Repository 생성 ('second-hand-inventory').
3.  현재 코드를 GitHub에 업로드 (터미널 명령어 사용).

### 단계 3: Vercel에 배포하기
1.  [Vercel](https://vercel.com/) 회원가입 (GitHub 아이디로 로그인).
2.  'Add New Project' -> GitHub의 'second-hand-inventory' 선택.
3.  **Storage** 탭에서 'Postgre' 데이터베이스 생성 (클릭 몇 번으로 가능).
4.  'Deploy' 버튼 클릭.

## 3. 데이터베이스 변경에 따른 코드 수정 계획
-   `better-sqlite3` (로컬용)와 `@vercel/postgres` (클라우드용)를 상황에 맞춰 사용하는 **통합 DB 관리자**를 만들 것입니다.
-   기존 데이터 마이그레이션은 별도 스크립트가 필요할 수 있습니다. (일단은 빈 데이터베이스로 시작됩니다.)

---
**제가 지금부터 '단계 1: 프로젝트 코드 준비'를 작업을 시작하겠습니다.**
완료되면 GitHub에 올리는 명령어부터 차근차근 알려드리겠습니다.
git허브 아이디 
구글 아이디 shgusan1@me.com
versal도 github연결완료 그다음 어떻게 해야하니 

---

## ✅ 단계 1 작업 완료: 코드 준비 끝!
제가 방금 코드를 수정하여 **로컬(내 컴퓨터)과 클라우드(Vercel)** 어디서든 잘 작동하도록 만들었습니다.
1.  `@vercel/postgres` 설치 완료.
2.  데이터베이스 날짜 처리 방식 수정 (호환성 개선).

## 🚀 다음 단계: GitHub에 코드 올리기 (직접 실행 필요)
제 환경에서는 `git` 명령어를 실행할 수 없습니다. **사용자님의 터미널(또는 Git Bash)**을 열고 아래 명령어들을 순서대로 복사해서 붙여넣어 주세요.

### 1. GitHub에 저장소 만들기
1.  GitHub 웹사이트 로그인.
2.  우측 상단 `+` 버튼 -> **New repository**.
3.  Repository name: `second-hand-inventory` 입력.
4.  Public/Private 선택 (Private 추천).
5.  **Create repository** 버튼 클릭.

### 2. 내 컴퓨터의 코드를 GitHub로 보내기
사용자님의 터미널에서 프로젝트 폴더(`second-hand-inventory`)로 이동한 뒤, 아래 명령어들을 한 줄씩 실행하세요.
(GitHub 아이디가 필요합니다. 아래 `<GITHUB_ID>` 부분을 본인 아이디로 바꿔주세요)

```bash
# 1. 깃 초기화 (이미 되어있다면 생략 가능하지만 안전하게 실행)
git init

# 2. 모든 파일 담기
git add .

# 3. 저장 기록 만들기
git commit -m "Vercel 배포를 위한 코드 업데이트"

# 4. 가지 이름 설정 (main)
git branch -M main

# 5. GitHub 저장소와 연결 (본인 아이디로 변경 필수!)
# 예: git remote add origin https://github.com/shgusan1/second-hand-inventory.git
git remote add origin https://github.com/<GITHUB_ID>/second-hand-inventory.git

# 6. 코드 밀어넣기
git push -u origin main
```

> **참고**: 만약 `git push` 할 때 로그인이 필요하면, 브라우저 창이 뜨거나 토큰을 입력하라고 나올 수 있습니다. 안내에 따라 로그인해주세요.

## 🏁 마지막 단계: Vercel에서 배포하기
GitHub에 코드가 올라갔다면 남은 건 클릭 몇 번뿐입니다!

1.  **Vercel 대시보드** 접속.
2.  **Add New...** -> **Project**.
3.  방금 올린 `second-hand-inventory`가 목록에 보이면 **Import** 클릭.
4.  **Environment Variables** 설정:
    *   보통 자동으로 감지되지만, 만약 `POSTGRES_URL` 등이 없으면 배포 후 Storage 연결 시 자동 추가됩니다.
5.  **보안 설정 (필수)**:
    *   `AUTH_SECRET` 환경 변수를 추가해야 할 수 있습니다. (설정 -> Environment Variables)
    *   값은 아무 랜덤 문자열(길게) 넣으면 됩니다. (예: `openssl rand -base64 32` 또는 키보드 막 치기)
6.  **Storage** 탭으로 이동 (중요):
    *   Project Overview 상단 **Storage** 탭 클릭.
    *   **Create Database** -> **Postgres** -> **Continue**.
    *   데이터베이스 생성 완료 후, **.env.local** 탭을 보면 비밀번호 등이 보입니다.
    *   **Redeploy**: Settings -> Deployments -> Redeploy 하거나, 코드를 살짝 수정해서 다시 push하면 DB가 연결된 상태로 배포됩니다.

질문이 있으시면 이 파일에 적어주세요! 
