@echo off
chcp 65001 >nul

cd /d "%~dp0"

REM 로그 파일 경로
set LOGFILE=backup-log.txt

REM 현재 날짜/시간
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set mydate=%%a%%b%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b

echo [%mydate% %mytime%] 자동 백업 시작 >> %LOGFILE%

REM Git 변경사항 확인
git diff --quiet
if %ERRORLEVEL% EQU 0 (
    echo [%mydate% %mytime%] 변경사항 없음, 백업 스킵 >> %LOGFILE%
    exit /b 0
)

REM 백업 실행
git add . >> %LOGFILE% 2>&1
git commit -m "Auto backup - %mydate% %mytime%" >> %LOGFILE% 2>&1
git push >> %LOGFILE% 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%mydate% %mytime%] 백업 성공 >> %LOGFILE%
) else (
    echo [%mydate% %mytime%] 백업 실패 >> %LOGFILE%
)

echo. >> %LOGFILE%
