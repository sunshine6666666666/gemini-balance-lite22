# Comprehensive Test Script for Gemini Balance Lite 22
# Tests both local and preview environments with various scenarios

param(
    [string]$Environment = "local", # local or preview
    [string]$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
)

# Environment URLs
$urls = @{
    "local" = "http://localhost:3000"
    "preview1" = "https://gemini-balance-lite22-4uy0mrkyk-showlin666s-projects.vercel.app"
    "preview2" = "https://gemini-balance-lite22-git-refactor-v2-showlin666s-projects.vercel.app"
    "preview3" = "https://gemini-balance-lite22-refactor-v2.vercel.app"
}

Write-Host "=== Gemini Balance Lite 22 Comprehensive Test ===" -ForegroundColor Magenta
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0,12))..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

$testResults = @()

function Test-URL {
    param([string]$url)
    
    Write-Host "Testing URL: $url" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$url/" -Method Get -TimeoutSec 10
        Write-Host "SUCCESS: $response" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-Scenario {
    param(
        [string]$Name,
        [string]$BaseUrl,
        [string]$Endpoint,
        [string]$Method = "POST",
        [object]$Body = $null
    )
    
    Write-Host "`n--- Testing: $Name ---" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    try {
        $url = "$BaseUrl$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -TimeoutSec 30
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            Write-Host "Request size: $($bodyJson.Length) chars" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson -TimeoutSec 30
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "SUCCESS - ${duration}ms" -ForegroundColor Green
        
        # Display response content
        if ($response.choices -and $response.choices[0].message.content) {
            $content = $response.choices[0].message.content
            Write-Host "Response: $($content.Substring(0, [Math]::Min(150, $content.Length)))..." -ForegroundColor Cyan
        } elseif ($response.data) {
            Write-Host "Models available: $($response.data.Count)" -ForegroundColor Cyan
        } else {
            Write-Host "Response received successfully" -ForegroundColor Cyan
        }
        
        $script:testResults += @{
            Test = $Name
            Status = "SUCCESS"
            Duration = "${duration}ms"
            Error = $null
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "FAILED - ${duration}ms" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $script:testResults += @{
            Test = $Name
            Status = "FAILED"
            Duration = "${duration}ms"
            Error = $_.Exception.Message
        }
    }
}

# Determine base URL
$baseUrl = ""
if ($Environment -eq "local") {
    $baseUrl = $urls["local"]
    Write-Host "Testing local environment..." -ForegroundColor Green
} else {
    Write-Host "Testing preview environments..." -ForegroundColor Green
    foreach ($key in @("preview1", "preview2", "preview3")) {
        if (Test-URL $urls[$key]) {
            $baseUrl = $urls[$key]
            Write-Host "Using URL: $baseUrl" -ForegroundColor Green
            break
        }
    }
    
    if (-not $baseUrl) {
        Write-Host "No preview environment is accessible!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nStarting comprehensive tests with: $baseUrl" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Gray

# Test scenarios based on real usage patterns

# 1. Basic connectivity
Test-Scenario -Name "Basic Connectivity" -BaseUrl $baseUrl -Endpoint "/" -Method "GET"

# 2. Models endpoint
Test-Scenario -Name "Models List" -BaseUrl $baseUrl -Endpoint "/v1/models" -Method "GET"

# 3. Simple greeting
$greeting = @{
    model = "gpt-3.5-turbo"
    messages = @(@{ role = "user"; content = "Hello! Please say hi back." })
    temperature = 0.7
    max_tokens = 50
}
Test-Scenario -Name "Simple Greeting" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $greeting

# 4. Translation (based on real log)
$translation = @{
    model = "gemini-2.5-flash-lite"
    temperature = 0
    messages = @(
        @{ role = "system"; content = "You are a translator. Translate to Chinese. Only output translation." }
        @{ role = "user"; content = "Translate: Good morning, how are you today?" }
    )
}
Test-Scenario -Name "Translation Task" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $translation

# 5. Creative writing - Poetry
$poetry = @{
    model = "gpt-4"
    messages = @(@{ role = "user"; content = "Write a haiku about spring." })
    temperature = 0.8
    max_tokens = 100
}
Test-Scenario -Name "Poetry Creation" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $poetry

# 6. Technical Q&A
$technical = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{ role = "system"; content = "You are a software engineer. Answer technical questions clearly." }
        @{ role = "user"; content = "What is the difference between REST and GraphQL?" }
    )
    temperature = 0.3
    max_tokens = 200
}
Test-Scenario -Name "Technical Q&A" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $technical

# 7. Code generation
$coding = @{
    model = "gpt-4"
    messages = @(@{ role = "user"; content = "Write a simple Python function to calculate factorial." })
    temperature = 0.2
    max_tokens = 300
}
Test-Scenario -Name "Code Generation" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $coding

# 8. Storytelling
$story = @{
    model = "gpt-3.5-turbo"
    messages = @(@{ role = "user"; content = "Tell me a short story about a robot learning to paint." })
    temperature = 0.9
    max_tokens = 250
}
Test-Scenario -Name "Creative Storytelling" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $story

# 9. Math problem solving
$math = @{
    model = "gpt-3.5-turbo"
    messages = @(@{ role = "user"; content = "Solve: If x + 5 = 12, what is x? Show your work." })
    temperature = 0.1
    max_tokens = 150
}
Test-Scenario -Name "Math Problem" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $math

# 10. Multi-turn conversation
$conversation = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{ role = "user"; content = "What's your favorite color?" }
        @{ role = "assistant"; content = "I don't have personal preferences, but I find blue quite calming." }
        @{ role = "user"; content = "Why do you think blue is calming?" }
    )
    temperature = 0.6
    max_tokens = 200
}
Test-Scenario -Name "Multi-turn Chat" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $conversation

# 11. Streaming test
$streaming = @{
    model = "gpt-3.5-turbo"
    messages = @(@{ role = "user"; content = "Explain photosynthesis in simple terms." })
    stream = $true
    temperature = 0.5
    max_tokens = 300
}
Test-Scenario -Name "Streaming Response" -BaseUrl $baseUrl -Endpoint "/v1/chat/completions" -Body $streaming

# Generate comprehensive report
Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "COMPREHENSIVE TEST REPORT" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Gray

$successCount = ($testResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$totalCount = $testResults.Count

Write-Host "`nSUMMARY:" -ForegroundColor Yellow
Write-Host "Environment: $Environment ($baseUrl)" -ForegroundColor White
Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Success Rate: $([Math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor Cyan

Write-Host "`nDETAILED RESULTS:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    $statusColor = if ($result.Status -eq "SUCCESS") { "Green" } else { "Red" }
    Write-Host "[$($result.Status)] $($result.Test) - $($result.Duration)" -ForegroundColor $statusColor
    if ($result.Error) {
        Write-Host "    Error: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`nTest completed at $(Get-Date)" -ForegroundColor Green
