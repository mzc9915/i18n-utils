# i18n-extract Vue 项目提取方案

## 一、技术方案

### 1.1 核心原则

**✅ 采用 AST 解析，不用正则匹配**

**原因**：
- 正则匹配无法理解代码结构
- 无法获取上下文信息（父元素、变量名等）
- 容易误匹配（注释、字符串中的特殊字符）
- 无法处理复杂场景（模板字符串、JSX 表达式）

**AST 方案优势**：
- 准确理解代码结构
- 获取丰富的上下文信息
- 精确定位需要翻译的文本
- 支持复杂语法

---

## 二、Vue 项目解析流程

### 2.1 Vue SFC 文件结构

Vue 单文件组件（.vue）包含三个部分：

```vue
<template>
  <div>{{ message }}</div>
</template>

<script>
export default {
  data() {
    return {
      message: '你好'
    }
  }
}
</script>

<style scoped>
/* 样式不需要翻译 */
</style>
```

### 2.2 完整解析流程

```
Vue 文件 (.vue)
    ↓
┌──────────────────────────────────────┐
│  Step 1: 使用 @vue/compiler-sfc       │
│  解析 SFC，分离 template/script/style │
└──────────────────────────────────────┘
    ↓
    ├─→ <template> 部分
    │      ↓
    │   ┌────────────────────────────────┐
    │   │ Step 2: 使用 @vue/compiler-dom  │
    │   │ 解析 template 为 AST           │
    │   └────────────────────────────────┘
    │      ↓
    │   提取内容:
    │   - 文本节点
    │   - 插值表达式 {{ }}
    │   - 指令绑定 v-bind, :title
    │   - 指令参数 v-if, v-for 中的文本
    │
    └─→ <script> 部分
           ↓
       ┌────────────────────────────────┐
       │ Step 3: 使用 @babel/parser      │
       │ 解析 JavaScript 为 AST         │
       └────────────────────────────────┘
           ↓
       提取内容:
       - 字符串字面量
       - 对象属性值
       - 数组元素
       - 模板字符串
```

---

## 三、具体实现方案

### 3.1 工具链选择

```javascript
// Vue SFC 解析
import { parse as parseSFC } from '@vue/compiler-sfc';

// Vue Template 解析
import { parse as parseTemplate } from '@vue/compiler-dom';

// JavaScript 解析
import { parse as parseJS } from '@babel/parser';
import traverse from '@babel/traverse';
```

### 3.2 Step 1: 解析 Vue SFC

```typescript
import { parse as parseSFC } from '@vue/compiler-sfc';
import fs from 'fs';

function parseVueFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 解析 SFC
  const { descriptor, errors } = parseSFC(content, {
    filename: filePath,
  });
  
  if (errors.length > 0) {
    console.error('解析错误:', errors);
    return null;
  }
  
  return {
    template: descriptor.template,  // <template> 内容
    script: descriptor.script,      // <script> 内容
    scriptSetup: descriptor.scriptSetup, // <script setup> (Vue 3)
    styles: descriptor.styles,      // <style> 内容（不处理）
  };
}
```

**输出示例**：
```javascript
{
  template: {
    content: '<div>{{ message }}</div>',
    loc: { start: { line: 1, column: 10 }, ... }
  },
  script: {
    content: 'export default { data() { ... } }',
    loc: { ... }
  }
}
```

### 3.3 Step 2: 解析 Template

```typescript
import { parse as parseTemplate } from '@vue/compiler-dom';

interface ExtractedText {
  text: string;
  type: 'text' | 'interpolation' | 'attribute' | 'directive';
  context: {
    parentTag?: string;
    attributeName?: string;
    directiveName?: string;
  };
  location: {
    line: number;
    column: number;
  };
}

function extractFromTemplate(templateContent: string): ExtractedText[] {
  const ast = parseTemplate(templateContent);
  const results: ExtractedText[] = [];
  
  // 遍历 AST
  function walk(node: any, parent: any = null) {
    // 1. 文本节点
    if (node.type === 2 && node.content.trim()) { // TEXT
      const text = node.content.trim();
      if (hasChinese(text)) {
        results.push({
          text,
          type: 'text',
          context: {
            parentTag: parent?.tag,
          },
          location: {
            line: node.loc.start.line,
            column: node.loc.start.column,
          },
        });
      }
    }
    
    // 2. 插值表达式 {{ }}
    if (node.type === 5) { // INTERPOLATION
      // 插值表达式中的内容需要在 script 部分处理
      // 这里只记录位置，用于后续关联
    }
    
    // 3. 元素节点
    if (node.type === 1) { // ELEMENT
      // 处理属性
      if (node.props) {
        for (const prop of node.props) {
          // 静态属性 title="标题"
          if (prop.type === 6 && prop.value) { // ATTRIBUTE
            const text = prop.value.content;
            if (hasChinese(text)) {
              results.push({
                text,
                type: 'attribute',
                context: {
                  parentTag: node.tag,
                  attributeName: prop.name,
                },
                location: {
                  line: prop.loc.start.line,
                  column: prop.loc.start.column,
                },
              });
            }
          }
          
          // 动态属性 :title="title"
          if (prop.type === 7) { // DIRECTIVE
            // v-bind, v-if 等，在 script 部分处理
          }
        }
      }
      
      // 递归处理子节点
      if (node.children) {
        for (const child of node.children) {
          walk(child, node);
        }
      }
    }
  }
  
  walk(ast);
  return results;
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}
```

