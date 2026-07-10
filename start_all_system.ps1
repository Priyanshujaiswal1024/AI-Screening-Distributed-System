# ================================================================
#   Talent Intelligence Platform — Unified System Launcher
#   Orchestrates Backend Microservices & Frontend Startup
#   Usage: .\start_all_system.ps1
# ================================================================

# Ensure logs directory exists
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   TALENTIQ SYSTEM STARTUP PROCESS       " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Stop existing Java microservices and frontend Node/Vite processes
Write-Host "[1/5] Stopping existing processes to prevent conflicts..." -ForegroundColor Yellow

Get-CimInstance Win32_Process -Filter "Name = 'java.exe'" | ForEach-Object {
    if ($_.CommandLine -like "*com.talent.platform*") {
        Write-Host " -> Stopping microservice process: $($_.ProcessId)" -ForegroundColor DarkYellow
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Stop existing Vite/Node processes originating from our frontend folder
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host " -> Cleanup complete." -ForegroundColor Green

# 2. Define backend startup groups
$eureka = "eureka-server"
$gateway = "api-gateway"
$aiScreening = "ai-screening-service"

$otherServices = @(
    "authentication-service",
    "user-management-service",
    "resume-management-service",
    "job-description-service",
    "candidate-ranking-service",
    "recruiter-chat-service",
    "notification-service",
    "interview-scheduling-service"
)

# Helper function to start a service
function Start-ServiceHelper {
    param(
        [string]$name,
        [int]$delay
    )
    $jar = "$name\target\$name-0.0.1-SNAPSHOT.jar"
    if (Test-Path $jar) {
        Write-Host " -> Starting $name..." -ForegroundColor Green
        Start-Process java -ArgumentList "-jar", $jar -RedirectStandardOutput "logs\$name.log" -RedirectStandardError "logs\$name.err" -WindowStyle Hidden
        if ($delay -gt 0) {
            Write-Host "    Waiting $delay seconds..." -ForegroundColor DarkGray
            Start-Sleep -Seconds $delay
        }
    } else {
        Write-Host " -> Warning: JAR for $name not found at $jar. Skipping." -ForegroundColor Red
    }
}

# 3. Start Eureka Server (Order Step 1)
Write-Host "`n[2/5] Starting Service Discovery Registry (Eureka)..." -ForegroundColor Cyan
Start-ServiceHelper -name $eureka -delay 8

# 4. Start API Gateway (Order Step 2)
Write-Host "`n[3/5] Starting API Gateway..." -ForegroundColor Cyan
Start-ServiceHelper -name $gateway -delay 3

# 5. Start AI Screening Service (Order Step 3)
Write-Host "`n[4/5] Starting AI Screening Service..." -ForegroundColor Cyan
Start-ServiceHelper -name $aiScreening -delay 3

# 6. Start other backend microservices (Order Step 4)
Write-Host "`n[5/5] Starting all remaining backend services..." -ForegroundColor Cyan
foreach ($service in $otherServices) {
    Start-ServiceHelper -name $service -delay 2
}

# 7. Start Frontend (Order Step 5)
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "   STARTING FRONTEND DEVELOPMENT APP      " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (Test-Path "frontend\package.json") {
    Write-Host " -> Launching Vite Frontend server on Port 5173..." -ForegroundColor Green
    Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory "frontend" -RedirectStandardOutput "logs\frontend.log" -RedirectStandardError "logs\frontend.err" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "`nSystem started successfully!" -ForegroundColor Green
    Write-Host " - Frontend: http://localhost:5173" -ForegroundColor Green
    Write-Host " - API Gateway: http://localhost:8090" -ForegroundColor Green
    Write-Host " - Eureka Dashboard: http://localhost:8761" -ForegroundColor Green
    Write-Host " - Logs are written to the 'logs/' folder." -ForegroundColor Yellow
} else {
    Write-Host " -> Error: frontend directory or package.json not found." -ForegroundColor Red
}

Write-Host "`nKeeping script active in background to maintain processes. Press Ctrl+C to terminate this console." -ForegroundColor Gray
while ($true) {
    Start-Sleep -Seconds 10
}
