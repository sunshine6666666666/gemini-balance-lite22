# Preview Environment Test with Vercel Bypass Token
# Test with deployment protection bypass

$PreviewUrl = "https://gemini-balance-lite22-4uy0mrkyk-showlin666s-projects.vercel.app"
$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
$BypassToken = "84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

Write-Host "Testing Preview Environment with Bypass Token" -ForegroundColor Green
Write-Host "URL: $PreviewUrl" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0,12))..." -ForegroundColor Cyan
Write-Host "Bypass Token: $($BypassToken.Substring(0,8))..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    'x-vercel-protection-bypass' = $BypassToken
}

function Test-BypassEndpoint {
    param(
        [string]$TestName,
        [string]$Endpoint,
        [string]$Method = "POST",
        [object]$Body = $null
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    try {
        $url = "$PreviewUrl$Endpoint"
        
        # Add bypass token to URL as well
        if ($url.Contains("?")) {
            $url += "&vercel-protection-bypass=$BypassToken"
        } else {
            $url += "?vercel-protection-bypass=$BypassToken"
        }
        
        Write-Host "URL: $url" -ForegroundColor Gray
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -TimeoutSec 30
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            Write-Host "Body size: $($bodyJson.Length) chars" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson -TimeoutSec 30
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "SUCCESS - ${duration}ms" -ForegroundColor Green
        
        if ($response.choices -and $response.choices[0].message.content) {
            $content = $response.choices[0].message.content
            Write-Host "Response: $($content.Substring(0, [Math]::Min(100, $content.Length)))..." -ForegroundColor Cyan
        } elseif ($response.data) {
            Write-Host "Models: $($response.data.Count)" -ForegroundColor Cyan
        } else {
            Write-Host "Response: $($response.ToString().Substring(0, [Math]::Min(50, $response.ToString().Length)))..." -ForegroundColor Cyan
        }
        
        return $true
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "FAILED - ${duration}ms" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        return $false
    }
    
    Write-Host ""
}

Write-Host "Starting Preview Environment Tests with Bypass" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Gray

# Test 1: Basic connectivity
$success1 = Test-BypassEndpoint -TestName "Basic Connectivity" -Endpoint "/" -Method "GET"

# Test 2: Models list
$success2 = Test-BypassEndpoint -TestName "Models List" -Endpoint "/v1/models" -Method "GET"

# Test 3: Simple chat
$simpleChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hello! Please say hi back."
        }
    )
    temperature = 0.7
    max_tokens = 50
}
$success3 = Test-BypassEndpoint -TestName "Simple Chat" -Endpoint "/v1/chat/completions" -Body $simpleChat

# Test 4: Translation
$translation = @{
    model = "gemini-2.5-flash-lite"
    temperature = 0
    messages = @(
        @{
            role = "user"
            content = "Translate to Chinese: Good morning!"
        }
    )
}
$success4 = Test-BypassEndpoint -TestName "Translation" -Endpoint "/v1/chat/completions" -Body $translation

# Test 5: Poetry
$poetry = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "Write a haiku about coding."
        }
    )
    temperature = 0.8
    max_tokens = 100
}
$success5 = Test-BypassEndpoint -TestName "Poetry" -Endpoint "/v1/chat/completions" -Body $poetry

# Calculate results
$results = @($success1, $success2, $success3, $success4, $success5)
$successCount = ($results | Where-Object { $_ -eq $true }).Count
$totalCount = $results.Count

Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "PREVIEW ENVIRONMENT TEST RESULTS (WITH BYPASS)" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "Environment: $PreviewUrl" -ForegroundColor White
Write-Host "Bypass Token Used: Yes" -ForegroundColor White
Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $($totalCount - $successCount)" -ForegroundColor Red
Write-Host "Success Rate: $([Math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor Cyan

if ($successCount -eq $totalCount) {
    Write-Host "`nALL TESTS PASSED! Preview environment is working perfectly with bypass!" -ForegroundColor Green
} elseif ($successCount -gt 0) {
    Write-Host "`nPartial success. Some features are working in preview environment." -ForegroundColor Yellow
} else {
    Write-Host "`nAll tests failed. May need different bypass method or environment configuration." -ForegroundColor Red
}

Write-Host "`nTest completed at $(Get-Date)" -ForegroundColor Green
