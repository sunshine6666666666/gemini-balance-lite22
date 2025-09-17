# 测试聊天完成接口

$headers = @{
    'Authorization' = 'Bearer AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c'
    'Content-Type' = 'application/json'
}

$body = @{
    model = 'gpt-3.5-turbo'
    messages = @(
        @{
            role = 'user'
            content = 'Hello! Please respond with a short greeting.'
        }
    )
    max_tokens = 50
} | ConvertTo-Json -Depth 3

Write-Host "Testing chat completions..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/v1/chat/completions" -Method Post -Headers $headers -Body $body
    Write-Host "Success! Response:"
    Write-Host $response.choices[0].message.content
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