**提取场景示例**：

```vue
<template>
  <!-- ✅ 场景1: 文本节点 -->
  <div>你好，世界</div>
  <button>提交</button>
  
  <!-- ✅ 场景2: 静态属性 -->
  <input placeholder="请输入用户名" />
  <img alt="产品图片" />
  
  <!-- ⚠️ 场景3: 插值表达式（script 部分处理）-->
  <div>{{ message }}</div>
  <p>{{ user.name }}</p>
  
  <!-- ⚠️ 场景4: 动态属性（script 部分处理）-->
  <div :title="pageTitle"></div>
  <button :aria-label="buttonText"></button>
</template>
```

### 3.4 Step 3: 解析 Script

```typescript
import { parse as parseJS } from '@babel/parser';
import traverse from '@babel/traverse';

function extractFromScript(scriptContent: string, isVue3Setup: boolean = false): ExtractedText[] {
  const results: ExtractedText[] = [];
  
  // 解析 JavaScript
  const ast = parseJS(scriptContent, {
    sourceType: 'module',
    plugins: [
      'typescript',
      'jsx',
      'decorators-legacy',
    ],
  });
  
  traverse(ast, {
    // 1. 字符串字面量
    StringLiteral(path) {
      const text = path.node.value;
      
      // 排除 import 语句
      if (path.findParent((p) => p.isImportDeclaration())) {
        return;
      }
      
      // 排除对象的 key
      if (path.parent.type === 'ObjectProperty' && path.parent.key === path.node) {
        return;
      }
      
      if (hasChinese(text)) {
        // 获取上下文
        const context = analyzeContext(path);
        
        results.push({
          text,
          type: 'string',
          context,
          location: {
            line: path.node.loc.start.line,
            column: path.node.loc.start.column,
          },
        });
      }
    },
    
    // 2. 模板字符串
    TemplateLiteral(path) {
      // 检查是否包含中文
      const quasis = path.node.quasis;
      const expressions = path.node.expressions;
      
      // 提取文本部分
      const textParts = quasis.map(q => q.value.raw);
      const hasChinese = textParts.some(text => /[\u4e00-\u9fa5]/.test(text));
      
      if (hasChinese) {
        const context = analyzeContext(path);
        
        // 生成参数化模板: `欢迎${name}使用` -> '欢迎{name}使用'
        const parameterizedText = generateParameterizedTemplate(textParts, expressions);
        const params = extractParameters(expressions);
        
        results.push({
          text: parameterizedText.text,
          type: 'template',
          params, // 参数信息
          original: path.node, // 原始 AST 节点，用于替换
          context,
          location: {
            line: path.node.loc.start.line,
            column: path.node.loc.start.column,
          },
        });
      }
    },
    
    // 3. 二元表达式（字符串拼接）
    BinaryExpression(path) {
      if (path.node.operator !== '+') return;
      
      // 检查是否是字符串拼接
      const parts = extractStringConcatenation(path);
      if (!parts) return;
      
      const hasChineseText = parts.some(p => 
        p.type === 'string' && /[\u4e00-\u9fa5]/.test(p.value)
      );
      
      if (hasChineseText) {
        const context = analyzeContext(path);
        
        // 生成参数化模板: '你好，' + name + '!' -> '你好，{name}!'
        const parameterizedText = generateParameterizedFromParts(parts);
        
        results.push({
          text: parameterizedText.text,
          type: 'concatenation',
          params: parameterizedText.params,
          original: path.node,
          context,
          location: {
            line: path.node.loc.start.line,
            column: path.node.loc.start.column,
          },
        });
      }
    },
    
    // 4. 条件表达式
    ConditionalExpression(path) {
      // 识别: type === 'success' ? '操作成功' : '操作失败'
      const consequent = path.node.consequent;
      const alternate = path.node.alternate;
      
      const texts = [];
      
      if (consequent.type === 'StringLiteral' && hasChinese(consequent.value)) {
        texts.push({ text: consequent.value, branch: 'consequent' });
      }
      
      if (alternate.type === 'StringLiteral' && hasChinese(alternate.value)) {
        texts.push({ text: alternate.value, branch: 'alternate' });
      }
      
      if (texts.length > 0) {
        const context = analyzeContext(path);
        
        results.push({
          texts, // 多个文本分支
          type: 'conditional',
          condition: path.node.test, // 条件表达式
          context,
          location: {
            line: path.node.loc.start.line,
            column: path.node.loc.start.column,
          },
        });
      }
    },
  });
  
  return results;
}

// 生成参数化模板
function generateParameterizedTemplate(textParts: string[], expressions: any[]) {
  let text = '';
  const params: any[] = [];
  
  for (let i = 0; i < textParts.length; i++) {
    text += textParts[i];
    
    if (i < expressions.length) {
      const expr = expressions[i];
      const paramName = generateParamName(expr, i);
      text += `{${paramName}}`;
      params.push({
        name: paramName,
        expression: expr,
      });
    }
  }
  
  return { text, params };
}

// 提取字符串拼接
function extractStringConcatenation(path: any) {
  const parts: any[] = [];
  
  function extract(node: any) {
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      extract(node.left);
      extract(node.right);
    } else if (node.type === 'StringLiteral') {
      parts.push({ type: 'string', value: node.value });
    } else {
      parts.push({ type: 'expression', node });
    }
  }
  
  extract(path.node);
  
  // 至少包含一个字符串
  const hasString = parts.some(p => p.type === 'string');
  return hasString ? parts : null;
}

// 从拼接部分生成参数化文本
function generateParameterizedFromParts(parts: any[]) {
  let text = '';
  const params: any[] = [];
  let paramIndex = 0;
  
  for (const part of parts) {
    if (part.type === 'string') {
      text += part.value;
    } else {
      const paramName = generateParamName(part.node, paramIndex++);
      text += `{${paramName}}`;
      params.push({
        name: paramName,
        expression: part.node,
      });
    }
  }
  
  return { text, params };
}

// 生成参数名
function generateParamName(expr: any, index: number): string {
  // 简单变量: this.userName -> 'userName'
  if (expr.type === 'MemberExpression') {
    return expr.property.name || `param${index}`;
  }
  
  // 标识符: userName -> 'userName'
  if (expr.type === 'Identifier') {
    return expr.name;
  }
  
  // 默认
  return `param${index}`;
}

// 提取参数信息
function extractParameters(expressions: any[]) {
  return expressions.map((expr, i) => ({
    name: generateParamName(expr, i),
    expression: expr,
  }));
}

// 分析上下文
function analyzeContext(path: any) {
  const context: any = {};
  
  // 1. 变量名
  const parent = path.parent;
  if (parent.type === 'VariableDeclarator' && parent.id.name) {
    context.variableName = parent.id.name;
  }
  
  // 2. 对象属性名
  if (parent.type === 'ObjectProperty' && parent.key.name) {
    context.propertyName = parent.key.name;
  }
  
  // 3. 函数调用
  if (parent.type === 'CallExpression' && parent.callee.name) {
    context.functionName = parent.callee.name;
  }
  
  return context;
}
```

