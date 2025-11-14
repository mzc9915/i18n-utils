import { parse as parseJS } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { hasChinese, shouldExclude } from '../utils/chinese';
import { generateKey } from '../generator/key';
import type { ExtractedText, TextParam } from '../types';

/**
 * Script 提取结果
 */
export interface ScriptExtractResult {
  texts: ExtractedText[];
}

/**
 * 从 Vue script 中提取文本
 * @param scriptContent script 内容
 * @param filePath 文件路径
 * @param componentName 组件名
 * @param namespace 命名空间
 * @param scriptStartLine script 标签起始行号
 * @returns 提取结果
 */
export function extractFromScript(
  scriptContent: string,
  filePath: string,
  componentName: string,
  namespace: string,
  scriptStartLine: number = 1
): ScriptExtractResult {
  const texts: ExtractedText[] = [];

  try {
    // 解析 JavaScript/TypeScript
    const ast = parseJS(scriptContent, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
      ],
    });

    // 遍历 AST
    traverse(ast, {
      // 1. 字符串字面量
      StringLiteral(path) {
        const text = path.node.value;

        // 排除 import 语句
        if (path.findParent((p) => p.isImportDeclaration())) {
          return;
        }

        // 排除对象的 key
        if (t.isObjectProperty(path.parent) && path.parent.key === path.node) {
          return;
        }

        // 排除对象方法的 key
        if (t.isObjectMethod(path.parent) && path.parent.key === path.node) {
          return;
        }

        // 检查是否包含中文
        if (!hasChinese(text)) {
          return;
        }

        // 获取上下文
        const context = analyzeContext(path);

        // 排除不需要的文本
        if (shouldExclude(text, context)) {
          return;
        }

        texts.push(createScriptResult(
          text,
          'string',
          filePath,
          componentName,
          namespace,
          scriptStartLine + (path.node.loc?.start.line || 1) - 1,
          path.node.loc?.start.column || 0,
          context
        ));
      },

      // 2. 模板字符串
      TemplateLiteral(path) {
        const node = path.node;
        const quasis = node.quasis;
        const expressions = node.expressions;

        // 检查是否包含中文
        const textParts = quasis.map((q) => q.value.raw);
        const hasChineseText = textParts.some((text) => hasChinese(text));

        if (!hasChineseText) {
          return;
        }

        // 获取上下文
        const context = analyzeContext(path);

        // 生成参数化模板: `欢迎${name}使用` -> '欢迎{name}使用'
        const parameterizedText = generateParameterizedTemplate(textParts, expressions);

        texts.push(createScriptResult(
          parameterizedText.text,
          'template',
          filePath,
          componentName,
          namespace,
          scriptStartLine + (node.loc?.start.line || 1) - 1,
          node.loc?.start.column || 0,
          context,
          parameterizedText.params,
          generateTemplateOriginal(textParts, expressions)
        ));
      },

      // 3. 二元表达式（字符串拼接）
      BinaryExpression(path) {
        if (path.node.operator !== '+') {
          return;
        }

        // 检查是否是字符串拼接
        const parts = extractStringConcatenation(path.node);
        if (!parts || parts.length === 0) {
          return;
        }

        // 检查是否包含中文
        const hasChineseText = parts.some(
          (p) => p.type === 'string' && hasChinese(p.value)
        );

        if (!hasChineseText) {
          return;
        }

        // 获取上下文
        const context = analyzeContext(path);

        // 生成参数化文本: '你好，' + name + '!' -> '你好，{name}!'
        const parameterizedText = generateParameterizedFromParts(parts);

        texts.push(createScriptResult(
          parameterizedText.text,
          'concatenation',
          filePath,
          componentName,
          namespace,
          scriptStartLine + (path.node.loc?.start.line || 1) - 1,
          path.node.loc?.start.column || 0,
          context,
          parameterizedText.params,
          generateConcatenationOriginal(parts)
        ));

        // 跳过子节点，避免重复提取
        path.skip();
      },
    });
  } catch (error) {
    console.warn(`⚠️  解析 script 时出错: ${filePath}`);
    console.warn(error);
  }

  return { texts };
}

/**
 * 生成参数化模板
 */
function generateParameterizedTemplate(
  textParts: string[],
  expressions: any[]
): { text: string; params: TextParam[] } {
  let text = '';
  const params: TextParam[] = [];

  for (let i = 0; i < textParts.length; i++) {
    text += textParts[i];

    if (i < expressions.length) {
      const expr = expressions[i];
      const paramName = generateParamName(expr, i);
      text += `{${paramName}}`;
      params.push({
        name: paramName,
        expression: generateExpressionString(expr),
      });
    }
  }

  return { text, params };
}

/**
 * 生成模板字符串的原始文本
 */
function generateTemplateOriginal(textParts: string[], expressions: any[]): string {
  let result = '`';
  for (let i = 0; i < textParts.length; i++) {
    result += textParts[i];
    if (i < expressions.length) {
      result += '${...}';
    }
  }
  result += '`';
  return result;
}

/**
 * 提取字符串拼接
 */
