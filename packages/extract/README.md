# @i18n-utils/extract

从 Vue 项目中自动提取需要翻译的中文文本。

## ✨ 特性

- ✅ **AST 精确提取**：基于 AST 解析，不使用正则，准确可靠
- ✅ **全面覆盖**：支持 Template 和 Script 部分
- ✅ **智能参数化**：自动识别模板字符串和字符串拼接，生成参数化文本
- ✅ **自动去重**：相同文本自动复用同一个 key
- ✅ **命名空间 + Hash**：简单可靠的 key 生成策略
- ✅ **丰富上下文**：保存文件位置、组件名、作用域等信息
- ✅ **替换建议**：自动生成 `$t()` 调用代码

## 📦 安装

```bash
pnpm install @i18n-utils/extract
```

## 🚀 快速开始

### 基础用法

```typescript
import { extract } from '@i18n-utils/extract';

const result = await extract({
  include: 'src/**/*.vue',
  namespace: 'product',
});

console.log(`提取了 ${result.stats.total} 条文本`);
```

### 完整示例

```typescript
import {
  extract,
  outputToJson,
  generateLocaleFiles,
  generateReport,
} from '@i18n-utils/extract';

// 1. 提取文本
const result = await extract({
  include: 'src/**/*.vue',
  namespace: 'product',
  exclude: ['**/node_modules/**', '**/test/**'],
});

// 2. 生成报告
console.log(generateReport(result));

// 3. 输出 JSON
outputToJson(result, './output/extracted.json');

// 4. 生成翻译文件模板
generateLocaleFiles(result, './output/locales', ['zh-CN', 'en-US', 'ja-JP']);
```

## 📖 API

### extract(options)

提取 i18n 文本。

**参数：**

```typescript
interface ExtractOptions {
  // 包含的文件模式（支持 glob）
  include: string | string[];
  
  // 命名空间（用于生成翻译 key）
  namespace: string;
  
  // 排除的文件模式（可选）
  exclude?: string[];
  
  // 工作目录（可选）
  cwd?: string;
}
```

**返回：**

```typescript
interface ExtractResult {
  namespace: string;
  texts: ExtractedText[];
  stats: {
    total: number;
    files: number;
  };
}
```

### outputToJson(result, outputPath)

输出结果到 JSON 文件。

### generateLocaleFiles(result, outputDir, locales)

生成翻译文件模板。

**参数：**
- `result`: 提取结果
- `outputDir`: 输出目录
- `locales`: 语言列表，默认 `['zh-CN', 'en-US']`

### generateReport(result)

生成统计报告。

## 📝 提取结果

### ExtractedText 结构

```typescript
interface ExtractedText {
  // 翻译 key (namespace_hash)
  key: string;
  
  // 提取的文本（参数化后）
  text: string;
  
  // 原始文本
  originalText?: string;
  
  // 文本类型
  type: 'text' | 'attribute' | 'string' | 'template' | 'concatenation';
  
  // 参数信息
  params?: TextParam[];
  
  // 位置信息
  location: {
    file: string;
    line: number;
    column: number;
  };
  
  // 代码上下文
  context: {
    componentName?: string;
    componentPath?: string;
    parentTag?: string;
    attributeName?: string;
    variableName?: string;
    scope?: string;
  };
  
  // 替换建议
  replacement: {
    template?: string;
    script?: string;
  };
}
```

### 提取场景

#### Template 部分

1. **文本节点**
   ```vue
   <div>产品列表</div>
   <!-- 提取: "产品列表" -->
   ```

2. **静态属性**
   ```vue
   <input placeholder="请输入" />
   <!-- 提取: "请输入" -->
   ```

#### Script 部分

1. **字符串字面量**
   ```javascript
   data() {
     return {
       title: '欢迎使用'  // 提取: "欢迎使用"
     };
   }
   ```

2. **模板字符串（参数化）**
   ```javascript
   greeting() {
     return `你好，${this.userName}！`;
     // 提取: "你好，{userName}！"
     // 参数: userName = this.userName
   }
   ```

3. **字符串拼接（参数化）**
   ```javascript
   message() {
     return '当前用户：' + this.userName;
     // 提取: "当前用户：{userName}"
     // 参数: userName = this.userName
   }
   ```

## 🔑 Key 生成策略

采用 **命名空间 + Hash** 的方式：

```
格式: {namespace}_{hash}
示例: product_a7f9e2c1
```

**优势**：
- ✅ 简单可靠，完全自动化
- ✅ 相同文本总是生成相同的 key
- ✅ 通过 namespace 区分不同模块
- ✅ 自动去重，复用翻译

## 📊 输出示例

### JSON 输出

```json
{
  "namespace": "product",
  "texts": [
    {
      "key": "product_a7f9e2c1",
      "text": "你好，{userName}!",
      "params": [
        {
          "name": "userName",
          "expression": "this.user.name"
        }
      ],
      "location": {
        "file": "src/views/Product.vue",
        "line": 45,
        "column": 12
      },
      "replacement": {
        "script": "this.$t('product_a7f9e2c1', { userName: this.user.name })"
      }
    }
  ],
  "stats": {
    "total": 100,
    "files": 10
  }
}
```

### 翻译文件

```json
// zh-CN.json
{
  "product_a7f9e2c1": "你好，{userName}!",
  "product_9f86d081": "提交",
  ...
}

// en-US.json
{
  "product_a7f9e2c1": "",  // 待翻译
  "product_9f86d081": "",  // 待翻译
  ...
}
```

## 🎯 配置示例

### 单个模块

```typescript
await extract({
  include: 'src/views/product/**/*.vue',
  namespace: 'product',
});
```

### 多个模块

```typescript
const modules = [
  { include: 'src/views/product/**/*.vue', namespace: 'product' },
  { include: 'src/views/user/**/*.vue', namespace: 'user' },
  { include: 'src/components/**/*.vue', namespace: 'common' },
];

for (const config of modules) {
  const result = await extract(config);
  outputToJson(result, `./output/${config.namespace}.json`);
}
```

## 📈 统计报告示例

```
📊 提取统计报告
==================================================

命名空间: drama
文件数量: 324
文本总数: 2034

按类型统计:
  text              915 (45.0%)
  string            539 (26.5%)
  attribute         456 (22.4%)
  template          120 (5.9%)
  concatenation       4 (0.2%)

参数化文本: 106 (5.2%)

文本最多的文件 (Top 10):
   1. index.vue       112
   2. edit.vue         77
   ...
```

## 🔧 开发

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 开发模式
pnpm dev
```

## 📄 License

MIT