**提取场景示例**：

```vue
<script>
export default {
  data() {
    return {
      // ✅ 场景1: 对象属性值
      message: '你好，世界',
      title: '产品列表',
      
      // ✅ 场景2: 数组元素
      tabs: ['首页', '产品', '关于我们'],
    };
  },
  
  methods: {
    showMessage() {
      // ✅ 场景3: 函数中的字符串
      alert('操作成功');
      
      // ⚠️ 场景4: 模板字符串（简单）
      const msg = `欢迎使用`;
      
      // ✅ 场景5: 动态拼接（可以处理）
      const greeting = '你好，' + this.userName + '!';
      // 提取: '你好，{name}!'
      // 建议替换: const greeting = this.$t('common.greeting', { name: this.userName });
      
      // ✅ 场景6: 模板字符串（可以处理）
      const message = `欢迎${this.userName}使用系统`;
      // 提取: '欢迎{name}使用系统'
      // 建议替换: const message = this.$t('common.welcome', { name: this.userName });
      
      // ⚠️ 场景7: 复杂 HTML 模板（需要审核）
      const html = `
        <div>
          <h1>产品介绍</h1>
          <p>详细内容...</p>
        </div>
      `;
      // 原因: 包含 HTML 结构，建议使用 v-html 或组件化处理
    },
  },
};
</script>
```

### 3.5 Vue 2 vs Vue 3 差异处理

```typescript
function detectVueVersion(scriptContent: string): 2 | 3 {
  // Vue 3 特征
  if (scriptContent.includes('setup()') || 
      scriptContent.includes('<script setup>')) {
    return 3;
  }
  
  // Vue 3 Composition API
  if (scriptContent.includes('import { ref, reactive') ||
      scriptContent.includes('from \'vue\'')) {
    return 3;
  }
  
  // 默认 Vue 2
  return 2;
}

function extractFromVue(filePath: string) {
  const parsed = parseVueFile(filePath);
  if (!parsed) return [];
  
  const results: ExtractedText[] = [];
  
  // 1. 提取 template
  if (parsed.template) {
    const templateResults = extractFromTemplate(parsed.template.content);
    results.push(...templateResults);
  }
  
  // 2. 提取 script
  if (parsed.script) {
    const version = detectVueVersion(parsed.script.content);
    const scriptResults = extractFromScript(parsed.script.content, version === 3);
    results.push(...scriptResults);
  }
  
  // 3. Vue 3 script setup
  if (parsed.scriptSetup) {
    const scriptResults = extractFromScript(parsed.scriptSetup.content, true);
    results.push(...scriptResults);
  }
  
  return results;
}
```

---

## 四、提取边界

### 4.1 ✅ 适合自动提取的场景

#### Template 部分

```vue
<template>
  <!-- 1. 文本节点 -->
  <div>产品列表</div>
  <button>提交</button>
  <p>欢迎使用我们的产品</p>
  
  <!-- 2. 静态属性 -->
  <input placeholder="请输入用户名" />
  <img alt="产品图片" />
  <button title="点击提交" />
  
  <!-- 3. 简单文本（无特殊字符）-->
  <span>{{ simpleText }}</span>
</template>
```

**特征**：
- 纯文本，无 HTML 标签
- 无复杂插值
- 长度适中（< 50 字符）

#### Script 部分

```javascript
export default {
  data() {
    return {
      // 1. 对象属性值
      title: '产品列表',
      description: '这是产品列表页面',
      
      // 2. 数组元素
      tabs: ['首页', '产品', '关于'],
      options: ['选项1', '选项2'],
      
      // 3. 简单字符串
      message: '操作成功',
    };
  },
  
  methods: {
    // 4. 函数中的简单字符串
    showAlert() {
      alert('保存成功');
    },
  },
};
```

**特征**：
- 简单字符串字面量
- 无动态拼接
- 无复杂逻辑

