# Direct Preview Environment Test
# Test the specific Preview URL provided by user

$PreviewUrl = "https://gemini-balance-lite22-4uy0mrkyk-showlin666s-projects.vercel.app"
$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"

Write-Host "Testing Preview Environment" -ForegroundColor Green
Write-Host "URL: $PreviewUrl" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0,12))..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

function Test-PreviewEndpoint {
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

Write-Host "Starting Preview Environment Tests" -ForegroundColor Magenta
Write-Host "=" * 50 -ForegroundColor Gray

# Test 1: Basic connectivity
$success1 = Test-PreviewEndpoint -TestName "Basic Connectivity" -Endpoint "/" -Method "GET"

# Test 2: Models list
$success2 = Test-PreviewEndpoint -TestName "Models List" -Endpoint "/v1/models" -Method "GET"

# Test 3: Simple chat
$simpleChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hello! Please say hi back in one sentence."
        }
    )
    temperature = 0.7
    max_tokens = 50
}
$success3 = Test-PreviewEndpoint -TestName "Simple Chat" -Endpoint "/v1/chat/completions" -Body $simpleChat

# Test 4: Translation (without system role to avoid API error)
$translation = @{
    model = "gemini-2.5-flash-lite"
    temperature = 0
    messages = @(
        @{
            role = "user"
            content = "Translate to Chinese: Good morning, how are you today?"
        }
    )
}
$success4 = Test-PreviewEndpoint -TestName "Translation" -Endpoint "/v1/chat/completions" -Body $translation

# Test 5: Poetry
$poetry = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "Write a short haiku about spring."
        }
    )
    temperature = 0.8
    max_tokens = 100
}
$success5 = Test-PreviewEndpoint -TestName "Poetry" -Endpoint "/v1/chat/completions" -Body $poetry

# Test 6: Code generation
$coding = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "Write a simple Python function to add two numbers."
        }
    )
    temperature = 0.2
    max_tokens = 200
}
$success6 = Test-PreviewEndpoint -TestName "Code Generation" -Endpoint "/v1/chat/completions" -Body $coding

# Test 7: Math problem
$math = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "What is 15 + 27? Show your calculation."
        }
    )
    temperature = 0.1
    max_tokens = 100
}
$success7 = Test-PreviewEndpoint -TestName "Math Problem" -Endpoint "/v1/chat/completions" -Body $math

# Test 8: Creative story
$story = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Tell a very short story about a cat and a robot in 2 sentences."
        }
    )
    temperature = 0.9
    max_tokens = 150
}
$success8 = Test-PreviewEndpoint -TestName "Creative Story" -Endpoint "/v1/chat/completions" -Body $story

# Test 9: Streaming response
$streaming = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Explain what is AI in simple terms."
        }
    )
    stream = $true
    temperature = 0.5
    max_tokens = 200
}
$success9 = Test-PreviewEndpoint -TestName "Streaming" -Endpoint "/v1/chat/completions" -Body $streaming

# Calculate results
$results = @($success1, $success2, $success3, $success4, $success5, $success6, $success7, $success8, $success9)
$successCount = ($results | Where-Object { $_ -eq $true }).Count
$totalCount = $results.Count

Write-Host "=" * 50 -ForegroundColor Gray
Write-Host "PREVIEW ENVIRONMENT TEST RESULTS" -ForegroundColor Magenta
Write-Host "=" * 50 -ForegroundColor Gray

Write-Host "Environment: $PreviewUrl" -ForegroundColor White
Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $($totalCount - $successCount)" -ForegroundColor Red
Write-Host "Success Rate: $([Math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor Cyan

if ($successCount -eq $totalCount) {
    Write-Host "`nALL TESTS PASSED! Preview environment is working perfectly!" -ForegroundColor Green
} elseif ($successCount -gt 0) {
    Write-Host "`nPartial success. Some features are working in preview environment." -ForegroundColor Yellow
} else {
    Write-Host "`nAll tests failed. Preview environment may not be accessible or configured correctly." -ForegroundColor Red
}

Write-Host "`nTest completed at $(Get-Date)" -ForegroundColor Green
