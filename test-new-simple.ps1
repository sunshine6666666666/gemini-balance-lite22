# 简单测试新的Preview部署
$BaseUrl = "https://gemini-balance-lite22-bim9mr4e7-showlin666s-projects.vercel.app"
$BypassToken = "84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

Write-Host "Testing New Preview Deployment (Force Rebuild)" -ForegroundColor Green
Write-Host "URL: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

# Test 1: Basic connectivity with bypass
Write-Host "Test 1: Basic Connectivity (with bypass)" -ForegroundColor Yellow
try {
    $url = "$BaseUrl/?x-vercel-protection-bypass=$BypassToken"
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10
    Write-Host "SUCCESS: Status $($response.StatusCode)" -ForegroundColor Green
    if ($response.Content -like "*Proxy is Running*") {
        Write-Host "  Content: Proxy is Running! Standalone Version" -ForegroundColor Green
    } else {
        Write-Host "  Content: $($response.Content.Substring(0, 100))..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Models endpoint
Write-Host "Test 2: Models List (with bypass)" -ForegroundColor Yellow
try {
    $url = "$BaseUrl/v1/models?x-vercel-protection-bypass=$BypassToken"
    $headers = @{
        'Authorization' = "Bearer $ApiKey"
        'Content-Type' = 'application/json'
    }
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers $headers -TimeoutSec 10
    Write-Host "SUCCESS: Found $($response.data.Count) models" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Simple chat
Write-Host "Test 3: Simple Chat (with bypass)" -ForegroundColor Yellow
try {
    $url = "$BaseUrl/v1/chat/completions?x-vercel-protection-bypass=$BypassToken"
    $headers = @{
        'Authorization' = "Bearer $ApiKey"
        'Content-Type' = 'application/json'
    }
    $body = @{
        messages = @(
            @{
                role = "user"
                content = "Hi"
            }
        )
        model = "gpt-3.5-turbo"
        max_tokens = 10
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 30
    Write-Host "SUCCESS: $($response.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "Test completed!" -ForegroundColor Green
