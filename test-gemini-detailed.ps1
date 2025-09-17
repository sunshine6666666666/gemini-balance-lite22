# Gemini 2.5 Flash Lite 详细测试 - 多个测试案例
param(
    [string]$BaseUrl = "https://gemini-balance-lite22-bim9mr4e7-showlin666s-projects.vercel.app",
    [string]$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c",
    [string]$BypassToken = "84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"
)

Write-Host "=== Gemini 2.5 Flash Lite 详细测试 ===" -ForegroundColor Green
Write-Host "URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "Model: gemini-2.5-flash-lite" -ForegroundColor Cyan
Write-Host "Max Tokens: 2000" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

$chatUrl = "$BaseUrl/v1/chat/completions?x-vercel-protection-bypass=$BypassToken"

# 测试案例1: 简单问答
Write-Host "测试案例1: 简单问答" -ForegroundColor Yellow
$testCase1 = @{
    messages = @(
        @{
            role = "user"
            content = "你好，请简单介绍一下人工智能的发展历史。"
        }
    )
    model = "gemini-2.5-flash-lite"
    max_tokens = 2000
    temperature = 0.7
} | ConvertTo-Json -Depth 3

Write-Host "发送请求..." -ForegroundColor White
try {
    $response1 = Invoke-RestMethod -Uri $chatUrl -Method POST -Headers $headers -Body $testCase1 -TimeoutSec 30
    Write-Host "SUCCESS: $($response1.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Green
    Write-Host "Response ID: $($response1.id)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 等待5秒，让日志有时间记录
Start-Sleep -Seconds 5

# 测试案例2: 创意写作
Write-Host "测试案例2: 创意写作" -ForegroundColor Yellow
$testCase2 = @{
    messages = @(
        @{
            role = "user"
            content = "请写一首关于春天的现代诗，要求有意境，有韵律，大约100字左右。"
        }
    )
    model = "gemini-2.5-flash-lite"
    max_tokens = 2000
    temperature = 0.9
} | ConvertTo-Json -Depth 3

Write-Host "发送请求..." -ForegroundColor White
try {
    $response2 = Invoke-RestMethod -Uri $chatUrl -Method POST -Headers $headers -Body $testCase2 -TimeoutSec 30
    Write-Host "SUCCESS: $($response2.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Green
    Write-Host "Response ID: $($response2.id)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 等待5秒
Start-Sleep -Seconds 5

# 测试案例3: 技术解释
Write-Host "测试案例3: 技术解释" -ForegroundColor Yellow
$testCase3 = @{
    messages = @(
        @{
            role = "user"
            content = "请详细解释什么是区块链技术，包括其工作原理、优势和应用场景。"
        }
    )
    model = "gemini-2.5-flash-lite"
    max_tokens = 2000
    temperature = 0.3
} | ConvertTo-Json -Depth 3

Write-Host "发送请求..." -ForegroundColor White
try {
    $response3 = Invoke-RestMethod -Uri $chatUrl -Method POST -Headers $headers -Body $testCase3 -TimeoutSec 30
    Write-Host "SUCCESS: $($response3.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Green
    Write-Host "Response ID: $($response3.id)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 等待5秒
Start-Sleep -Seconds 5

# 测试案例4: 多轮对话
Write-Host "测试案例4: 多轮对话" -ForegroundColor Yellow
$testCase4 = @{
    messages = @(
        @{
            role = "user"
            content = "我想学习编程，应该从哪种语言开始？"
        },
        @{
            role = "assistant"
            content = "对于初学者，我推荐从Python开始学习编程。Python语法简洁易懂，有丰富的库和社区支持。"
        },
        @{
            role = "user"
            content = "那学习Python需要多长时间？有什么好的学习资源推荐吗？"
        }
    )
    model = "gemini-2.5-flash-lite"
    max_tokens = 2000
    temperature = 0.5
} | ConvertTo-Json -Depth 3

Write-Host "发送请求..." -ForegroundColor White
try {
    $response4 = Invoke-RestMethod -Uri $chatUrl -Method POST -Headers $headers -Body $testCase4 -TimeoutSec 30
    Write-Host "SUCCESS: $($response4.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Green
    Write-Host "Response ID: $($response4.id)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 等待5秒
Start-Sleep -Seconds 5

# 测试案例5: 复杂推理
Write-Host "测试案例5: 复杂推理" -ForegroundColor Yellow
$testCase5 = @{
    messages = @(
        @{
            role = "user"
            content = "假设你是一个城市规划师，请分析在一个人口100万的城市中建设地铁系统的利弊，并提出具体的建设建议。"
        }
    )
    model = "gemini-2.5-flash-lite"
    max_tokens = 2000
    temperature = 0.6
} | ConvertTo-Json -Depth 3

Write-Host "发送请求..." -ForegroundColor White
try {
    $response5 = Invoke-RestMethod -Uri $chatUrl -Method POST -Headers $headers -Body $testCase5 -TimeoutSec 30
    Write-Host "SUCCESS: $($response5.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Green
    Write-Host "Response ID: $($response5.id)" -ForegroundColor Gray
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== 所有测试完成 ===" -ForegroundColor Green
Write-Host "请查看Vercel日志以获取详细的JSON格式化输出" -ForegroundColor Cyan
Write-Host "日志查看地址: https://vercel.com/showlin666s-projects/gemini-balance-lite22" -ForegroundColor Cyan
