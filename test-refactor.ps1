# 重构版本测试脚本

Write-Host "开始测试重构版本..." -ForegroundColor Green

# 测试1: 首页访问
Write-Host "`n📝 测试1: 首页访问" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/" -Method Get
    Write-Host "首页测试成功: $response" -ForegroundColor Green
} catch {
    Write-Host "首页测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试2: OpenAI兼容接口
Write-Host "`n📝 测试2: OpenAI兼容接口" -ForegroundColor Yellow
try {
    $headers = @{
        'Authorization' = 'Bearer AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c'
        'Content-Type' = 'application/json'
    }
    
    $body = @{
        model = 'gpt-3.5-turbo'
        messages = @(
            @{
                role = 'user'
                content = 'Hello, this is a test message.'
            }
        )
        max_tokens = 100
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/v1/chat/completions" -Method Post -Headers $headers -Body $body
    Write-Host "✅ OpenAI接口测试成功" -ForegroundColor Green
    Write-Host "📄 响应内容: $($response.choices[0].message.content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ OpenAI接口测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试3: Gemini原生接口
Write-Host "`n📝 测试3: Gemini原生接口" -ForegroundColor Yellow
try {
    $headers = @{
        'x-goog-api-key' = 'AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c'
        'Content-Type' = 'application/json'
    }
    
    $body = @{
        contents = @(
            @{
                role = 'user'
                parts = @(
                    @{
                        text = 'Hello, this is a test message for Gemini.'
                    }
                )
            }
        )
    } | ConvertTo-Json -Depth 4
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/v1beta/models/gemini-2.5-flash:generateContent" -Method Post -Headers $headers -Body $body
    Write-Host "✅ Gemini接口测试成功" -ForegroundColor Green
    Write-Host "📄 响应内容: $($response.candidates[0].content.parts[0].text)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Gemini接口测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 测试4: 模型列表
Write-Host "`n📝 测试4: 模型列表" -ForegroundColor Yellow
try {
    $headers = @{
        'Authorization' = 'Bearer test-key'
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3000/v1/models" -Method Get -Headers $headers
    Write-Host "✅ 模型列表测试成功" -ForegroundColor Green
    Write-Host "📄 可用模型: $($response.data.Count) 个" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 模型列表测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n测试完成!" -ForegroundColor Green
