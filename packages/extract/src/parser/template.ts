import { parse as parseTemplate } from '@vue/compiler-dom';
import { hasChinese, shouldExclude } from '../utils/chinese';
import { generateKey } from '../generator/key';
import type { ExtractedText, TextLocation } from '../types';

/**
 * Template 提取结果
 */
export interface TemplateExtractResult {
  texts: ExtractedText[];
}

/**
 * 从 Vue template 中提取文本
 * @param templateContent template 内容
 * @param filePath 文件路径
 * @param componentName 组件名
 * @param namespace 命名空间
 * @param templateStartLine template 标签起始行号
 * @returns 提取结果
 */
export function extractFromTemplate(
  templateContent: string,
  filePath: string,
  componentName: string,
  namespace: string,
  templateStartLine: number = 1
): TemplateExtractResult {
  const texts: ExtractedText[] = [];

  try {
    const ast = parseTemplate(templateContent, {
      comments: false,
    });

    // 遍历 AST 提取文本
    walkNode(ast, null, (node, parent) => {
      // 1. 提取文本节点
      if (node.type === 2) { // NodeTypes.TEXT
        const text = node.content.trim();
        if (text && hasChinese(text) && !shouldExclude(text)) {
          texts.push(createTextResult(
            text,
            'text',
            filePath,
            componentName,
            namespace,
            templateStartLine + node.loc.start.line - 1,
            node.loc.start.column,
            {
              parentTag: parent?.tag,
            }
          ));
        }
      }

      // 2. 提取元素节点的属性
      if (node.type === 1 && node.props) { // NodeTypes.ELEMENT
        for (const prop of node.props) {
          // 静态属性: <input placeholder="提示文字" />
          if (prop.type === 6 && prop.value) { // NodeTypes.ATTRIBUTE
            const text = prop.value.content;
            const context = {
              parentTag: node.tag,
              attributeName: prop.name,
            };

            // 跳过应该排除的属性
            if (shouldExclude(text, context)) {
              continue;
            }

            if (hasChinese(text)) {
              texts.push(createTextResult(
                text,
                'attribute',
                filePath,
                componentName,
                namespace,
                templateStartLine + prop.loc.start.line - 1,
                prop.loc.start.column,
                context
              ));
            }
          }

          // 动态属性: :placeholder="hint"
          // 这部分在 script 中处理，这里只记录
        }
      }
    });
  } catch (error) {
    console.warn(`⚠️  解析 template 时出错: ${filePath}`);
    console.warn(error);
  }

  return { texts };
}

/**
 * 遍历 AST 节点
 */
function walkNode(
  node: any,
  parent: any,
  callback: (node: any, parent: any) => void
) {
  callback(node, parent);

  if (node.children) {
    for (const child of node.children) {
      walkNode(child, node, callback);
    }
  }
}

/**
 * 创建提取结果
 */
function createTextResult(
  text: string,
  type: 'text' | 'attribute',
  filePath: string,
  componentName: string,
  namespace: string,
  line: number,
  column: number,
  context: {
    parentTag?: string;
    attributeName?: string;
  }
): ExtractedText {
  const key = generateKey(text, namespace);

  // 生成替换建议
  const replacement = generateReplacement(text, type, key, context);

  return {
    key,
    text,
    type,
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
 * 生成替换建议
 */
function generateReplacement(
  text: string,
  type: 'text' | 'attribute',
  key: string,
  context: {
    parentTag?: string;
    attributeName?: string;
  }
): { template?: string; script?: string } {
  if (type === 'text') {
    // 文本节点: <div>文本</div> -> <div>{{ $t('key') }}</div>
    return {
      template: `{{ $t('${key}') }}`,
    };
  }

  if (type === 'attribute') {
    // 静态属性: <input placeholder="提示" /> -> <input :placeholder="$t('key')" />
    return {
      template: `:${context.attributeName}="$t('${key}')"`,
    };
  }

  return {};
}

