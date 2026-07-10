Write-Host "Starting all 10 backend microservices..." -ForegroundColor Cyan

$services = @(
    @("eureka-server", "8761"),
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
    Write-Host "  -> Launching $name on port $port..." -ForegroundColor Green
    Start-Process java -ArgumentList "-jar", "$name/target/$name-0.0.1-SNAPSHOT.jar" -NoNewWindow
    Start-Sleep -Seconds 2
}

Write-Host "All 10 backend microservices have been launched in the background!" -ForegroundColor Cyan