function extractStringConcatenation(node: any): Array<{ type: string; value: string; node?: any }> | null {
  const parts: Array<{ type: string; value: string; node?: any }> = [];

  function extract(n: any): void {
    if (t.isBinaryExpression(n) && n.operator === '+') {
      extract(n.left);
      extract(n.right);
    } else if (t.isStringLiteral(n)) {
      parts.push({ type: 'string', value: n.value });
    } else {
      parts.push({ type: 'expression', value: '', node: n });
    }
  }

  extract(node);

  // 至少包含一个字符串
  const hasString = parts.some((p) => p.type === 'string');
  return hasString ? parts : null;
}

/**
 * 从拼接部分生成参数化文本
 */
function generateParameterizedFromParts(
  parts: Array<{ type: string; value: string; node?: any }>
): { text: string; params: TextParam[] } {
  let text = '';
  const params: TextParam[] = [];
  let paramIndex = 0;

  for (const part of parts) {
    if (part.type === 'string') {
      text += part.value;
    } else {
      const paramName = generateParamName(part.node, paramIndex++);
      text += `{${paramName}}`;
      params.push({
        name: paramName,
        expression: generateExpressionString(part.node),
      });
    }
  }

  return { text, params };
}

/**
 * 生成拼接的原始文本
 */
function generateConcatenationOriginal(
  parts: Array<{ type: string; value: string; node?: any }>
): string {
  return parts
    .map((p) => (p.type === 'string' ? `'${p.value}'` : '...'))
    .join(' + ');
}

/**
 * 生成参数名
 */
function generateParamName(expr: any, index: number): string {
  if (!expr) {
    return `param${index}`;
  }

  // MemberExpression: this.userName -> 'userName'
  if (t.isMemberExpression(expr)) {
    if (t.isIdentifier(expr.property)) {
      return expr.property.name;
    }
  }

  // Identifier: userName -> 'userName'
  if (t.isIdentifier(expr)) {
    return expr.name;
  }

  // 默认
  return `param${index}`;
}

/**
 * 生成表达式字符串
 */
function generateExpressionString(expr: any): string {
  if (!expr) {
    return '';
  }

  // MemberExpression: this.userName
  if (t.isMemberExpression(expr)) {
    const object = t.isThisExpression(expr.object) ? 'this' : generateExpressionString(expr.object);
    const property = t.isIdentifier(expr.property) ? expr.property.name : '';
    return `${object}.${property}`;
  }

  // Identifier: userName
  if (t.isIdentifier(expr)) {
    return expr.name;
  }

  return '...';
}

/**
 * 分析上下文
 */
function analyzeContext(path: any): Record<string, any> {
  const context: Record<string, any> = {};

  // 1. 变量声明
  const variableDeclarator = path.findParent((p: any) => p.isVariableDeclarator());
  if (variableDeclarator && t.isIdentifier(variableDeclarator.node.id)) {
    context.variableName = variableDeclarator.node.id.name;
  }

  // 2. 对象属性
  const objectProperty = path.findParent((p: any) => p.isObjectProperty());
  if (objectProperty && t.isIdentifier(objectProperty.node.key)) {
    context.propertyName = objectProperty.node.key.name;
  }

  // 3. 对象方法
  const objectMethod = path.findParent((p: any) => p.isObjectMethod());
  if (objectMethod && t.isIdentifier(objectMethod.node.key)) {
    context.methodName = objectMethod.node.key.name;
  }

  // 4. 函数调用
  const callExpression = path.findParent((p: any) => p.isCallExpression());
  if (callExpression) {
    const callee = callExpression.node.callee;
    if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
      context.functionName = callee.property.name;
    } else if (t.isIdentifier(callee)) {
      context.functionName = callee.name;
    }
  }

  // 5. 判断所在的 Vue 选项
  const parent = path.getFunctionParent();
  if (parent) {
    const grandParent = parent.parentPath;
    if (grandParent && t.isObjectProperty(grandParent.node)) {
      if (t.isIdentifier(grandParent.node.key)) {
        context.scope = grandParent.node.key.name; // data, methods, computed, etc.
      }
    }
  }

  return context;
}

/**
 * 创建提取结果
 */
function createScriptResult(
  text: string,
  type: 'string' | 'template' | 'concatenation',
  filePath: string,
  componentName: string,
  namespace: string,
  line: number,
  column: number,
  context: Record<string, any>,
  params?: TextParam[],
  originalText?: string
): ExtractedText {
  const key = generateKey(text, namespace);

  // 生成替换建议
  const replacement = generateScriptReplacement(text, type, key, params);

  return {
    key,
    text,
    originalText,
    type,
    params,
    location: {
      file: filePath,
      line,
      column,
    },
    context: {
      componentName,
      componentPath: filePath,
      ...context,
    },
    replacement,
  };
}

/**
 * 生成 Script 替换建议
 */
function generateScriptReplacement(
  text: string,
  type: 'string' | 'template' | 'concatenation',
  key: string,
  params?: TextParam[]
): { template?: string; script?: string } {
  if (!params || params.length === 0) {
    // 简单字符串
    return {
      script: `this.$t('${key}')`,
    };
  }

  // 带参数的字符串
  const paramsStr = params
    .map((p) => `${p.name}: ${p.expression}`)
    .join(', ');

  return {
    script: `this.$t('${key}', { ${paramsStr} })`,
  };
}

