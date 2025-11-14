import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ExtractResult, ExtractedText } from '../types';

/**
 * 输出选项
 */
export interface OutputOptions {
  /** 输出目录 */
  outputDir: string;
  
  /** 是否生成翻译文件模板 */
  generateLocales?: boolean;
  
  /** 语言列表 */
  locales?: string[];
}

/**
 * 输出提取结果到 JSON 文件
 */
export function outputToJson(
  result: ExtractResult,
  outputPath: string
): void {
  try {
    // 确保目录存在
    mkdirSync(dirname(outputPath), { recursive: true });
    
    // 写入文件
    writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    
    console.log(`\n✅ 已保存到: ${outputPath}`);
  } catch (error) {
    console.error(`❌ 保存失败: ${outputPath}`);
    console.error(error);
  }
}

/**
 * 生成翻译文件模板
 */
export function generateLocaleFiles(
  result: ExtractResult,
  outputDir: string,
  locales: string[] = ['zh-CN', 'en-US']
): void {
  try {
    // 确保目录存在
    mkdirSync(outputDir, { recursive: true });
    
    // 生成每个语言的文件
    for (const locale of locales) {
      const translations: Record<string, string> = {};
      
      // 填充翻译 key
      for (const text of result.texts) {
        if (locale === 'zh-CN') {
          // 中文：使用原文
          translations[text.key] = text.text;
        } else {
          // 其他语言：留空待翻译
          translations[text.key] = '';
        }
      }
      
      const filePath = `${outputDir}/${locale}.json`;
      writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf-8');
      
      console.log(`✅ 已生成翻译文件: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 生成翻译文件失败`);
    console.error(error);
  }
}

/**
 * 生成统计报告
 */
export function generateReport(result: ExtractResult): string {
  const report: string[] = [];
  
  report.push('📊 提取统计报告');
  report.push('='.repeat(50));
  report.push('');
  
  // 基本统计
  report.push(`命名空间: ${result.namespace}`);
  report.push(`文件数量: ${result.stats.files}`);
  report.push(`文本总数: ${result.stats.total}`);
  report.push('');
  
  // 按类型统计
  const typeStats = result.texts.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  report.push('按类型统计:');
  Object.entries(typeStats)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const percentage = ((count / result.stats.total) * 100).toFixed(1);
      report.push(`  ${type.padEnd(15)} ${count.toString().padStart(5)} (${percentage}%)`);
    });
  report.push('');
  
  // 参数化统计
  const withParams = result.texts.filter(t => t.params && t.params.length > 0);
  report.push(`参数化文本: ${withParams.length} (${((withParams.length / result.stats.total) * 100).toFixed(1)}%)`);
  report.push('');
  
  // 文件统计（Top 10）
  const fileStats = result.texts.reduce((acc, item) => {
    const file = item.location.file;
    acc[file] = (acc[file] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  report.push('文本最多的文件 (Top 10):');
  Object.entries(fileStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([file, count], index) => {
      const fileName = file.split('/').pop() || file;
      report.push(`  ${(index + 1).toString().padStart(2)}. ${fileName.padEnd(40)} ${count}`);
    });
  
  return report.join('\n');
}

