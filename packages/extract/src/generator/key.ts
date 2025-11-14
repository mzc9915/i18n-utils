import { createHash } from 'crypto';

/**
 * 生成翻译 key
 * 格式: {namespace}_{hash}
 * 
 * @param text 文本内容（参数化后的）
 * @param namespace 命名空间
 * @param hashLength hash 长度，默认 8
 * @returns 翻译 key，例如: 'product_a7f9e2c1'
 * 
 * @example
 * generateKey('你好，{userName}!', 'user') // 'user_a7f9e2c1'
 * generateKey('提交', 'product') // 'product_9f86d081'
 */
export function generateKey(
  text: string,
  namespace: string,
  hashLength: number = 8
): string {
  const hash = createHash('md5')
    .update(text)
    .digest('hex')
    .substring(0, hashLength);

  return `${namespace}_${hash}`;
}

/**
 * 批量生成 key，并处理冲突
 * @param texts 文本列表
 * @param namespace 命名空间
 * @returns key 到文本的映射
 */
export function generateKeys(
  texts: Array<{ text: string; [key: string]: any }>,
  namespace: string
): Map<string, any> {
  const keyMap = new Map<string, any>();
  const existingKeys = new Set<string>();

  for (const item of texts) {
    let key = generateKey(item.text, namespace);

    // 处理冲突：如果 key 已存在且文本不同，添加序号
    if (existingKeys.has(key)) {
      const existing = keyMap.get(key);
      if (existing && existing.text !== item.text) {
        key = resolveConflict(item.text, namespace, existingKeys);
      }
    }

    existingKeys.add(key);
    keyMap.set(key, { ...item, key });
  }

  return keyMap;
}

/**
 * 解决 key 冲突
 * @param text 文本
 * @param namespace 命名空间
 * @param existingKeys 已存在的 key 集合
 * @param index 序号
 * @returns 新的 key
 */
function resolveConflict(
  text: string,
  namespace: string,
  existingKeys: Set<string>,
  index: number = 1
): string {
  const baseKey = generateKey(text, namespace);
  const newKey = `${baseKey}_${index}`;

  if (existingKeys.has(newKey)) {
    return resolveConflict(text, namespace, existingKeys, index + 1);
  }

  return newKey;
}

