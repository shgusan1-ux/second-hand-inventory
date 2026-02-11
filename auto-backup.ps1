$mydate = Get-Date -Format "yyyyMMdd"
$mytime = Get-Date -Format "HHmm"
$logfile = Join-Path $PSScriptRoot "backup-log.txt"

Add-Content $logfile "[$mydate $mytime] 자동 백업 시작"

# Check if there are changes
$status = git status --porcelain
if (-not $status) {
    Add-Content $logfile "[$mydate $mytime] 변경사항 없음, 백업 스킵`n"
    exit
}

# Perform backup
git add . | Out-File -FilePath $logfile -Append
git commit -m "Auto backup - $mydate $mytime" | Out-File -FilePath $logfile -Append
git push | Out-File -FilePath $logfile -Append

if ($LASTEXITCODE -eq 0) {
    Add-Content $logfile "[$mydate $mytime] 백업 성공`n"
} else {
    Add-Content $logfile "[$mydate $mytime] 백업 실패`n"
}
