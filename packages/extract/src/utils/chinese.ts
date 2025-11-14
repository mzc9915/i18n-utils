/**
 * 检测字符串是否包含中文
 * @param text 待检测的文本
 * @returns 是否包含中文
 */
export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 检测字符串是否应该被排除（不需要翻译）
 * @param text 待检测的文本
 * @param context 上下文信息
 * @returns 是否应该排除
 */
export function shouldExclude(text: string, context?: any): boolean {
  // 排除模式
  const excludePatterns = [
    /^[./]/, // 路径: ./xxx, /xxx
    /^@/, // 事件: @click
    /^:/, // 绑定: :title
    /^v-/, // 指令: v-if
    /^[a-z][a-zA-Z]*$/, // 纯英文变量名
    /^https?:\/\//, // URL
  ];

  // 匹配任一排除模式
  if (excludePatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  // CSS 类名
  if (context?.attributeName === 'class') {
    return true;
  }

  // 组件名
  if (context?.attributeName === 'is') {
    return true;
  }

  // 只包含空格、数字、标点的文本
  if (/^[\s\d\p{P}]+$/u.test(text)) {
    return true;
  }

  return false;
}

