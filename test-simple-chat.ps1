# Simple Chat Test to isolate the issue
$PreviewUrl = "https://gemini-balance-lite22-4uy0mrkyk-showlin666s-projects.vercel.app"
$ApiKey = "AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
$BypassToken = "84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

Write-Host "Simple Chat Test" -ForegroundColor Green

$headers = @{
    'Authorization' = "Bearer $ApiKey"
    'Content-Type' = 'application/json'
    'x-vercel-protection-bypass' = $BypassToken
}

$url = "$PreviewUrl/v1/chat/completions?vercel-protection-bypass=$BypassToken"

$body = @{
    model = "gpt-3.5-turbo"
    messages = @(
        @{
            role = "user"
            content = "Hi"
        }
    )
    max_tokens = 10
} | ConvertTo-Json -Depth 10

Write-Host "URL: $url"
Write-Host "Body: $body"

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 30
    Write-Host "SUCCESS: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Body: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
}
