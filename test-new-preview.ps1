# 测试新的Preview部署
param(
    [string]$BaseUrl = "https://gemini-balance-lite22-ky03sd52h-showlin666s-projects.vercel.app",
    [string]$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
)

Write-Host "Testing New Preview Deployment" -ForegroundColor Green
Write-Host "URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0,12))..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# Test 1: Basic connectivity
Write-Host "Test 1: Basic Connectivity" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $BaseUrl -Method GET -TimeoutSec 10
    Write-Host "SUCCESS: $response" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Models endpoint
Write-Host "Test 2: Models List" -ForegroundColor Yellow
try {
    $modelsUrl = "$BaseUrl/v1/models"
    $response = Invoke-RestMethod -Uri $modelsUrl -Method GET -Headers $headers -TimeoutSec 10
    Write-Host "SUCCESS: Found $($response.data.Count) models" -ForegroundColor Green
    $response.data | ForEach-Object { Write-Host "  - $($_.id)" -ForegroundColor White }
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorBody = $_.Exception.Response.Content.ReadAsStringAsync().Result
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Simple chat
Write-Host "Test 3: Simple Chat" -ForegroundColor Yellow
$chatUrl = "$BaseUrl/v1/chat/completions"
$chatBody = @{
    messages = @(
        @{
            role = "user"
            content = "Hi"
        }
    )
    model = "gpt-3.5-turbo"
    max_tokens = 10
} | ConvertTo-Json -Depth 3

Write-Host "URL: $chatUrl"
Write-Host "Body: $chatBody"

try {
    $response = Invoke-RestMethod -Uri $chatUrl -Method POST -Headers $headers -Body $chatBody -TimeoutSec 30
    Write-Host "SUCCESS: $($response.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorBody = $_.Exception.Response.Content.ReadAsStringAsync().Result
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "Test completed!" -ForegroundColor Green
