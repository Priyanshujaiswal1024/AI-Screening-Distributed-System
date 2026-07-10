# ================================================================
#   Talent Intelligence Platform - Fast Backend Launcher
#   Usage: .\start_no_build.ps1
# ================================================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Starting Backend Microservices (Fast Mode)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @("eureka-server",             "8761"),
    @("authentication-service",    "8091"),
    @("user-management-service",   "8069"),
    @("resume-management-service", "8073"),
    @("job-description-service",   "8084"),
    @("ai-screening-service",      "8075"),
    @("candidate-ranking-service", "8086"),
    @("recruiter-chat-service",    "8087"),
    @("notification-service",      "8088"),
    @("api-gateway",               "8090")
)

foreach ($svc in $services) {
    $name = $svc[0]
    $port = $svc[1]
    $jar  = "$name\target\$name-0.0.1-SNAPSHOT.jar"

    if (-not (Test-Path $jar)) {
        Write-Host "  [SKIP] $name - JAR not found at $jar" -ForegroundColor DarkYellow
        continue
    }

    Write-Host "  -> Starting $name on port $port..." -ForegroundColor Green
    Start-Process java -ArgumentList "-jar", $jar -NoNewWindow

    # Eureka needs more time before others register
    if ($name -eq "eureka-server") {
        Write-Host "     Waiting 8s for Eureka to be ready..." -ForegroundColor DarkCyan
        Start-Sleep -Seconds 8
    } else {
        Start-Sleep -Seconds 3
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   All backend microservices launched!" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
