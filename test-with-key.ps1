# 测试带有API Key的请求
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer AIzaSyTest-Key-For-Testing-12345"
}

$bodyData = @{
    model = "gemini-1.5-flash"
    messages = @(
        @{
            role = "user"
            content = "Hello, how are you?"
        }
    )
    temperature = 0.7
    max_tokens = 100
}

$body = $bodyData | ConvertTo-Json -Depth 10

Write-Host "发送带API Key的测试请求..."
Write-Host "API Key: AIzaSyTest-Key-For-Testing-12345"

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
