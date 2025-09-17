# Gemini Balance Lite 22 - 全面测试脚本
# 基于真实请求日志格式，测试Preview环境的各种场景

param(
    [string]$BaseUrl = "https://gemini-balance-lite22-git-refactor-v2-showlin666s-projects.vercel.app",
    [string]$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
)

Write-Host "🧪 开始全面测试 Gemini Balance Lite 22 Preview环境" -ForegroundColor Green
Write-Host "🌐 测试URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "🔑 使用API Key: $($ApiKey.Substring(0,12))..." -ForegroundColor Cyan
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
        [object]$Body = $null,
        [hashtable]$CustomHeaders = @{}
    )
    
    Write-Host "📝 测试: $TestName" -ForegroundColor Yellow
    
    $testHeaders = $headers.Clone()
    foreach ($key in $CustomHeaders.Keys) {
        $testHeaders[$key] = $CustomHeaders[$key]
    }
    
    $startTime = Get-Date
    
    try {
        $url = "$BaseUrl$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $testHeaders
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            Write-Host "📦 请求体大小: $($bodyJson.Length) 字符" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $testHeaders -Body $bodyJson
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "✅ 成功 - 耗时: ${duration}ms" -ForegroundColor Green
        
        if ($response.choices -and $response.choices[0].message.content) {
            $content = $response.choices[0].message.content
            Write-Host "💬 响应内容: $($content.Substring(0, [Math]::Min(100, $content.Length)))..." -ForegroundColor Cyan
        } elseif ($response.data) {
            Write-Host "📋 返回数据: $($response.data.Count) 项" -ForegroundColor Cyan
        } else {
            Write-Host "📄 响应: $($response.ToString().Substring(0, [Math]::Min(50, $response.ToString().Length)))..." -ForegroundColor Cyan
        }
        
        $script:testResults += @{
            Test = $TestName
            Status = "✅ 成功"
            Duration = "${duration}ms"
            Error = $null
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "❌ 失败 - 耗时: ${duration}ms" -ForegroundColor Red
        Write-Host "💥 错误: $($_.Exception.Message)" -ForegroundColor Red
        
        $script:testResults += @{
            Test = $TestName
            Status = "❌ 失败"
            Duration = "${duration}ms"
            Error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

# 测试1: 基础连通性
Test-Endpoint -TestName "基础连通性检查" -Endpoint "/" -Method "GET"

# 测试2: 模型列表
Test-Endpoint -TestName "模型列表获取" -Endpoint "/v1/models" -Method "GET"

# 测试3: 简单聊天 - 基础对话
$simpleChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "你好，请简单介绍一下自己。"
        }
    )
    temperature = 0.7
    max_tokens = 100
}
Test-Endpoint -TestName "简单聊天对话" -Endpoint "/v1/chat/completions" -Body $simpleChat

# 测试4: 翻译任务 - 模拟用户真实请求
$translationTask = @{
    model = "gemini-2.5-flash-lite"
    temperature = 0
    messages = @(
        @{
            role = "system"
            content = "你是一个专业的简体中文母语译者，需将文本流畅地翻译为简体中文。仅输出译文内容，禁止解释或添加任何额外内容。"
        }
        @{
            role = "user"
            content = "翻译为简体中文：Hello world, this is a test message for translation."
        }
    )
}
Test-Endpoint -TestName "翻译任务测试" -Endpoint "/v1/chat/completions" -Body $translationTask

# 测试5: 创意写作 - 写诗
$poetryTask = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "请写一首关于秋天的七言绝句，要求意境优美，朗朗上口。"
        }
    )
    temperature = 0.8
    max_tokens = 200
}
Test-Endpoint -TestName "创意写作 - 诗歌创作" -Endpoint "/v1/chat/completions" -Body $poetryTask

# 测试6: 角色扮演 - 技术专家
$rolePlayTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "system"
            content = "你是一位资深的软件架构师，拥有20年的开发经验。请用专业但易懂的语言回答技术问题。"
        }
        @{
            role = "user"
            content = "请解释一下微服务架构的优缺点，以及什么情况下适合使用微服务？"
        }
    )
    temperature = 0.6
    max_tokens = 300
}
Test-Endpoint -TestName "角色扮演 - 技术专家咨询" -Endpoint "/v1/chat/completions" -Body $rolePlayTask

