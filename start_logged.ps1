# ================================================================
#   Talent Intelligence Platform — Logged Stack Launcher
# ================================================================

# Create logs directory
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Stop existing java processes running our microservices
Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" | ForEach-Object {
    if ($_.CommandLine -like "*com.talent.platform*") {
        Write-Host "Stopping existing process: $($_.ProcessId)" -ForegroundColor Yellow
        Stop-Process -Id $_.ProcessId -Force
    }
}

$services = @(
    "eureka-server",
    "authentication-service",
    "user-management-service",
    "resume-management-service",
    "job-description-service",
    "ai-screening-service",
    "candidate-ranking-service",
    "recruiter-chat-service",
    "notification-service",
    "api-gateway"
)

foreach ($name in $services) {
    $jar = "$name\target\$name-0.0.1-SNAPSHOT.jar"
    if (Test-Path $jar) {
        Write-Host "Starting $name..." -ForegroundColor Green
        Start-Process java -ArgumentList "-jar", $jar -RedirectStandardOutput "logs\$name.log" -RedirectStandardError "logs\$name.err" -WindowStyle Hidden
        
        if ($name -eq "eureka-server") {
            Write-Host "Waiting 8s for Eureka..." -ForegroundColor Cyan
            Start-Sleep -Seconds 8
        } else {
            Start-Sleep -Seconds 2
        }
    } else {
        Write-Host "Warning: Jar not found for $name" -ForegroundColor Red
    }
}
Write-Host "All services started. Keeping script alive to persist services..." -ForegroundColor Green
while ($true) {
    Start-Sleep -Seconds 10
}
