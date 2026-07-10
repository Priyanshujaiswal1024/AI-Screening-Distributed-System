Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Starting Talent Platform Stack Launcher" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Package backend JAR files
Write-Host "[1/4] Packaging backend microservices JARs..." -ForegroundColor Yellow
& mvn clean package -DskipTests
if ($LASTEXITCODE -ne 0) {
    Write-Error "Maven package compilation failed. Aborting startup."
    exit 1
}

# 2. Boot up Backend Services in background
Write-Host "[2/4] Booting up backend microservices..." -ForegroundColor Yellow

$services = @(
    @("eureka-server", "8761"),
    @("api-gateway", "8091"),
    @("authentication-service", "8081"),
    @("user-management-service", "8082"),
    @("resume-management-service", "8073"),
    @("job-description-service", "8084"),
    @("ai-screening-service", "8075"),
    @("candidate-ranking-service", "8086"),
    @("recruiter-chat-service", "8087"),
    @("notification-service", "8088")
)

foreach ($serviceInfo in $services) {
    $name = $serviceInfo[0]
    $port = $serviceInfo[1]
    Write-Host "  -> Starting $name on port $port..." -ForegroundColor Green
    Start-Process java -ArgumentList "-jar", "$name/target/$name-0.0.1-SNAPSHOT.jar" -WindowStyle Minimized
    Start-Sleep -Seconds 2 # Give brief delay between startups
}

# 3. Setup Frontend dependencies
Write-Host "[3/4] Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "  -> node_modules folder missing. Running 'npm install'..." -ForegroundColor Green
    Set-Location -Path "frontend"
    & npm install
    Set-Location -Path ".."
}

# 4. Boot up React Frontend
Write-Host "[4/4] Starting React Frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory "frontend" -WindowStyle Minimized

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Talent stack is booting in the background!" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
