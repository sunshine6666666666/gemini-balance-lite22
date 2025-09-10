# 简化的中文UTF-8测试脚本

# 设置PowerShell使用UTF-8编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 | Out-Null

Write-Host "🌍 开始中文UTF-8编码测试" -ForegroundColor Green

# 设置请求头
$headers = @{
    'x-vercel-protection-bypass' = '84kM0tfej2VEXdyQdZs6cLhCmmaePkg1'
    'Content-Type' = 'application/json; charset=utf-8'
    'Authorization' = 'Bearer AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c'
}

# 测试URL
$url = 'https://gemini-balance-lite22-f9xcnk27r-showlin666s-projects.vercel.app/v1/chat/completions'

Write-Host "目标URL: $url" -ForegroundColor Cyan

# 测试中文
Write-Host "`n=== 测试中文 ===" -ForegroundColor Yellow

# 创建请求体
$requestData = @{
    model = "gemini-2.5-flash"
    messages = @(
        @{
            role = "user"
            content = "你好，请用中文简单回复"
        }
    )
    temperature = 0.7
    max_tokens = 100
}

$jsonBody = $requestData | ConvertTo-Json -Depth 10 -Compress
Write-Host "请求体: $jsonBody" -ForegroundColor Gray

try {
    # 使用UTF-8编码发送请求
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 45
    
    Write-Host "状态码: $($response.StatusCode)" -ForegroundColor Green
    
    # 使用UTF-8解码响应
    $responseContent = [System.Text.Encoding]::UTF8.GetString($response.Content)
    Write-Host "响应内容: $responseContent" -ForegroundColor White
    
    # 解析JSON检查content字段
    $responseJson = $responseContent | ConvertFrom-Json
    if ($responseJson.choices -and $responseJson.choices[0].message.content) {
        Write-Host "✅ 成功！Content字段有内容" -ForegroundColor Green
        Write-Host "Content: $($responseJson.choices[0].message.content)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ 失败！Content字段为空或null" -ForegroundColor Red
    }
    
} catch {
    Write-Host "中文测试失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "错误响应: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n🎯 中文UTF-8编码测试完成！" -ForegroundColor Green