# 测试7: 代码生成
$codeGenTask = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "请用Python写一个函数，实现快速排序算法，要求包含详细注释。"
        }
    )
    temperature = 0.2
    max_tokens = 500
}
Test-Endpoint -TestName "代码生成任务" -Endpoint "/v1/chat/completions" -Body $codeGenTask

# 测试8: 多轮对话
$multiTurnChat = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "我想学习做菜，你能推荐一道简单的家常菜吗？"
        }
        @{
            role = "assistant"
            content = "我推荐西红柿炒鸡蛋，这是一道经典的家常菜，制作简单，营养丰富。"
        }
        @{
            role = "user"
            content = "那具体的制作步骤是什么呢？需要准备哪些食材？"
        }
    )
    temperature = 0.7
    max_tokens = 400
}
Test-Endpoint -TestName "多轮对话测试" -Endpoint "/v1/chat/completions" -Body $multiTurnChat

# 测试9: 长文本处理
$longTextTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = @"
请总结以下文本的主要内容：

人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。

自从人工智能诞生以来，理论和技术日益成熟，应用领域也不断扩大。可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。人工智能可以对人的意识、思维的信息过程的模拟。人工智能不是人的智能，但能像人那样思考、也可能超过人的智能。

人工智能是一门极富挑战性的科学，从事这项工作的人必须懂得计算机知识，心理学和哲学。人工智能是包括十分广泛的科学，它由不同的领域组成，如机器学习，计算机视觉等等。
"@
        }
    )
    temperature = 0.5
    max_tokens = 300
}
Test-Endpoint -TestName "长文本处理 - 文本总结" -Endpoint "/v1/chat/completions" -Body $longTextTask

# 测试10: 创意故事
$storyTask = @{
    model = "gpt-4"
    messages = @(
        @{
            role = "user"
            content = "请写一个关于时间旅行者的短故事，要求有悬念，字数控制在200字以内。"
        }
    )
    temperature = 0.9
    max_tokens = 300
}
Test-Endpoint -TestName "创意写作 - 短故事创作" -Endpoint "/v1/chat/completions" -Body $storyTask

# 测试11: 数学问题
$mathTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "请解这个数学问题：一个圆的半径是5cm，求这个圆的面积和周长。请详细说明计算过程。"
        }
    )
    temperature = 0.1
    max_tokens = 200
}
Test-Endpoint -TestName "数学问题求解" -Endpoint "/v1/chat/completions" -Body $mathTask

# 测试12: 情感分析
$sentimentTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "请分析以下文本的情感倾向：'今天天气真好，阳光明媚，心情特别愉快，感觉一切都很美好！'"
        }
    )
    temperature = 0.3
    max_tokens = 150
}
Test-Endpoint -TestName "情感分析任务" -Endpoint "/v1/chat/completions" -Body $sentimentTask

# 测试13: 流式响应测试
$streamTask = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "请详细介绍一下机器学习的基本概念和应用领域。"
        }
    )
    stream = $true
    temperature = 0.7
    max_tokens = 400
}
Test-Endpoint -TestName "流式响应测试" -Endpoint "/v1/chat/completions" -Body $streamTask

Write-Host "🎯 测试完成！生成测试报告..." -ForegroundColor Green
Write-Host ""

# 生成测试报告
Write-Host "📊 测试结果汇总" -ForegroundColor Magenta
Write-Host "=" * 50 -ForegroundColor Gray

$successCount = ($testResults | Where-Object { $_.Status -like "*成功*" }).Count
$failCount = ($testResults | Where-Object { $_.Status -like "*失败*" }).Count
$totalCount = $testResults.Count

Write-Host "总测试数: $totalCount" -ForegroundColor White
Write-Host "成功: $successCount" -ForegroundColor Green
Write-Host "失败: $failCount" -ForegroundColor Red
Write-Host "成功率: $([Math]::Round($successCount / $totalCount * 100, 2))%" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 详细结果:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    Write-Host "$($result.Status) $($result.Test) - $($result.Duration)" -ForegroundColor White
    if ($result.Error) {
        Write-Host "   错误: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 全面测试完成！" -ForegroundColor Green
