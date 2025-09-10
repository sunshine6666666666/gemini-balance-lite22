#!/bin/bash

# Preview环境检查脚本
# 验证测试环境是否准备就绪

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Preview环境检查 ===${NC}"
echo ""

# 检查1：测试文件是否存在
echo -e "${YELLOW}检查1: 测试文件完整性${NC}"
files=(
    "tests/preview/quick-preview-test.sh"
    "tests/preview/comprehensive-preview-test.sh"
    "tests/preview/console-log-analysis.md"
    "tests/preview/BYPASS_TOKEN_SETUP.md"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ $file"
    else
        echo -e "  ❌ $file ${RED}(缺失)${NC}"
        all_files_exist=false
    fi
done

# 检查2：API Key配置
echo ""
echo -e "${YELLOW}检查2: API Key配置${NC}"
if [ -f ".env.local" ]; then
    echo -e "  ✅ .env.local 文件存在"
    
    if grep -q "TRUSTED_API_KEYS=" .env.local; then
        trusted_keys=$(grep "TRUSTED_API_KEYS=" .env.local | cut -d'=' -f2)
        key_count=$(echo "$trusted_keys" | tr ',' '\n' | wc -l)
        echo -e "  ✅ TRUSTED_API_KEYS 已配置 (${key_count}个)"
        
        first_key=$(echo "$trusted_keys" | cut -d',' -f1)
        if [[ $first_key == AIzaSy* ]]; then
            echo -e "  ✅ API Key格式正确"
        else
            echo -e "  ⚠️  API Key格式可能不正确"
        fi
    else
        echo -e "  ❌ TRUSTED_API_KEYS 未配置"
    fi
else
    echo -e "  ❌ .env.local 文件不存在"
fi

# 检查3：绕过令牌配置
echo ""
echo -e "${YELLOW}检查3: 绕过令牌配置${NC}"
if grep -q 'BYPASS_SECRET="your_bypass_secret_here"' tests/preview/quick-preview-test.sh; then
    echo -e "  ⚠️  绕过令牌尚未配置"
    echo -e "     ${BLUE}请按照 tests/preview/BYPASS_TOKEN_SETUP.md 获取并配置令牌${NC}"
else
    echo -e "  ✅ 绕过令牌已配置"
fi

# 检查4：网络连接
echo ""
echo -e "${YELLOW}检查4: 网络连接${NC}"
if curl.exe -s --max-time 5 "https://www.google.com" > /dev/null; then
    echo -e "  ✅ 网络连接正常"
else
    echo -e "  ❌ 网络连接异常"
fi

# 检查5：curl工具
echo ""
echo -e "${YELLOW}检查5: 测试工具${NC}"
if command -v curl.exe &> /dev/null; then
    echo -e "  ✅ curl.exe 可用"
else
    echo -e "  ❌ curl.exe 不可用"
fi

if command -v bash &> /dev/null; then
    echo -e "  ✅ bash 可用"
else
    echo -e "  ❌ bash 不可用"
fi

# 总结
echo ""
echo -e "${BLUE}=== 检查总结 ===${NC}"

if [ "$all_files_exist" = true ]; then
    echo -e "✅ 测试文件: ${GREEN}完整${NC}"
else
    echo -e "❌ 测试文件: ${RED}不完整${NC}"
fi

if [ -f ".env.local" ] && grep -q "TRUSTED_API_KEYS=" .env.local; then
    echo -e "✅ API Key: ${GREEN}已配置${NC}"
else
    echo -e "❌ API Key: ${RED}未配置${NC}"
fi

if grep -q 'BYPASS_SECRET="your_bypass_secret_here"' tests/preview/quick-preview-test.sh; then
    echo -e "⚠️  绕过令牌: ${YELLOW}待配置${NC}"
else
    echo -e "✅ 绕过令牌: ${GREEN}已配置${NC}"
fi

echo ""
echo -e "${BLUE}=== 下一步操作 ===${NC}"

if grep -q 'BYPASS_SECRET="your_bypass_secret_here"' tests/preview/quick-preview-test.sh; then
    echo -e "1. 📋 阅读 ${YELLOW}tests/preview/BYPASS_TOKEN_SETUP.md${NC}"
    echo -e "2. 🔑 从Vercel Dashboard获取绕过令牌"
    echo -e "3. ✏️  更新测试脚本中的BYPASS_SECRET"
    echo -e "4. 🧪 运行测试: ${GREEN}bash tests/preview/quick-preview-test.sh${NC}"
else
    echo -e "🚀 环境准备就绪！可以运行测试："
    echo -e "   ${GREEN}bash tests/preview/quick-preview-test.sh${NC}"
    echo -e "   ${GREEN}bash tests/preview/comprehensive-preview-test.sh${NC}"
fi

echo ""
echo -e "📊 测试完成后，请查看 ${YELLOW}Vercel Dashboard → Functions → View Function Logs${NC}"
echo -e "📖 参考 ${YELLOW}tests/preview/console-log-analysis.md${NC} 分析结果"
