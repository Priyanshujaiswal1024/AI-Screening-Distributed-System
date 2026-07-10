# ================================================================
#   Talent Intelligence Platform - Stop Backend Services
#   Usage: .\stop_backend.ps1
# ================================================================

Write-Host "Stopping existing java processes running our microservices..." -ForegroundColor Yellow

Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" | ForEach-Object {
    if ($_.CommandLine -like "*com.talent.platform*") {
        Write-Host "Stopping process: $($_.ProcessId) ($($_.CommandLine))" -ForegroundColor Red
        Stop-Process -Id $_.ProcessId -Force
    }
}

Write-Host "All matching Java processes have been stopped." -ForegroundColor Green
