# Preview Environment Diagnostic Test
# Detailed testing to identify specific issues

$PreviewUrl = "https://gemini-balance-lite22-4uy0mrkyk-showlin666s-projects.vercel.app"
$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
$BypassToken = "84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

Write-Host "Preview Environment Diagnostic Test" -ForegroundColor Green
Write-Host "URL: $PreviewUrl" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    'x-vercel-protection-bypass' = $BypassToken
}

function Test-DetailedEndpoint {
    param(
        [string]$TestName,
        [string]$Endpoint,
        [string]$Method = "POST",
        [object]$Body = $null
    )
    
    Write-Host "`n--- $TestName ---" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    try {
        $url = "$PreviewUrl$Endpoint"
        
        # Add bypass token to URL
        if ($url.Contains("?")) {
            $url += "&vercel-protection-bypass=$BypassToken"
        } else {
            $url += "?vercel-protection-bypass=$BypassToken"
        }
        
        Write-Host "URL: $url" -ForegroundColor Gray
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -TimeoutSec 45
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            Write-Host "Request Body:" -ForegroundColor Gray
            Write-Host $bodyJson -ForegroundColor DarkGray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson -TimeoutSec 45
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "SUCCESS - ${duration}ms" -ForegroundColor Green
        
        # Detailed response analysis
        if ($response.choices -and $response.choices[0].message.content) {
            $content = $response.choices[0].message.content
            Write-Host "Response Content:" -ForegroundColor Cyan
            Write-Host $content -ForegroundColor White
            
            if ($response.usage) {
                Write-Host "Token Usage: Prompt=$($response.usage.prompt_tokens), Completion=$($response.usage.completion_tokens), Total=$($response.usage.total_tokens)" -ForegroundColor Gray
            }
        } elseif ($response.data) {
            Write-Host "Models Count: $($response.data.Count)" -ForegroundColor Cyan
            Write-Host "First few models: $($response.data[0..2].id -join ', ')" -ForegroundColor Gray
        } else {
            Write-Host "Raw Response:" -ForegroundColor Cyan
            Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor White
        }
        
        return $true
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "FAILED - ${duration}ms" -ForegroundColor Red
        Write-Host "Error Type: $($_.Exception.GetType().Name)" -ForegroundColor Red
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
        
        # Try to get more detailed error info
        if ($_.Exception.Response) {
            try {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd()
                Write-Host "Error Response Body: $errorBody" -ForegroundColor Red
            } catch {
                Write-Host "Could not read error response body" -ForegroundColor Red
            }
        }
        
        return $false
    }
}

Write-Host "Starting Diagnostic Tests" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Gray

# Test 1: Basic connectivity
$success1 = Test-DetailedEndpoint -TestName "Basic Connectivity Check" -Endpoint "/" -Method "GET"

# Test 2: Models list
$success2 = Test-DetailedEndpoint -TestName "Models List Check" -Endpoint "/v1/models" -Method "GET"

# Test 3: Minimal chat request
$minimalChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hi"
        }
    )
    max_tokens = 10
}
$success3 = Test-DetailedEndpoint -TestName "Minimal Chat Request" -Endpoint "/v1/chat/completions" -Body $minimalChat

# Test 4: Different model
$geminiChat = @{
    model = "gemini-2.5-flash"
    messages = @(
        @{
            role = "user"
            content = "Hello"
        }
    )
    max_tokens = 20
}
$success4 = Test-DetailedEndpoint -TestName "Gemini Model Chat" -Endpoint "/v1/chat/completions" -Body $geminiChat

# Test 5: Very simple request
$simpleChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Say hello"
        }
    )
}
$success5 = Test-DetailedEndpoint -TestName "Simple Chat (No Max Tokens)" -Endpoint "/v1/chat/completions" -Body $simpleChat

# Summary
$results = @($success1, $success2, $success3, $success4, $success5)
$successCount = ($results | Where-Object { $_ -eq $true }).Count
$totalCount = $results.Count

Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "DIAGNOSTIC TEST SUMMARY" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "Environment: Preview (with bypass token)" -ForegroundColor White
Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $($totalCount - $successCount)" -ForegroundColor Red
Write-Host "Success Rate: $([Math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor Cyan

Write-Host "`nDiagnostic Analysis:" -ForegroundColor Yellow
if ($success1) {
    Write-Host "✅ Basic connectivity: WORKING" -ForegroundColor Green
} else {
    Write-Host "❌ Basic connectivity: FAILED" -ForegroundColor Red
}

if ($success2) {
    Write-Host "✅ Models endpoint: WORKING" -ForegroundColor Green
} else {
    Write-Host "❌ Models endpoint: FAILED" -ForegroundColor Red
}

if ($success3 -or $success4 -or $success5) {
    Write-Host "✅ Chat functionality: PARTIALLY WORKING" -ForegroundColor Yellow
} else {
    Write-Host "❌ Chat functionality: COMPLETELY FAILED" -ForegroundColor Red
}

Write-Host "`nRecommendations:" -ForegroundColor Yellow
if ($successCount -eq 0) {
    Write-Host "- Check Vercel deployment logs" -ForegroundColor White
    Write-Host "- Verify environment variables are set correctly" -ForegroundColor White
    Write-Host "- Check if the deployment completed successfully" -ForegroundColor White
} elseif ($successCount -lt $totalCount) {
    Write-Host "- Basic infrastructure is working" -ForegroundColor White
    Write-Host "- Chat functionality has issues - check API key configuration" -ForegroundColor White
    Write-Host "- Review Vercel function logs for specific errors" -ForegroundColor White
} else {
    Write-Host "- All tests passed! Preview environment is fully functional" -ForegroundColor White
}

Write-Host "`nTest completed at $(Get-Date)" -ForegroundColor Green
