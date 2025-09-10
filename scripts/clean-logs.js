#!/usr/bin/env node

/**
 * @功能概述: 清理项目中所有冗余的console.log语句，为重新设计日志系统做准备
 * @执行方式: node scripts/clean-logs.js
 * @处理范围: src/目录下的所有.js和.mjs文件
 * @清理策略: 保留ERROR级别日志，移除DEBUG和INFO级别的冗余日志
 */

const fs = require('fs');
const path = require('path');

// 需要处理的文件目录
const TARGET_DIRS = ['src', 'api'];

// 需要保留的日志模式（错误和关键信息）
const KEEP_PATTERNS = [
    /console\.error\(/,
    /console\.warn\(/,
    // 保留包含"ERROR"、"WARN"、"CRITICAL"的日志
    /console\.log\(.*(?:ERROR|WARN|CRITICAL|EXCEPTION)/i,
];

// 需要删除的日志模式
const REMOVE_PATTERNS = [
    // 删除步骤追踪日志
    /console\.log\(.*\[步骤\s*\d+/,
    // 删除SUCCESS标记日志
    /console\.log\(.*SUCCESS/,
    // 删除详细的调试信息
    /console\.log\(.*logPrefix.*步骤/,
    // 删除重复的验证日志
    /console\.log\(.*验证.*通过/,
    // 删除详细的请求体日志
    /console\.log\(.*请求体.*JSON\.stringify/,
    // 删除负载均衡详细日志（保留关键信息）
    /console\.log\(.*时间窗口计算/,
    /console\.log\(.*选中索引.*时间片大小/,
];

/**
 * @功能概述: 递归获取目录下所有JavaScript文件
 * @param {string} dir - 目录路径
 * @returns {string[]} 文件路径数组
 */
function getJSFiles(dir) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        return files;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...getJSFiles(fullPath));
        } else if (item.endsWith('.js') || item.endsWith('.mjs')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

/**
 * @功能概述: 检查日志行是否应该保留
 * @param {string} line - 代码行
 * @returns {boolean} 是否保留
 */
function shouldKeepLog(line) {
    // 检查是否匹配保留模式
    for (const pattern of KEEP_PATTERNS) {
        if (pattern.test(line)) {
            return true;
        }
    }
    
    // 检查是否匹配删除模式
    for (const pattern of REMOVE_PATTERNS) {
        if (pattern.test(line)) {
            return false;
        }
    }
    
    // 默认删除所有其他console.log
    if (line.includes('console.log(')) {
        return false;
    }
    
    return true;
}

/**
 * @功能概述: 清理单个文件中的日志
 * @param {string} filePath - 文件路径
 * @returns {object} 清理统计信息
 */
function cleanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const cleanedLines = [];
    
    let removedCount = 0;
    let keptCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('console.')) {
            if (shouldKeepLog(line)) {
                cleanedLines.push(line);
                keptCount++;
            } else {
                // 删除这行，但保留空行以维持代码结构
                cleanedLines.push('');
                removedCount++;
            }
        } else {
            cleanedLines.push(line);
        }
    }
    
    // 移除连续的空行
    const finalLines = [];
    let consecutiveEmpty = 0;
    
    for (const line of cleanedLines) {
        if (line.trim() === '') {
            consecutiveEmpty++;
            if (consecutiveEmpty <= 1) {
                finalLines.push(line);
            }
        } else {
            consecutiveEmpty = 0;
            finalLines.push(line);
        }
    }
    
    // 写回文件
    fs.writeFileSync(filePath, finalLines.join('\n'));
    
    return { removedCount, keptCount };
}

/**
 * @功能概述: 主执行函数
 */
function main() {
    console.log('🧹 开始清理项目日志...\n');
    
    let totalRemoved = 0;
    let totalKept = 0;
    let filesProcessed = 0;
    
    for (const dir of TARGET_DIRS) {
        const files = getJSFiles(dir);
        
        console.log(`📁 处理目录: ${dir} (${files.length} 个文件)`);
        
        for (const file of files) {
            const stats = cleanFile(file);
            
            if (stats.removedCount > 0 || stats.keptCount > 0) {
                console.log(`  📄 ${file}: 删除 ${stats.removedCount} 行, 保留 ${stats.keptCount} 行`);
                filesProcessed++;
            }
            
            totalRemoved += stats.removedCount;
            totalKept += stats.keptCount;
        }
    }
    
    console.log('\n✅ 日志清理完成!');
    console.log(`📊 统计信息:`);
    console.log(`  - 处理文件: ${filesProcessed} 个`);
    console.log(`  - 删除日志: ${totalRemoved} 行`);
    console.log(`  - 保留日志: ${totalKept} 行`);
    console.log(`  - 清理率: ${((totalRemoved / (totalRemoved + totalKept)) * 100).toFixed(1)}%`);
    
    console.log('\n🎯 下一步: 重新设计简洁的日志系统');
}

// 执行清理
main();
