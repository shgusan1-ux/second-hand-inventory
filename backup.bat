@echo off
chcp 65001 >nul
echo ================================
echo 프로젝트 백업 시작 (PowerShell)
echo ================================
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "auto-backup.ps1"

echo.
echo ================================
echo 백업 작업 완료! (상세 내역은 backup-log.txt 확인)
echo ================================
pause