---

### 4.2 ✅ 需要保存上下文的场景

这些场景都可以自动提取，但需要保存**丰富的上下文信息**，方便翻译人员理解。

```vue
<template>
  <!-- 1. 长文本 - 保存父元素和位置信息 -->
  <div class="product-intro">
    这是一段很长的产品介绍文字，包含了详细的功能说明、
    使用方法、注意事项等内容。
  </div>
  
  <!-- 2. 包含特殊格式 - 保存完整的 HTML 结构 -->
  <p>
    价格：<span class="price">¥99.00</span>
  </p>
  
  <!-- 3. 复杂插值 - 保存变量路径 -->
  <div>{{ user.profile.address.city }}市</div>
</template>

<script>
export default {
  data() {
    return {
      // 4. 长文本 - 保存变量名和模块信息
      introduction: '这是一段很长的介绍文字，超过50个字符，需要人工审核是否适合作为单独的翻译条目...',
      
      // 5. 包含数字和单位 - 保存格式信息
      duration: '2小时30分钟',
      
      // 6. 包含特殊符号 - 保存完整文本
      formula: '计算公式：A + B = C',
    };
  },
  
  methods: {
    // 7. 条件拼接 - 识别所有分支
    getMessage(type) {
      return type === 'success' ? '操作成功' : '操作失败';
    },
  },
};
</script>
```

**提取策略**：
- ✅ **全部自动提取**，不需要人工标记
- ✅ **保存丰富上下文**：文件路径、组件名、变量名、父元素、使用位置
- ✅ **识别特殊模式**：参数化、条件分支、动态拼接
- ✅ **生成语义化 key**：根据上下文自动生成有意义的翻译 key

---

### 4.3 ❌ 不应该提取的场景

```vue
<template>
  <!-- 1. CSS 类名 -->
  <div class="product-list-title">...</div>
  
  <!-- 2. 变量名/引用 -->
  <component :is="currentComponent" />
  
  <!-- 3. 事件名 -->
  <button @click="handleClick">...</button>
</template>

<script>
export default {
  data() {
    return {
      // 4. 枚举值/常量
      status: 'pending',
      type: 'product',
      
      // 5. API 路径
      apiUrl: '/api/products',
      
      // 6. 正则表达式
      pattern: /用户名/,
      
      // 7. CSS 选择器
      selector: '.product-item',
      
      // 8. 文件路径
      imagePath: './assets/logo.png',
    };
  },
  
  methods: {
    // 9. 对象 key
    getData() {
      return {
        productName: '产品A', // ✅ value 需要提取
        // 但 key "productName" 不提取
      };
    },
  },
};
</script>
```

**排除规则**：
```typescript
const EXCLUDE_PATTERNS = [
  /^\.|\//, // 路径: ./xxx, /xxx
  /^@/, // 事件: @click
  /^:/, // 绑定: :title
  /^v-/, // 指令: v-if
  /^\w+:\w+$/, // 枚举: pending, success
  /^[a-z][a-zA-Z]*$/, // 纯英文变量名
];

function shouldExclude(text: string, context: any): boolean {
  // 1. 匹配排除模式
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(text))) {
    return true;
  }
  
  // 2. CSS 类名
  if (context.attributeName === 'class') {
    return true;
  }
  
  // 3. 组件名
  if (context.attributeName === 'is') {
    return true;
  }
  
  // 4. 对象 key
  if (context.isObjectKey) {
    return true;
  }
  
  return false;
}
```

**标记方式**：
```javascript
export default {
  data() {
    return {
      // @i18n-ignore
      apiUrl: '/api/products/获取产品列表',
    };
  },
};
```

---

## 五、上下文信息收集

### 5.1 上下文数据结构

```typescript
interface ExtractedText {
  // 基本信息
  text: string;                    // 提取的文本（参数化后）
  originalText?: string;           // 原始文本（未参数化）
  type: 'text' | 'attribute' | 'string' | 'template' | 'concatenation' | 'conditional';
  
  // 参数信息（动态内容）
  params?: Array<{
    name: string;                  // 参数名: userName
    expression: any;               // AST 表达式
    exampleValue?: string;         // 示例值（如果能推断）
  }>;
  
  // 位置信息
  location: {
    file: string;                  // 文件路径
    line: number;                  // 行号
    column: number;                // 列号
  };
  
  // 代码上下文
  context: {
    // Vue 组件信息
    componentName?: string;        // 组件名: ProductList
    componentPath?: string;        // 组件路径: views/product/List.vue
    
    // Template 上下文
    parentTag?: string;            // 父标签: div, button
    attributeName?: string;        // 属性名: placeholder, title
    directiveName?: string;        // 指令名: v-if, v-for
    
    // Script 上下文
    variableName?: string;         // 变量名: pageTitle
    propertyName?: string;         // 属性名: message
    functionName?: string;         // 函数名: handleSubmit
    methodName?: string;           // 方法名: showMessage
    
    // 对象路径
    objectPath?: string[];         // ['data', 'user', 'info']
    
    // 作用域信息
    scope?: 'data' | 'computed' | 'methods' | 'props' | 'setup';
  };
  
  // 翻译 key（自动生成）
  key: string;                     // namespace_a7f9e2c1
  
  // 建议的替换代码
  replacement: {
    template?: string;             // Template 中的替换代码
    script?: string;               // Script 中的替换代码
  };
}
```

### 5.2 Key 生成策略

