# Production Environment Test
$ProductionUrl = "https://gemini-balance-lite22-m6qxra2os-showlin666s-projects.vercel.app"
$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

Write-Host "Testing Production Environment" -ForegroundColor Green
Write-Host "URL: $ProductionUrl" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
}

function Test-ProductionEndpoint {
    param(
        [string]$TestName,
        [string]$Endpoint,
        [string]$Method = "POST",
        [object]$Body = $null
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    try {
        $url = "$ProductionUrl$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -TimeoutSec 30
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson -TimeoutSec 30
        }
        
        Write-Host "SUCCESS" -ForegroundColor Green
        
        if ($response.choices -and $response.choices[0].message.content) {
            $content = $response.choices[0].message.content
            Write-Host "Response: $($content.Substring(0, [Math]::Min(100, $content.Length)))..." -ForegroundColor Cyan
        } elseif ($response.data) {
            Write-Host "Models: $($response.data.Count)" -ForegroundColor Cyan
        } else {
            Write-Host "Response received" -ForegroundColor Cyan
        }
        
        return $true
        
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
}

# Test basic functionality
$success1 = Test-ProductionEndpoint -TestName "Basic Connectivity" -Endpoint "/" -Method "GET"
$success2 = Test-ProductionEndpoint -TestName "Models List" -Endpoint "/v1/models" -Method "GET"

# Test chat
$chat = @{
    model = "gpt-3.5-turbo"
    messages = @(@{ role = "user"; content = "Hello!" })
    max_tokens = 50
}
$success3 = Test-ProductionEndpoint -TestName "Chat Test" -Endpoint "/v1/chat/completions" -Body $chat

# Test translation
$translation = @{
    model = "gemini-2.5-flash"
    messages = @(@{ role = "user"; content = "Translate to Chinese: Good morning" })
    max_tokens = 100
}
$success4 = Test-ProductionEndpoint -TestName "Translation Test" -Endpoint "/v1/chat/completions" -Body $translation

$results = @($success1, $success2, $success3, $success4)
$successCount = ($results | Where-Object { $_ -eq $true }).Count

Write-Host "Production Test Results:" -ForegroundColor Magenta
Write-Host "Success Rate: $successCount/4 ($([Math]::Round($successCount / 4 * 100, 2))%)" -ForegroundColor Cyan

if ($successCount -eq 4) {
    Write-Host "ALL TESTS PASSED! Production environment is working perfectly!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed. Check the logs above for details." -ForegroundColor Yellow
}
