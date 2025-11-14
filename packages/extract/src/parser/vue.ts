import { parse as parseSFC } from '@vue/compiler-sfc';
import { readFileSync } from 'fs';
import { basename } from 'path';

/**
 * Vue SFC 解析结果
 */
export interface VueSFCResult {
  /** 文件路径 */
  filePath: string;
  
  /** 组件名（从文件名推断） */
  componentName: string;
  
  /** Template 内容 */
  template: {
    content: string;
    line: number; // template 标签起始行号
  } | null;
  
  /** Script 内容 */
  script: {
    content: string;
    line: number; // script 标签起始行号
    isSetup: boolean; // 是否是 <script setup>
  } | null;
}

/**
 * 解析 Vue SFC 文件
 * @param filePath 文件路径
 * @returns 解析结果
 */
export function parseVueFile(filePath: string): VueSFCResult {
  // 读取文件内容
  const content = readFileSync(filePath, 'utf-8');
  
  // 解析 SFC
  const { descriptor, errors } = parseSFC(content, {
    filename: filePath,
  });
  
  // 处理解析错误
  if (errors.length > 0) {
    console.warn(`⚠️  解析 Vue 文件时出现警告: ${filePath}`);
    errors.forEach((err) => console.warn(`   ${err.message}`));
  }
  
  // 提取组件名（从文件名推断）
  const componentName = getComponentName(filePath);
  
  // 提取 template
  const template = descriptor.template
    ? {
        content: descriptor.template.content,
        line: descriptor.template.loc.start.line,
      }
    : null;
  
  // 提取 script（优先 script，其次 scriptSetup）
  const scriptBlock = descriptor.script || descriptor.scriptSetup;
  const script = scriptBlock
    ? {
        content: scriptBlock.content,
        line: scriptBlock.loc.start.line,
        isSetup: !!descriptor.scriptSetup,
      }
    : null;
  
  return {
    filePath,
    componentName,
    template,
    script,
  };
}

/**
 * 从文件路径推断组件名
 * @param filePath 文件路径
 * @returns 组件名
 * 
 * @example
 * 'src/views/ProductList.vue' -> 'ProductList'
 * 'src/components/user/Profile.vue' -> 'Profile'
 */
function getComponentName(filePath: string): string {
  const fileName = basename(filePath, '.vue');
  
  // 转换为 PascalCase
  return fileName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