#### 命名空间 + Hash 方案

```typescript
import crypto from 'crypto';

interface KeyGenerationOptions {
  namespace: string;              // 命名空间，如 'product', 'user', 'common'
  hashLength?: number;            // hash 长度，默认 8
}

/**
 * 生成翻译 key
 * @param text 文本内容（参数化后的）
 * @param namespace 命名空间
 * @param hashLength hash 长度
 * @returns 格式: namespace_hash，如 'product_a7f9e2c1'
 */
function generateKey(
  text: string,
  namespace: string,
  hashLength: number = 8
): string {
  // 1. 生成 hash
  const hash = crypto
    .createHash('md5')
    .update(text)
    .digest('hex')
    .substring(0, hashLength);
  
  // 2. 组合 namespace + hash
  return `${namespace}_${hash}`;
}

// 使用示例
const text = '你好，{userName}!';
const key = generateKey(text, 'user');
// 结果: 'user_a7f9e2c1'
```

#### 命名空间建议

```typescript
// CLI 使用示例
// 提取整个项目，使用项目名作为命名空间
$ i18n-extract --namespace=my-project src/**/*.vue

// 提取特定模块，使用模块名作为命名空间
$ i18n-extract --namespace=product src/views/product/**/*.vue
$ i18n-extract --namespace=user src/views/user/**/*.vue
$ i18n-extract --namespace=common src/components/**/*.vue

// 也可以在配置文件中指定
// i18n.config.js
export default {
  extract: {
    patterns: [
      { files: 'src/views/product/**/*.vue', namespace: 'product' },
      { files: 'src/views/user/**/*.vue', namespace: 'user' },
      { files: 'src/components/**/*.vue', namespace: 'common' },
    ]
  }
}
```

#### Hash 冲突处理

```typescript
interface ExtractResult {
  texts: Map<string, ExtractedText>;  // key -> ExtractedText
  conflicts: Array<{
    key: string;
    texts: string[];
  }>;
}

function detectConflicts(results: ExtractedText[]): ExtractResult {
  const textsMap = new Map<string, ExtractedText>();
  const keyTextMap = new Map<string, Set<string>>();
  const conflicts: Array<{ key: string; texts: string[] }> = [];
  
  for (const result of results) {
    const { key, text } = result;
    
    // 记录每个 key 对应的文本
    if (!keyTextMap.has(key)) {
      keyTextMap.set(key, new Set());
    }
    keyTextMap.get(key)!.add(text);
    
    // 检查是否已存在
    if (textsMap.has(key)) {
      const existing = textsMap.get(key)!;
      
      // 如果文本不同，说明有冲突
      if (existing.text !== text) {
        console.warn(`⚠️  Hash 冲突: key="${key}"`);
        console.warn(`   文本1: "${existing.text}"`);
        console.warn(`   文本2: "${text}"`);
      }
    } else {
      textsMap.set(key, result);
    }
  }
  
  // 收集冲突
  keyTextMap.forEach((texts, key) => {
    if (texts.size > 1) {
      conflicts.push({
        key,
        texts: Array.from(texts),
      });
    }
  });
  
  return { texts: textsMap, conflicts };
}

// 解决冲突：增加 hash 长度或添加序号
function resolveConflict(
  text: string,
  namespace: string,
  existingKeys: Set<string>,
  index: number = 0
): string {
  let key = generateKey(text, namespace);
  
  // 如果有冲突，添加序号
  if (existingKeys.has(key)) {
    key = `${key}_${index}`;
    return resolveConflict(text, namespace, existingKeys, index + 1);
  }
  
  return key;
}
```

#### 优势分析

**✅ 优点：**
1. **简单可靠**：不需要复杂的语义分析
2. **稳定性好**：相同文本总是生成相同的 key
3. **模块化**：通过 namespace 区分不同模块
4. **去重**：相同文本自动合并（复用翻译）
5. **可追溯**：hash 基于文本内容，便于查找

**示例对比：**

```typescript
// 相同文本，相同 namespace → 相同 key（自动复用）
'提交' (namespace: product) → 'product_9f86d081'
'提交' (namespace: product) → 'product_9f86d081' ✅ 复用

// 相同文本，不同 namespace → 不同 key（模块隔离）
'提交' (namespace: product) → 'product_9f86d081'
'提交' (namespace: user) → 'user_9f86d081'

// 不同文本，相同 namespace → 不同 key
'提交' (namespace: product) → 'product_9f86d081'
'保存' (namespace: product) → 'product_5d41402a'
```

---

### 5.3 上下文收集实现

