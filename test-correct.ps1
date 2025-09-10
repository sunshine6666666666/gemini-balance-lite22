# 正确的PowerShell测试脚本
$uri = "http://localhost:3000/v1/chat/completions"
$headers = @{}
$headers.Add("Content-Type", "application/json")
$headers.Add("Authorization", "Bearer AIzaSyTest-Key-For-Testing-12345")

$bodyObject = @{
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

$body = $bodyObject | ConvertTo-Json -Depth 10

Write-Host "发送测试请求到: $uri"
Write-Host "请求体: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body
    Write-Host "成功! 状态码: $($response.StatusCode)"
    Write-Host "响应内容: $($response.Content)"
} catch {
    Write-Host "失败: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "状态码: $statusCode"
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "错误响应: $errorBody"
        } catch {
            Write-Host "无法读取错误响应"
        }
    }
}
