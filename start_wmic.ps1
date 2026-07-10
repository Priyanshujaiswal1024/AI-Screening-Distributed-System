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
    $jarPath = "C:\Users\HP\Downloads\AI_Screeming\$name\target\$name-0.0.1-SNAPSHOT.jar"
    
    if (-not (Test-Path $jarPath)) {
        Write-Host "  [SKIP] $name - JAR not found at $jarPath" -ForegroundColor DarkYellow
        continue
    }
    
    Write-Host "Launching $name on port $port via wmic..." -ForegroundColor Green
    $result = wmic process call create "java -jar $jarPath"
    
    if ($name -eq "eureka-server") {
        Write-Host "Waiting 8s for Eureka..." -ForegroundColor Cyan
        Start-Sleep -Seconds 8
    } else {
        Start-Sleep -Seconds 3
    }
}
