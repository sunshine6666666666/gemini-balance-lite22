# 简单的POST测试
$headers = @{
    "Content-Type" = "application/json"
}

$body = '{"test": "data"}'

Write-Host "发送简单POST请求..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/v1/chat/completions" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "响应状态: $($response.StatusCode)"
    Write-Host "响应内容: $($response.Content)"
} catch {
    Write-Host "请求失败: $($_.Exception.Message)"
    Write-Host "错误详情: $($_.Exception)"
}
