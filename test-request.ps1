# PowerShell测试脚本 - 测试OpenAI格式请求
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer test-key-12345"
}

$body = @{
    model = "gemini-1.5-flash"
    messages = @(
        @{
            role = "user"
            content = "Hello, how are you?"
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10

Write-Host "发送测试请求到 OpenAI 兼容端点..."
Write-Host "请求体: $body"

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/v1/chat/completions" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "响应状态: $($response.StatusCode)"
    Write-Host "响应内容: $($response.Content)"
} catch {
    Write-Host "请求失败: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "错误响应体: $responseBody"
    }
}
