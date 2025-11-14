import type { ExtractedText } from '../types';

/**
 * 去重结果
 */
export interface DedupResult {
  /** 去重后的文本 */
  texts: ExtractedText[];
  
  /** 重复的文本（被复用的） */
  duplicates: Array<{
    key: string;
    text: string;
    count: number;
    locations: string[];
  }>;
  
  /** 冲突（相同 key 不同文本） */
  conflicts: Array<{
    key: string;
    texts: Array<{
      text: string;
      location: string;
    }>;
  }>;
}

/**
 * 文本去重
 * 相同文本在同一 namespace 下使用同一个 key
 */
export function deduplicate(texts: ExtractedText[]): DedupResult {
  const keyMap = new Map<string, ExtractedText>();
  const keyLocations = new Map<string, string[]>();
  const keyTexts = new Map<string, Set<string>>();
  
  // 收集所有 key 和对应的文本
  for (const text of texts) {
    const { key, location } = text;
    const locationStr = `${location.file}:${location.line}`;
    
    // 记录位置
    if (!keyLocations.has(key)) {
      keyLocations.set(key, []);
    }
    keyLocations.get(key)!.push(locationStr);
    
    // 记录文本
    if (!keyTexts.has(key)) {
      keyTexts.set(key, new Set());
    }
    keyTexts.get(key)!.add(text.text);
    
    // 保留第一次出现的
    if (!keyMap.has(key)) {
      keyMap.set(key, text);
    }
  }
  
  // 找出重复项（复用）
  const duplicates = Array.from(keyLocations.entries())
    .filter(([_, locations]) => locations.length > 1)
    .map(([key, locations]) => ({
      key,
      text: keyMap.get(key)!.text,
      count: locations.length,
      locations,
    }));
  
  // 找出冲突（同 key 不同文本）
  const conflicts = Array.from(keyTexts.entries())
    .filter(([_, texts]) => texts.size > 1)
    .map(([key, texts]) => ({
      key,
      texts: Array.from(texts).map((text) => ({
        text,
        location: keyLocations.get(key)?.[0] || '',
      })),
    }));
  
  return {
    texts: Array.from(keyMap.values()),
    duplicates,
    conflicts,
  };
}

/**
 * 打印去重报告
 */
export function printDedupReport(result: DedupResult): void {
  console.log('\n📊 去重统计:');
  console.log(`   原始文本: ${result.texts.length + result.duplicates.reduce((sum, d) => sum + d.count - 1, 0)}`);
  console.log(`   去重后: ${result.texts.length}`);
  console.log(`   复用: ${result.duplicates.length} 个 key 被复用 ${result.duplicates.reduce((sum, d) => sum + d.count - 1, 0)} 次`);
  
  if (result.conflicts.length > 0) {
    console.log(`\n⚠️  发现 ${result.conflicts.length} 个 key 冲突:`);
    result.conflicts.slice(0, 5).forEach((conflict) => {
      console.log(`   ${conflict.key}:`);
      conflict.texts.forEach((t) => {
        console.log(`     - "${t.text}"`);
      });
    });
    if (result.conflicts.length > 5) {
      console.log(`   ... 还有 ${result.conflicts.length - 5} 个冲突`);
    }
  }
  
  if (result.duplicates.length > 0 && result.duplicates.length <= 10) {
    console.log(`\n♻️  复用最多的文本 (Top ${Math.min(10, result.duplicates.length)}):`);
    result.duplicates
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .forEach((dup) => {
        console.log(`   "${dup.text}" - 复用 ${dup.count} 次`);
      });
  }
}

