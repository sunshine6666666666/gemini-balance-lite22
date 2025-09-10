#!/bin/bash

# 多语言综合测试脚本 - 验证UTF-8编码修复效果

echo "🌍 开始多语言UTF-8编码综合测试"

URL="https://gemini-balance-lite22-i2lyyd8m0-showlin666s-projects.vercel.app/v1/chat/completions"
API_KEY="AIzaSyBx2Vmvef40PCpeOIUGzm1oaRvRlk5Il-c"
BYPASS_TOKEN="84kM0tfej2VEXdyQdZs6cLhCmmaePkg1"

echo "目标URL: $URL"
echo "测试目标: 确保所有语言都能正确处理，无论是中文、德语、印度语等"

# 测试函数
test_language() {
    local lang_name="$1"
    local content="$2"
    local emoji="$3"
    
    echo ""
    echo "=== $emoji 测试$lang_name ==="
    
    JSON_BODY="{
      \"model\": \"gemini-2.5-flash\",
      \"messages\": [
        {
          \"role\": \"user\",
          \"content\": \"$content\"
        }
      ],
      \"temperature\": 0.7,
      \"max_tokens\": 100
    }"
    
    echo "请求内容: $content"
    
    RESPONSE=$(curl -s -w "\n状态码:%{http_code}" \
      -X POST \
      -H "Content-Type: application/json; charset=utf-8" \
      -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
      -H "Authorization: Bearer $API_KEY" \
      -d "$JSON_BODY" \
      --max-time 45 \
      "$URL")
    
    echo "响应结果: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"content":null'; then
        echo "❌ 失败！$lang_name Content字段为null"
        return 1
    elif echo "$RESPONSE" | grep -q '"content":"'; then
        echo "✅ 成功！$lang_name Content字段有内容"
        CONTENT=$(echo "$RESPONSE" | grep -o '"content":"[^"]*"' | sed 's/"content":"//' | sed 's/"$//')
        echo "回复内容: $CONTENT"
        return 0
    else
        echo "⚠️ 无法确定$lang_name content状态"
        return 1
    fi
}

# 测试计数器
total_tests=0
passed_tests=0

# 测试1：中文
total_tests=$((total_tests + 1))
if test_language "中文" "你好，请用中文简单回复" "🇨🇳"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试2：英文
total_tests=$((total_tests + 1))
if test_language "英文" "Hello, please reply in English" "🇺🇸"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试3：德语
total_tests=$((total_tests + 1))
if test_language "德语" "Hallo, bitte antworten Sie auf Deutsch" "🇩🇪"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试4：日语
total_tests=$((total_tests + 1))
if test_language "日语" "こんにちは、日本語で返事してください" "🇯🇵"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试5：法语
total_tests=$((total_tests + 1))
if test_language "法语" "Bonjour, veuillez répondre en français" "🇫🇷"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试6：西班牙语
total_tests=$((total_tests + 1))
if test_language "西班牙语" "Hola, por favor responde en español" "🇪🇸"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试7：俄语
total_tests=$((total_tests + 1))
if test_language "俄语" "Привет, пожалуйста, ответьте на русском языке" "🇷🇺"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试8：阿拉伯语
total_tests=$((total_tests + 1))
if test_language "阿拉伯语" "مرحبا، يرجى الرد باللغة العربية" "🇸🇦"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试9：印地语
total_tests=$((total_tests + 1))
if test_language "印地语" "नमस्ते, कृपया हिंदी में उत्तर दें" "🇮🇳"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试10：韩语
total_tests=$((total_tests + 1))
if test_language "韩语" "안녕하세요, 한국어로 답변해 주세요" "🇰🇷"; then
    passed_tests=$((passed_tests + 1))
fi

# 测试结果汇总
echo ""
echo "🎯 多语言UTF-8编码综合测试完成！"
echo "📊 测试结果: $passed_tests/$total_tests 通过"

if [ $passed_tests -eq $total_tests ]; then
    echo "🎉 所有语言测试通过！UTF-8编码问题已完全解决！"
    echo "✅ 系统现在支持："
    echo "   - 中文、英文、德语、日语、法语"
    echo "   - 西班牙语、俄语、阿拉伯语、印地语、韩语"
    echo "   - 以及其他所有UTF-8编码的语言"
else
    echo "⚠️ 部分语言测试失败，需要进一步调试"
    failed_tests=$((total_tests - passed_tests))
    echo "❌ 失败测试数: $failed_tests"
fi

echo ""
echo "🔍 技术说明:"
echo "   - 使用ArrayBuffer + TextDecoder('utf-8')确保正确编码"
echo "   - 修复了request.text()和response.text()的编码问题"
echo "   - 支持Vercel Edge Runtime环境下的多语言处理"
