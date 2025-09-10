# UTF-8多语言测试脚本
# 目标：测试中文、德语、印度语等多种语言的编码处理

# 设置PowerShell使用UTF-8编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 | Out-Null

# 设置请求头
$headers = @{
    'x-vercel-protection-bypass' = '84kM0tfej2VEXdyQdZs6cLhCmmaePkg1'
    'Content-Type' = 'application/json; charset=utf-8'
    'Authorization' = 'Bearer AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c'
}

# 测试URL
$url = 'https://gemini-balance-lite22-f9xcnk27r-showlin666s-projects.vercel.app/v1/chat/completions'

Write-Host "🌍 开始多语言UTF-8编码测试" -ForegroundColor Green
Write-Host "目标URL: $url" -ForegroundColor Cyan

# 测试1：中文
Write-Host "`n=== 测试1：中文 ===" -ForegroundColor Yellow
$chineseBody = @{
    model = 'gemini-2.5-flash'
    messages = @(
        @{
            role = 'user'
            content = '你好，请用中文简单回复'
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "请求体: $chineseBody" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($chineseBody)) -TimeoutSec 45
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content)
    Write-Host "响应内容: $responseContent" -ForegroundColor White
} catch {
    Write-Host "中文测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试2：德语
Write-Host "`n=== 测试2：德语 ===" -ForegroundColor Yellow
$germanBody = @{
    model = 'gemini-2.5-flash'
    messages = @(
        @{
            role = 'user'
            content = 'Hallo, bitte antworten Sie auf Deutsch'
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "请求体: $germanBody" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($germanBody)) -TimeoutSec 45
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content)
    Write-Host "响应内容: $responseContent" -ForegroundColor White
} catch {
    Write-Host "德语测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试3：印地语
Write-Host "`n=== 测试3：印地语 ===" -ForegroundColor Yellow
$hindiBody = @{
    model = 'gemini-2.5-flash'
    messages = @(
        @{
            role = 'user'
            content = 'नमस्ते, कृपया हिंदी में उत्तर दें'
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "请求体: $hindiBody" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($hindiBody)) -TimeoutSec 45
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content)
    Write-Host "响应内容: $responseContent" -ForegroundColor White
} catch {
    Write-Host "印地语测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试4：日语
Write-Host "`n=== 测试4：日语 ===" -ForegroundColor Yellow
$japaneseBody = @{
    model = 'gemini-2.5-flash'
    messages = @(
        @{
            role = 'user'
            content = 'こんにちは、日本語で返事してください'
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "请求体: $japaneseBody" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($japaneseBody)) -TimeoutSec 45
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content)
    Write-Host "响应内容: $responseContent" -ForegroundColor White
} catch {
    Write-Host "日语测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试5：阿拉伯语
Write-Host "`n=== 测试5：阿拉伯语 ===" -ForegroundColor Yellow
$arabicBody = @{
    model = 'gemini-2.5-flash'
    messages = @(
        @{
            role = 'user'
            content = 'مرحبا، يرجى الرد باللغة العربية'
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "请求体: $arabicBody" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($arabicBody)) -TimeoutSec 45
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content)
    Write-Host "响应内容: $responseContent" -ForegroundColor White
} catch {
    Write-Host "阿拉伯语测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 多语言UTF-8编码测试完成！" -ForegroundColor Green
