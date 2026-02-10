@echo off
chcp 65001 >nul
echo ================================
echo 프로젝트 백업 시작
echo ================================
echo.

cd /d "%~dp0"

echo [1/4] Git 상태 확인...
git status
echo.

echo [2/4] 모든 변경사항 스테이징...
git add .
echo.

echo [3/4] 커밋 생성...
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set mydate=%%a%%b%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b
git commit -m "Auto backup - %mydate% %mytime%"
echo.

echo [4/4] 원격 저장소에 푸시...
git push
echo.

echo ================================
echo 백업 완료!
echo ================================
pause
