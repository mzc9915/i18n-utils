import fg from 'fast-glob';
import { ExtractOptions, ExtractResult } from './types';
import { parseVueFile } from './parser/vue';
import { extractFromTemplate } from './parser/template';
import { extractFromScript } from './parser/script';
import { deduplicate, printDedupReport } from './utils/dedup';
import { outputToJson, generateLocaleFiles, generateReport } from './utils/output';

/**
 * 提取 i18n 文本
 */
export async function extract(options: ExtractOptions): Promise<ExtractResult> {
  const {
    include,
    namespace,
    cwd = process.cwd(),
    exclude = ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
  } = options;

  // 1. 解析文件列表
  const fileList = await resolveFiles(include, cwd, exclude);

  // 2. 提取每个文件
  const allTexts = [];
  
  for (const file of fileList) {
    try {
      // 解析 Vue 文件
      const vueFile = parseVueFile(file);
      
      // 提取 template 中的文本
      if (vueFile.template) {
        const templateResult = extractFromTemplate(
          vueFile.template.content,
          file,
          vueFile.componentName,
          namespace,
          vueFile.template.line
        );
        allTexts.push(...templateResult.texts);
      }
      
      // 提取 script 中的文本
      if (vueFile.script) {
        const scriptResult = extractFromScript(
          vueFile.script.content,
          file,
          vueFile.componentName,
          namespace,
          vueFile.script.line
        );
        allTexts.push(...scriptResult.texts);
      }
      
    } catch (error) {
      console.warn(`⚠️  处理文件失败: ${file}`);
      console.warn(error);
    }
  }

  // 3. 去重
  const dedupResult = deduplicate(allTexts);

  // 4. 返回结果
  return {
    namespace,
    texts: dedupResult.texts,
    stats: {
      total: dedupResult.texts.length,
      files: fileList.length,
    },
  };
}

/**
 * 解析文件列表
 */
async function resolveFiles(
  include: string | string[],
  cwd: string,
  exclude: string[]
): Promise<string[]> {
  const patterns = Array.isArray(include) ? include : [include];
  
  const fileList = await fg(patterns, {
    cwd,
    ignore: exclude,
    absolute: true,
  });

  return fileList;
}

// 导出工具函数
export { outputToJson, generateLocaleFiles, generateReport } from './utils/output';
export { deduplicate, printDedupReport } from './utils/dedup';

// 导出类型
export * from './types';

