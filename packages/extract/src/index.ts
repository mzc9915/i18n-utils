import fg from 'fast-glob';
import { ExtractOptions, ExtractResult } from './types';

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
    // TODO: 提取文件中的文本
    console.log(`Processing: ${file}`);
  }

  // 3. 返回结果
  return {
    namespace,
    texts: allTexts,
    stats: {
      total: allTexts.length,
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

// 导出类型
export * from './types';