```typescript
function collectContext(
  path: any,
  filePath: string,
  componentName: string
): ExtractedText['context'] {
  const context: any = {
    componentName,
    componentPath: filePath,
  };
  
  // 1. 收集作用域信息
  let currentScope = path.scope;
  while (currentScope) {
    // Vue 2 Options API
    if (currentScope.path.isObjectMethod()) {
      const methodName = currentScope.path.node.key?.name;
      if (methodName) {
        context.methodName = methodName;
        
        // 判断是在哪个选项中
        const parent = currentScope.path.parent;
        if (parent.type === 'ObjectProperty') {
          context.scope = parent.key.name; // data, methods, computed
        }
      }
    }
    
    // Vue 3 setup
    if (currentScope.path.isFunctionDeclaration() && 
        currentScope.path.node.id?.name === 'setup') {
      context.scope = 'setup';
    }
    
    currentScope = currentScope.parent;
  }
  
  // 2. 收集变量信息
  const parent = path.parent;
  if (parent.type === 'VariableDeclarator' && parent.id.name) {
    context.variableName = parent.id.name;
  }
  
  // 3. 收集对象路径
  if (parent.type === 'ObjectProperty') {
    context.propertyName = parent.key.name;
    context.objectPath = getObjectPath(path);
  }
  
  // 4. 收集函数信息
  if (parent.type === 'CallExpression' && parent.callee.name) {
    context.functionName = parent.callee.name;
  }
  
  return context;
}

// 获取对象属性路径
function getObjectPath(path: any): string[] {
  const pathParts: string[] = [];
  let current = path;
  
  while (current) {
    if (current.parent?.type === 'ObjectProperty' && current.parent.key.name) {
      pathParts.unshift(current.parent.key.name);
    }
    current = current.parentPath;
  }
  
  return pathParts;
}

// 提取代码片段
function extractSnippet(
  filePath: string,
  line: number,
  contextLines: number = 3
): { before: string; current: string; after: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  return {
    before: lines.slice(Math.max(0, line - contextLines - 1), line - 1).join('\n'),
    current: lines[line - 1] || '',
    after: lines.slice(line, line + contextLines).join('\n'),
  };
}
```

### 5.4 完整的提取示例

```typescript
// 输入代码
const greeting = '你好，' + this.userName + '!';

// 提取结果
{
  text: '你好，{userName}!',
  originalText: '你好，' + this.userName + '!',
  type: 'concatenation',
  
  params: [
    {
      name: 'userName',
      expression: { /* AST */ },
      exampleValue: 'this.userName'
    }
  ],
  
  location: {
    file: 'src/views/user/Profile.vue',
    line: 45,
    column: 12
  },
  
  context: {
    componentName: 'UserProfile',
    componentPath: 'views/user/Profile.vue',
    methodName: 'showGreeting',
    scope: 'methods',
    variableName: 'greeting'
  },
  
  // 命名空间 + hash 生成的 key
  key: 'user_a7f9e2c1',
  
  // 替换建议
  replacement: {
    script: "const greeting = this.$t('user_a7f9e2c1', { userName: this.userName });"
  }
}
```

---

## 六、完整示例

### 5.1 输入文件

```vue
<!-- src/views/product/List.vue -->
<template>
  <div class="product-list">
    <!-- ✅ 文本节点 -->
    <h1>产品列表</h1>
    
    <!-- ✅ 静态属性 -->
    <input placeholder="搜索产品" />
    
    <!-- ✅ 简单插值 -->
    <div>{{ pageTitle }}</div>
    
    <!-- ⚠️ 复杂文本 -->
    <p class="description">
      这是一个产品列表页面，展示了所有可用的产品信息，
      包括产品名称、价格、库存等详细信息。
    </p>
    
    <!-- ✅ 按钮 -->
    <button @click="handleSearch">搜索</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      // ✅ 简单字符串
      pageTitle: '产品管理',
      
      // ✅ 数组
      tabs: ['全部', '上架', '下架'],
      
      // ⚠️ 长文本
      introduction: '这是一段很长的产品介绍文字...',
      
      // ❌ API 路径
      apiUrl: '/api/products',
    };
  },
  
  methods: {
    handleSearch() {
      // ✅ 简单字符串
      this.$message.success('搜索成功');
    },
  },
};
</script>
```

### 6.2 提取结果

```json
{
  "namespace": "product",
  "texts": [
    {
      "text": "产品列表",
      "type": "text",
      "context": {
        "file": "src/views/product/List.vue",
        "componentName": "ProductList",
        "parentTag": "h1"
      },
      "location": { "line": 4, "column": 8 },
      "key": "product_f7a3b2e1",
      "replacement": {
        "template": "<h1>{{ $t('product_f7a3b2e1') }}</h1>"
      }
    },
    {
      "text": "搜索产品",
      "type": "attribute",
      "context": {
        "file": "src/views/product/List.vue",
        "componentName": "ProductList",
        "parentTag": "input",
        "attributeName": "placeholder"
      },
      "location": { "line": 7, "column": 18 },
      "key": "product_c8d4e2a9",
      "replacement": {
        "template": "<input :placeholder=\"$t('product_c8d4e2a9')\" />"
      }
    },
    {
      "text": "产品管理",
      "type": "string",
      "context": {
        "file": "src/views/product/List.vue",
        "componentName": "ProductList",
        "variableName": "pageTitle",
        "scope": "data"
      },
      "location": { "line": 25, "column": 18 },
      "key": "product_b5e9f1c3",
      "replacement": {
        "script": "pageTitle: this.$t('product_b5e9f1c3')"
      }
    },
    {
      "text": "搜索",
      "type": "text",
      "context": {
        "file": "src/views/product/List.vue",
        "componentName": "ProductList",
        "parentTag": "button"
      },
      "location": { "line": 16, "column": 30 },
      "key": "product_9f86d081",
      "replacement": {
        "template": "<button>{{ $t('product_9f86d081') }}</button>"
      }
    },
    {
      "text": "这是一个产品列表页面，展示了所有可用的产品信息，包括产品名称、价格、库存等详细信息。",
      "type": "text",
      "context": {
        "file": "src/views/product/List.vue",
        "componentName": "ProductList",
        "parentTag": "p"
      },
      "location": { "line": 11, "column": 6 },
      "key": "product_a7f9e2c1",
      "replacement": {
        "template": "<p>{{ $t('product_a7f9e2c1') }}</p>"
      }
    },
    {
      "text": "搜索成功",
      "type": "string",
      "context": {
        "file": "src/views/product/List.vue",
        "componentName": "ProductList",
        "methodName": "handleSearch",
        "scope": "methods",
        "functionName": "$message.success"
      },
      "location": { "line": 31, "column": 26 },
      "key": "product_d2e4f7b3",
      "replacement": {
        "script": "this.$message.success(this.$t('product_d2e4f7b3'))"
      }
    }
  ],
  
  "ignored": [
    {
      "text": "/api/products",
      "type": "string",
      "reason": "API 路径（匹配排除规则）",
      "location": { 
        "file": "src/views/product/List.vue",
        "line": 34, 
        "column": 14 
      }
    }
  ],
  
  "stats": {
    "total": 6,
    "template": 3,
    "script": 3,
    "ignored": 1
  }
}
```

