# ================================================================
#   Talent Intelligence Platform - Full Stack Launcher
#   Usage: .\start.ps1
# ================================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Talent Intelligence Platform Launcher" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Maven build
Write-Host "[1/4] Building all microservices (mvn clean package)..." -ForegroundColor Yellow
& mvn clean package -DskipTests

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Maven build failed. Fix compilation errors and retry." -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] Build successful." -ForegroundColor Green
Write-Host ""

# Step 2: Start backend services
Write-Host "[2/4] Starting backend microservices..." -ForegroundColor Yellow
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

    Write-Host "  -> $name  (port $port)" -ForegroundColor Green
    Start-Process java -ArgumentList "-jar", $jar -WindowStyle Minimized

    # Eureka needs more time before others register
    if ($name -eq "eureka-server") {
        Write-Host "     Waiting 8s for Eureka to be ready..." -ForegroundColor DarkCyan
        Start-Sleep -Seconds 8
    } else {
        Start-Sleep -Seconds 3
    }
}

Write-Host ""
Write-Host "[2/4] All services launched." -ForegroundColor Green
Write-Host ""

# Step 3: Frontend dependencies
Write-Host "[3/4] Checking frontend..." -ForegroundColor Yellow

if (-not (Test-Path "frontend")) {
    Write-Host "  [SKIP] No 'frontend' folder found." -ForegroundColor DarkYellow
} else {
    if (-not (Test-Path "frontend\node_modules")) {
        Write-Host "  -> node_modules missing, running npm install..." -ForegroundColor Green
        Push-Location "frontend"
        & npm install
        Pop-Location
    } else {
        Write-Host "  -> node_modules found, skipping install." -ForegroundColor DarkCyan
    }

    # Step 4: Start React dev server
    Write-Host ""
    Write-Host "[4/4] Starting React frontend on http://localhost:5173 ..." -ForegroundColor Yellow
    Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory "frontend" -WindowStyle Minimized
}

# Done
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Stack is UP - service summary:" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Eureka Dashboard   ->  http://localhost:8761" -ForegroundColor White
Write-Host "  API Gateway        ->  http://localhost:8090" -ForegroundColor White
Write-Host "  Auth Service       ->  http://localhost:8091" -ForegroundColor White
Write-Host "  User Management    ->  http://localhost:8069" -ForegroundColor White
Write-Host "  Resume Service     ->  http://localhost:8073" -ForegroundColor White
Write-Host "  Job Description    ->  http://localhost:8084" -ForegroundColor White
Write-Host "  AI Screening       ->  http://localhost:8075" -ForegroundColor White
Write-Host "  Candidate Ranking  ->  http://localhost:8086" -ForegroundColor White
Write-Host "  Recruiter Chat     ->  http://localhost:8087" -ForegroundColor White
Write-Host "  Notification       ->  http://localhost:8088" -ForegroundColor White
Write-Host "  Frontend           ->  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  NOTE: Services take ~30s to fully register with Eureka." -ForegroundColor DarkYellow
Write-Host ""