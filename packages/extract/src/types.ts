/**
 * 提取选项
 */
export interface ExtractOptions {
  /**
   * 包含的文件模式（支持 glob）
   * @example 'src/**/*.vue'
   * @example ['src/**/*.vue', 'components/**/*.vue']
   */
  include: string | string[];
  
  /**
   * 命名空间（用于生成翻译 key）
   * @example 'product' -> 生成 'product_a7f9e2c1'
   */
  namespace: string;
  
  /**
   * 排除的文件模式（可选）
   * @default ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
   */
  exclude?: string[];
  
  /**
   * 工作目录（可选）
   * @default process.cwd()
   */
  cwd?: string;
}

/**
 * 提取结果
 */
export interface ExtractResult {
  /** 命名空间 */
  namespace: string;
  
  /** 提取的文本列表 */
  texts: ExtractedText[];
  
  /** 统计信息 */
  stats: {
    total: number;
    files: number;
  };
}

/**
 * 提取的文本
 */
export interface ExtractedText {
  /** 翻译 key (namespace_hash) */
  key: string;
  
  /** 提取的文本（参数化后） */
  text: string;
  
  /** 原始文本 */
  originalText?: string;
  
  /** 文本类型 */
  type: 'text' | 'attribute' | 'string' | 'template' | 'concatenation';
  
  /** 参数信息（动态内容） */
  params?: TextParam[];
  
  /** 位置信息 */
  location: TextLocation;
  
  /** 代码上下文 */
  context: TextContext;
  
  /** 替换建议 */
  replacement: TextReplacement;
}

/**
 * 文本参数
 */
export interface TextParam {
  /** 参数名 */
  name: string;
  
  /** 表达式字符串 */
  expression: string;
}

/**
 * 位置信息
 */
export interface TextLocation {
  /** 文件路径 */
  file: string;
  
  /** 行号 */
  line: number;
  
  /** 列号 */
  column: number;
}

/**
 * 代码上下文
 */
export interface TextContext {
  /** 组件名 */
  componentName?: string;
  
  /** 组件路径 */
  componentPath?: string;
  
  /** 父标签 (template) */
  parentTag?: string;
  
  /** 属性名 (template) */
  attributeName?: string;
  
  /** 变量名 (script) */
  variableName?: string;
  
  /** 属性名 (script) */
  propertyName?: string;
  
  /** 作用域 (script) */
  scope?: 'data' | 'computed' | 'methods' | 'props' | 'setup';
}

/**
 * 替换建议
 */
export interface TextReplacement {
  /** Template 中的替换代码 */
  template?: string;
  
  /** Script 中的替换代码 */
  script?: string;
}