---

## 六、技术实现要点

### 6.1 依赖安装

```json
{
  "dependencies": {
    "@vue/compiler-sfc": "^3.3.0",
    "@vue/compiler-dom": "^3.3.0",
    "@babel/parser": "^7.23.0",
    "@babel/traverse": "^7.23.0",
    "@babel/types": "^7.23.0"
  }
}
```

### 6.2 入口函数

```typescript
import { extractFromVue } from './extractors/vue';

interface ExtractOptions {
  include: string[];  // ['src/**/*.vue']
  exclude: string[];  // ['**/node_modules/**']
}

async function extract(options: ExtractOptions) {
  // 1. 扫描文件
  const files = await glob(options.include, {
    ignore: options.exclude,
  });
  
  // 2. 提取每个文件
  const allResults = [];
  for (const file of files) {
    const results = extractFromVue(file);
    allResults.push({
      file,
      results,
    });
  }
  
  // 3. 生成 key
  const withKeys = generateKeys(allResults);
  
  // 4. 分类
  const classified = classify(withKeys);
  
  // 5. 输出
  await outputResults(classified);
}
```

---

## 七、实际场景处理示例

### 7.1 模板字符串参数化

**输入代码：**
```javascript
const message = `欢迎${this.userName}使用系统，当前版本 v${this.version}`;
```

**提取结果：**
```json
{
  "text": "欢迎{userName}使用系统，当前版本 v{version}",
  "originalText": "`欢迎${this.userName}使用系统，当前版本 v${this.version}`",
  "type": "template",
  "params": [
    { "name": "userName", "expression": "this.userName" },
    { "name": "version", "expression": "this.version" }
  ],
  "key": "common_f3e8d2a9",
  "replacement": {
    "script": "const message = this.$t('common_f3e8d2a9', { userName: this.userName, version: this.version });"
  }
}
```

---

### 7.2 字符串拼接参数化

**输入代码：**
```javascript
const greeting = '你好，' + this.userName + '！今天是' + this.date;
```

**提取结果：**
```json
{
  "text": "你好，{userName}！今天是{date}",
  "originalText": "'你好，' + this.userName + '！今天是' + this.date",
  "type": "concatenation",
  "params": [
    { "name": "userName", "expression": "this.userName" },
    { "name": "date", "expression": "this.date" }
  ],
  "key": "common_b9c3e7f2",
  "replacement": {
    "script": "const greeting = this.$t('common_b9c3e7f2', { userName: this.userName, date: this.date });"
  }
}
```

---

### 7.3 条件表达式处理

**输入代码：**
```javascript
const statusText = this.status === 'success' ? '操作成功' : '操作失败';
```

**提取结果：**
```json
{
  "texts": [
    { 
      "text": "操作成功", 
      "branch": "consequent",
      "key": "common_9f86d081"
    },
    { 
      "text": "操作失败", 
      "branch": "alternate",
      "key": "common_5d41402a"
    }
  ],
  "type": "conditional",
  "condition": "this.status === 'success'",
  "replacement": {
    "script": "const statusText = this.status === 'success' ? this.$t('common_9f86d081') : this.$t('common_5d41402a');"
  }
}
```

---

### 7.4 长文本 + 上下文

**输入代码：**
```vue
<template>
  <div class="product-intro">
    <p>
      本产品是一款创新的解决方案，专为企业用户设计。
      它集成了多种功能，包括数据分析、报表生成、
      团队协作等，旨在提高工作效率。
    </p>
  </div>
</template>
```

**提取结果：**
```json
{
  "text": "本产品是一款创新的解决方案，专为企业用户设计。它集成了多种功能，包括数据分析、报表生成、团队协作等，旨在提高工作效率。",
  "type": "text",
  "context": {
    "componentName": "ProductIntro",
    "componentPath": "views/product/Intro.vue",
    "parentTag": "p",
    "parentClass": "product-intro"
  },
  "location": {
    "file": "views/product/Intro.vue",
    "line": 4,
    "column": 7
  },
  "key": "product_c8f3d4e1",
  "replacement": {
    "template": "<p>{{ $t('product_c8f3d4e1') }}</p>"
  }
}
```

---

### 7.5 动态属性绑定

**输入代码：**
```vue
<template>
  <input :placeholder="searchPlaceholder" />
</template>

<script>
export default {
  data() {
    return {
      searchPlaceholder: '请输入产品名称或关键词搜索'
    };
  }
}
</script>
```

