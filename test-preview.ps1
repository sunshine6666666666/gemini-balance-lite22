# Gemini Balance Lite 22 - Preview Environment Test
# Comprehensive testing based on real request logs

param(
    [string]$BaseUrl = "https://gemini-balance-lite22-git-refactor-v2-showlin666s-projects.vercel.app",
    [string]$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
)

Write-Host "Testing Gemini Balance Lite 22 Preview Environment" -ForegroundColor Green
Write-Host "URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "API Key: $($ApiKey.Substring(0,12))..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

$testResults = @()

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Endpoint,
        [string]$Method = "POST",
        [object]$Body = $null
    )
    
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    $startTime = Get-Date
    
    try {
        $url = "$BaseUrl$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "SUCCESS - Duration: ${duration}ms" -ForegroundColor Green
        
        if ($response.choices -and $response.choices[0].message.content) {
            $content = $response.choices[0].message.content
            Write-Host "Response: $($content.Substring(0, [Math]::Min(100, $content.Length)))..." -ForegroundColor Cyan
        } elseif ($response.data) {
            Write-Host "Data items: $($response.data.Count)" -ForegroundColor Cyan
        } else {
            Write-Host "Response received" -ForegroundColor Cyan
        }
        
        $script:testResults += @{
            Test = $TestName
            Status = "SUCCESS"
            Duration = "${duration}ms"
            Error = $null
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "FAILED - Duration: ${duration}ms" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $script:testResults += @{
            Test = $TestName
            Status = "FAILED"
            Duration = "${duration}ms"
            Error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

# Test 1: Basic connectivity
Test-Endpoint -TestName "Basic Connectivity" -Endpoint "/" -Method "GET"

# Test 2: Models list
Test-Endpoint -TestName "Models List" -Endpoint "/v1/models" -Method "GET"

# Test 3: Simple chat
$simpleChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hello, please introduce yourself briefly."
        }
    )
    temperature = 0.7
    max_tokens = 100
}
Test-Endpoint -TestName "Simple Chat" -Endpoint "/v1/chat/completions" -Body $simpleChat

# Test 4: Translation task (based on real log)
$translationTask = @{
    model = "gemini-2.5-flash-lite"
    temperature = 0
    messages = @(
        @{
            role = "system"
            content = "You are a professional translator. Translate text to Chinese. Only output the translation, no explanations."
        }
        @{
            role = "user"
            content = "Translate to Chinese: Hello world, this is a test message."
        }
    )
}
Test-Endpoint -TestName "Translation Task" -Endpoint "/v1/chat/completions" -Body $translationTask

# Test 5: Poetry writing
$poetryTask = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "Write a short poem about autumn in English."
        }
    )
    temperature = 0.8
    max_tokens = 200
}
Test-Endpoint -TestName "Poetry Writing" -Endpoint "/v1/chat/completions" -Body $poetryTask

# Test 6: Role playing - Technical expert
$rolePlayTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "system"
            content = "You are a senior software architect with 20 years of experience. Answer technical questions professionally."
        }
        @{
            role = "user"
            content = "Explain the pros and cons of microservices architecture."
        }
    )
    temperature = 0.6
    max_tokens = 300
}
Test-Endpoint -TestName "Role Playing - Tech Expert" -Endpoint "/v1/chat/completions" -Body $rolePlayTask

# Test 7: Code generation
$codeGenTask = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "Write a Python function to implement quicksort algorithm with detailed comments."
        }
    )
    temperature = 0.2
    max_tokens = 500
}
Test-Endpoint -TestName "Code Generation" -Endpoint "/v1/chat/completions" -Body $codeGenTask

# Test 8: Multi-turn conversation
$multiTurnChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "I want to learn cooking. Can you recommend a simple dish?"
        }
        @{
            role = "assistant"
            content = "I recommend scrambled eggs with tomatoes. It's a classic, simple, and nutritious dish."
        }
        @{
            role = "user"
            content = "What are the specific steps and ingredients needed?"
        }
    )
    temperature = 0.7
    max_tokens = 400
}
Test-Endpoint -TestName "Multi-turn Conversation" -Endpoint "/v1/chat/completions" -Body $multiTurnChat

# Test 9: Long text processing
$longTextTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Summarize this text: Artificial Intelligence (AI) is a branch of computer science that aims to understand the essence of intelligence and produce intelligent machines that can react in ways similar to human intelligence. Research in this field includes robotics, speech recognition, image recognition, natural language processing, and expert systems. Since the birth of AI, theories and technologies have become increasingly mature, and application areas continue to expand."
        }
    )
    temperature = 0.5
    max_tokens = 300
}
Test-Endpoint -TestName "Long Text Processing" -Endpoint "/v1/chat/completions" -Body $longTextTask

# Test 10: Creative story
$storyTask = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "Write a short story about a time traveler. Make it suspenseful and under 200 words."
        }
    )
    temperature = 0.9
    max_tokens = 300
}
Test-Endpoint -TestName "Creative Story" -Endpoint "/v1/chat/completions" -Body $storyTask

# Test 11: Math problem
$mathTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Solve this math problem: A circle has a radius of 5cm. Calculate the area and circumference. Show detailed steps."
        }
    )
    temperature = 0.1
    max_tokens = 200
}
Test-Endpoint -TestName "Math Problem" -Endpoint "/v1/chat/completions" -Body $mathTask

# Test 12: Streaming response
$streamTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Explain machine learning concepts and applications in detail."
        }
    )
    stream = $true
    temperature = 0.7
    max_tokens = 400
}
Test-Endpoint -TestName "Streaming Response" -Endpoint "/v1/chat/completions" -Body $streamTask

Write-Host "Test completed! Generating report..." -ForegroundColor Green
Write-Host ""

# Generate test report
Write-Host "Test Results Summary" -ForegroundColor Magenta
Write-Host "=" * 50 -ForegroundColor Gray

$successCount = ($testResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$totalCount = $testResults.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Success Rate: $([Math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor Cyan
Write-Host ""

Write-Host "Detailed Results:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    $statusColor = if ($result.Status -eq "SUCCESS") { "Green" } else { "Red" }
    Write-Host "$($result.Status) $($result.Test) - $($result.Duration)" -ForegroundColor $statusColor
    if ($result.Error) {
        Write-Host "   Error: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Comprehensive testing completed!" -ForegroundColor Green