**提取结果：**
```json
[
  {
    "text": "请输入产品名称或关键词搜索",
    "type": "string",
    "context": {
      "componentName": "ProductSearch",
      "variableName": "searchPlaceholder",
      "scope": "data",
      "usedIn": "template",
      "boundTo": "input[placeholder]"
    },
    "location": {
      "file": "views/product/Search.vue",
      "line": 7,
      "column": 25
    },
    "key": "product_d7e2f8a3",
    "replacement": {
      "script": "searchPlaceholder: this.$t('product_d7e2f8a3')"
    }
  }
]
```

---

### 7.6 对象数组处理

**输入代码：**
```javascript
data() {
  return {
    tabs: [
      { id: 1, name: '全部产品', icon: 'list' },
      { id: 2, name: '上架中', icon: 'check' },
      { id: 3, name: '已下架', icon: 'close' }
    ]
  };
}
```

**提取结果：**
```json
{
  "items": [
    {
      "text": "全部产品",
      "type": "string",
      "context": {
        "propertyName": "name",
        "objectPath": ["data", "tabs", "0"],
        "arrayIndex": 0
      },
      "key": "product_e9f2a1b3"
    },
    {
      "text": "上架中",
      "context": {
        "propertyName": "name",
        "objectPath": ["data", "tabs", "1"],
        "arrayIndex": 1
      },
      "key": "product_7c3d8e4f"
    },
    {
      "text": "已下架",
      "context": {
        "propertyName": "name",
        "objectPath": ["data", "tabs", "2"],
        "arrayIndex": 2
      },
      "key": "product_a2b5c9d1"
    }
  ],
  "replacement": {
    "script": `tabs: [
  { id: 1, name: this.$t('product_e9f2a1b3'), icon: 'list' },
  { id: 2, name: this.$t('product_7c3d8e4f'), icon: 'check' },
  { id: 3, name: this.$t('product_a2b5c9d1'), icon: 'close' }
]`
  }
}
```

---

## 八、总结

### 核心要点

1. **Vue SFC 三步解析**：
   - SFC → Template + Script
   - Template → Vue Template AST
   - Script → JavaScript AST

2. **智能提取策略**：
   - ✅ **全自动提取**：所有包含中文的文本（~85%）
     - 简单文本、属性、字符串
     - 模板字符串：`欢迎${name}` → `欢迎{name}`
     - 字符串拼接：`'你好，' + name` → `你好，{name}`
     - 条件表达式：识别所有分支
     - 长文本：提取并保存上下文
   
   - ❌ **应该排除**：技术性文本（~15%）
     - API 路径、文件路径
     - CSS 类名、选择器
     - 枚举值、变量名
     - 事件名、组件名

3. **丰富的上下文信息**：
   - 📍 位置信息：文件、行号、列号
   - 🎯 代码上下文：组件名、变量名、作用域
   - 📝 代码片段：前后 3 行代码
   - 🔧 替换建议：自动生成 $t() 调用
   - 🏷️ 元数据：长度、复杂度、标签

4. **参数化处理**：
   - 自动识别动态部分
   - 智能生成参数名
   - 提供完整的参数信息
   - 生成可用的替换代码

5. **支持 Vue 2 和 Vue 3**：
   - 自动检测版本
   - 支持 Options API 和 Composition API
   - 支持 `<script setup>`

### 工作流程

```
1. 扫描 Vue 文件
   ↓
2. 解析 SFC（template + script）
   ↓
3. 提取所有中文文本
   - 识别参数化场景
   - 收集丰富上下文
   ↓
4. 生成翻译 key
   - 基于文件路径
   - 基于上下文信息
   ↓
5. 输出结果
   - 提取的文本
   - 参数信息
   - 上下文数据
   - 替换建议
```

### 输出格式

工具会输出 JSON 格式的数据，供翻译平台使用：

```json
{
  "namespace": "product",
  "texts": [
    {
      "key": "product_a7f9e2c1",
      "text": "你好，{userName}!",
      "params": ["userName"],
      "context": {
        "file": "views/product/List.vue",
        "line": 45,
        "componentName": "ProductList",
        "scope": "methods"
      },
      "replacement": {
        "script": "this.$t('product_a7f9e2c1', { userName })"
      }
    },
    {
      "key": "product_b8c3d4e2",
      "text": "产品列表",
      "context": {
        "file": "views/product/List.vue",
        "line": 12,
        "parentTag": "h1"
      },
      "replacement": {
        "template": "{{ $t('product_b8c3d4e2') }}"
      }
    }
  ],
  "conflicts": [],
  "stats": {
    "total": 2,
    "withParams": 1,
    "withoutParams": 1
  }
}
```

**输出文件建议：**

```bash
# 按 namespace 分别输出
output/
  ├── product.json     # namespace: product
  ├── user.json        # namespace: user
  └── common.json      # namespace: common

# 或输出到语言文件中（可选）
locales/
  ├── zh-CN.json       # { "product_a7f9e2c1": "你好，{userName}!" }
  ├── en-US.json       # { "product_a7f9e2c1": "Hello, {userName}!" }
  └── ja-JP.json       # { "product_a7f9e2c1": "こんにちは、{userName}!" }
```

### 下一步

1. ✅ 完成技术方案设计
2. 🔄 实现核心提取功能
   - `extractFromVue()`：主入口
   - `extractFromTemplate()`：模板提取
   - `extractFromScript()`：脚本提取
   - 参数化处理函数
   - 上下文收集函数
3. 📝 实现 key 生成逻辑
4. 🧪 编写单元测试
5. 📦 CLI 工具封装

