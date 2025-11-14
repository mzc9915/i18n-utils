# AST 场景识别能力分析与 i18n-extract 工具设计

## 一、AST 能力边界分析

### 1.1 AST 能够识别并处理的场景 ✅

基于现有插件的实现,AST 能够准确识别和处理以下场景:

#### **1. JSX 文本节点**
```jsx
// ✅ 可以识别
<div>你好,世界</div>
<button>提交</button>
<p>欢迎使用我们的应用</p>
```

**识别方式:** 
- 通过 `JSXText` visitor 捕获
- 上下文信息: 父元素标签名 (如 `button`, `div`)
- 可以基于父标签推断类型 (按钮文本、普通文本等)

#### **2. 字符串字面量**
```jsx
// ✅ 可以识别
const title = "产品列表"
const placeholder = '请输入用户名'
const message = "操作成功"
```

**识别方式:**
- 通过 `StringLiteral` visitor 捕获
- 上下文信息: 变量名、赋值语句
- 可以基于变量名推断类型 (如 `title`, `placeholder`, `errorMsg`)

#### **3. JSX 属性值**
```jsx
// ✅ 可以识别
<input placeholder="请输入邮箱" />
<img alt="产品图片" />
<button title="点击提交" />
```

**识别方式:**
- 通过 `StringLiteral` visitor + 父节点判断 `isJSXAttribute`
- 上下文信息: 属性名 (placeholder, alt, title)
- 可以基于属性名精确推断类型

#### **4. 模板字符串(简单场景)**
```jsx
// ✅ 可以识别
const greeting = `欢迎回来`
const title = `产品详情`
```

**识别方式:**
- 通过 `TemplateLiteral` visitor 捕获
- 支持纯文本模板字符串

#### **5. 对象字面量中的值**
```jsx
// ✅ 可以识别
const config = {
  title: "设置",
  description: "系统设置页面",
  buttonText: "保存"
}
```

**识别方式:**
- 通过 `StringLiteral` visitor + 排除 `parent.key === node`
- 上下文信息: 对象键名
- 可以基于键名推断类型

#### **6. 数组元素**
```jsx
// ✅ 可以识别
const tabs = ["首页", "产品", "关于我们"]
const options = ["全部", "进行中", "已完成"]
```

**识别方式:**
- 通过 `StringLiteral` visitor
- 上下文信息: 数组变量名

#### **7. 函数参数(非排除函数)**
```jsx
// ✅ 可以识别
alert("操作成功")
showMessage("数据已保存")
```

**识别方式:**
- 通过 `StringLiteral` visitor + `CallExpression` 父节点分析
- 会排除 `excludedCall` 中的函数

---

### 1.2 AST 难以处理或不建议自动处理的场景 ⚠️

#### **1. 复杂的模板字符串**
```jsx
// ⚠️ 不建议自动处理
const message = `
  <div class="card">
    <h1>欢迎使用产品</h1>
    <p>当前用户: ${username}</p>
    <span>登录时间: ${loginTime}</span>
  </div>
`
```

**问题:**
- 包含 HTML 结构
- 包含插值变量
- 自动切分会破坏语义和结构
- 翻译人员无法理解完整上下文

**解决方案:** 需要手工标记 `// @i18n-manual` 或使用特殊注释

#### **2. 动态拼接的字符串**
```jsx
// ⚠️ 不建议自动处理
const message = "欢迎," + username + "!"
const title = `${prefix}产品列表${suffix}`
const desc = parts.join('') + "详情页"
```

**问题:**
- 中文被切割成碎片
- 无法理解完整语义
- 插值位置无法准确确定

**解决方案:** 
- 手动重构为完整的模板字符串: `欢迎,{{username}}!`
- 或标记为手工处理

#### **3. 函数返回值中的中文**
```jsx
// ⚠️ 语义难以推断
function getMessage(type) {
  if (type === 'success') return "操作成功"
  if (type === 'error') return "操作失败"
  return "未知状态"
}
```

**问题:**
- 函数内部逻辑复杂
- 上下文不明确
- 难以生成合适的 key 名

**解决方案:** 
- 提取时标记为 `msg_` 前缀
- 需要人工审核和重命名

#### **4. 条件表达式中的文本**
```jsx
// ⚠️ 语义分散
const text = isLoggedIn ? "欢迎回来" : "请登录"
const status = isPending ? "处理中" : isSuccess ? "已完成" : "失败"
```

**问题:**
- 同一表达式包含多个待翻译文本
- 语义相关但分散
- 难以统一命名

**解决方案:**
- 分别提取,但需人工合并和审核

#### **5. 正则表达式和特殊字符串**
```jsx
// ❌ 不应该翻译
const pattern = /用户名/
const selector = "[data-title='产品']"
const sql = "SELECT * FROM 产品表"
```

**问题:**
- 这些是代码逻辑的一部分
- 翻译会破坏功能

**解决方案:**
- 通过 `excludedPattern` 排除
- 或添加 `// @i18n-ignore` 注释

#### **6. 注释中的中文**
```jsx
// 这是用户登录模块
/* 
 * 产品列表功能
 * 支持分页和筛选
 */
```

**问题:**
- 注释通常不需要国际化
- 是给开发者看的

**解决方案:**
- 默认忽略注释
- 如果需要翻译注释,需要特殊配置

#### **7. 多语言混合文本**
```jsx
// ⚠️ 复杂场景
const title = "Product产品List列表"
const msg = "Welcome欢迎to使用our我们的app应用"
```

**问题:**
- 中英文混合
- 无法准确切分
- 语义混乱

**解决方案:**
- 人工重构代码
- 统一使用单一语言

---

### 1.3 需要上下文标记的特殊场景 🏷️

#### **1. 长文本内容**
```jsx
const content = `
  这是一段很长的产品介绍文字,包含了详细的功能说明、
  使用方法、注意事项等内容。这种长文本如果自动生成
  语义化 key 会很困难...
`
```

**解决方案:** 
- 标记: `// @i18n-key: product.detail.introduction`
- 或使用 hash key 作为降级方案

#### **2. 相似文本不同用途**
```jsx
// 场景1: 按钮文本
<button>删除</button>

// 场景2: 确认对话框标题
<Modal title="删除" />

// 场景3: 操作日志
const log = "删除操作"
```

**问题:**
- 同一个词在不同场景有不同用途
- 需要生成不同的 key

**解决方案:**
- 基于上下文自动区分: `btn_delete`, `confirm_delete`, `log_delete`
- 或通过文件路径推断模块

---

## 二、i18n-extract 工具设计

### 2.1 核心功能模块

```
i18n-extract
├── Scanner          # 代码扫描器
├── ContextAnalyzer  # 上下文分析器
├── KeyGenerator     # Key 生成器
├── Marker           # 标记系统
└── Reporter         # 结果报告器
```

### 2.2 扫描器 (Scanner)

#### 功能:
- 基于 AST 遍历代码
- 提取所有包含目标语言的文本
- 收集丰富的上下文信息

#### 提取的信息:
```typescript
interface ExtractedText {
  // 文本内容
  text: string;
  
  // 位置信息
  filePath: string;
  line: number;
  column: number;
  
  // AST 节点信息
  nodeType: 'JSXText' | 'StringLiteral' | 'TemplateLiteral';
  
  // 上下文信息
  context: {
    // 父元素/语句
    parentTag?: string;          // 如: button, div, input
    parentType?: string;         // 如: JSXElement, CallExpression
    attributeName?: string;      // 如: placeholder, title
    variableName?: string;       // 如: const [title] = ...
    functionName?: string;       // 如: showMessage()
    
    // 作用域链
    scopeChain: string[];        // 如: ['UserModule', 'LoginPage', 'LoginForm']
    
    // 模块推断
    inferredModule?: string;     // 从文件路径推断: user.login
  };
  
  // 复杂度评分
  complexity: {
    hasInterpolation: boolean;   // 是否包含插值
    hasHtml: boolean;            // 是否包含 HTML
    length: number;              // 文本长度
    score: number;               // 复杂度评分 (0-10)
  };
  
  // 标记信息
  markers?: {
    manual?: boolean;            // // @i18n-manual
    ignore?: boolean;            // // @i18n-ignore
    key?: string;                // // @i18n-key: xxx
    module?: string;             // // @i18n-module: drama
    type?: string;               // // @i18n-type: button
  };
}
```

### 2.3 上下文分析器 (ContextAnalyzer)

#### 功能:
根据提取的上下文信息,推断文本的类型和模块归属

#### 推断规则:

**1. 类型推断 (Type Inference)**
```typescript
class TypeInferrer {
  infer(extracted: ExtractedText): TextType {
    // 优先级1: 显式标记
    if (extracted.markers?.type) {
      return extracted.markers.type;
    }
    
    // 优先级2: 父元素标签
    if (extracted.context.parentTag === 'button') return 'button';
    
    // 优先级3: 属性名
    if (extracted.context.attributeName === 'placeholder') return 'placeholder';
    if (extracted.context.attributeName === 'title') return 'title';
    
    // 优先级4: 变量名特征
    if (/error|err/i.test(extracted.context.variableName)) return 'error';
    if (/message|msg/i.test(extracted.context.variableName)) return 'message';
    
    // 优先级5: 文本特征
    if (/错误|失败/.test(extracted.text)) return 'error';
    if (/请输入|请选择/.test(extracted.text)) return 'placeholder';
    
    // 默认: 普通文本
    return 'text';
  }
}
```

**2. 模块推断 (Module Inference)**
```typescript
class ModuleInferrer {
  infer(extracted: ExtractedText): string {
    // 优先级1: 显式标记
    if (extracted.markers?.module) {
      return extracted.markers.module;
    }
    
    // 优先级2: 文件路径分析
    // src/pages/user/login.tsx → user.login
    const moduleFromPath = this.inferFromPath(extracted.filePath);
    if (moduleFromPath) return moduleFromPath;
    
    // 优先级3: 作用域链分析
    // 组件名: UserLoginForm → user.login
    const moduleFromScope = this.inferFromScope(extracted.context.scopeChain);
    if (moduleFromScope) return moduleFromScope;
    
    // 默认: common
    return 'common';
  }
  
  private inferFromPath(filePath: string): string | null {
    // 匹配: src/pages/{module}/{submodule}.tsx
    const match = filePath.match(/src\/pages\/([^/]+)\/([^/]+)\.(tsx?|jsx?)/);
    if (match) {
      return `${match[1]}.${match[2]}`;
    }
    
    // 匹配: src/pages/{module}.tsx
    const simpleMatch = filePath.match(/src\/pages\/([^/]+)\.(tsx?|jsx?)/);
    if (simpleMatch) {
      return simpleMatch[1];
    }
    
    return null;
  }
}
```

### 2.4 Key 生成器 (KeyGenerator)

#### 功能:
根据文本内容和上下文生成语义化 key

#### 生成策略:

```typescript
class KeyGenerator {
  generate(extracted: ExtractedText, context: AnalyzedContext): string {
    // 策略1: 显式指定 key
    if (extracted.markers?.key) {
      return extracted.markers.key;
    }
    
    // 策略2: 常用词映射
    const mappedKey = this.wordMapping[extracted.text];
    if (mappedKey) {
      const prefix = this.getPrefix(context.type);
      return prefix + mappedKey;
    }
    
    // 策略3: 语义化命名
    if (extracted.complexity.score < 5) {
      return this.generateSemanticKey(extracted, context);
    }
    
    // 策略4: 降级 - 使用 hash
    return this.generateHashKey(extracted);
  }
  
  private generateSemanticKey(
    extracted: ExtractedText, 
    context: AnalyzedContext
  ): string {
    // 1. 翻译为英文或拼音
    const semantic = this.translateToPinyin(extracted.text);
    
    // 2. 添加类型前缀
    const prefix = this.getPrefix(context.type);
    
    // 3. 处理冲突
    let key = prefix + semantic;
    if (this.existingKeys.has(key)) {
      key = this.resolveConflict(key);
    }
    
    return key;
  }
  
  private getPrefix(type: string): string {
    const prefixMap = {
      button: 'btn_',
      error: 'err_',
      placeholder: 'ph_',
      message: 'msg_',
      tip: 'tip_',
      confirm: 'confirm_',
      // ...
    };
    return prefixMap[type] || '';
  }
  
  private generateHashKey(extracted: ExtractedText): string {
    // 生成 hash + 类型前缀
    const hash = this.hash(extracted.text).substring(0, 8);
    const prefix = extracted.context.parentType || 'text';
    return `${prefix}_${hash}`;
  }
}
```

### 2.5 标记系统 (Marker System)

#### 支持的标记注释:

```typescript
// 1. 忽略翻译
// @i18n-ignore
const internalKey = "这个不需要翻译"

// 2. 手动处理
// @i18n-manual
const complexHtml = `
  <div>
    <h1>产品介绍</h1>
    <p>详细内容...</p>
  </div>
`

// 3. 指定 key
// @i18n-key: drama.detail.introduction
const intro = "这是一段很长的剧集介绍..."

// 4. 指定模块
// @i18n-module: user.login
const loginTitle = "用户登录"

// 5. 指定类型
// @i18n-type: error
const errorMsg = "操作失败"

// 6. 组合使用
// @i18n-module: drama
// @i18n-key: player.pause
const pauseText = "暂停播放"
```

#### 标记解析器:
```typescript
class MarkerParser {
  parse(code: string, line: number): Markers | null {
    // 查找当前行之前的注释
    const comments = this.extractComments(code, line);
    
    const markers: Markers = {};
    
    for (const comment of comments) {
      if (comment.includes('@i18n-ignore')) {
        markers.ignore = true;
      }
      if (comment.includes('@i18n-manual')) {
        markers.manual = true;
      }
      
      const keyMatch = comment.match(/@i18n-key:\s*(\S+)/);
      if (keyMatch) {
        markers.key = keyMatch[1];
      }
      
      const moduleMatch = comment.match(/@i18n-module:\s*(\S+)/);
      if (moduleMatch) {
        markers.module = moduleMatch[1];
      }
      
      const typeMatch = comment.match(/@i18n-type:\s*(\S+)/);
      if (typeMatch) {
        markers.type = typeMatch[1];
      }
    }
    
    return Object.keys(markers).length > 0 ? markers : null;
  }
}
```

### 2.6 结果分类与输出

#### 输出结构:
```typescript
interface ExtractResult {
  // 自动处理 (可直接替换)
  auto: {
    items: ExtractedItem[];
    count: number;
  };
  
  // 需要人工审核 (复杂度较高)
  review: {
    items: ExtractedItem[];
    count: number;
    reasons: string[]; // 需要审核的原因
  };
  
  // 手动标记 (已标记 @i18n-manual)
  manual: {
    items: ExtractedItem[];
    count: number;
  };
  
  // 忽略项 (已标记 @i18n-ignore)
  ignored: {
    items: ExtractedItem[];
    count: number;
  };
  
  // 统计信息
  stats: {
    totalFiles: number;
    totalTexts: number;
    autoProcessable: number;
    needReview: number;
    manualMarked: number;
    ignored: number;
  };
}

interface ExtractedItem {
  // 原始文本
  originalText: string;
  
  // 生成的 key
  generatedKey: string;
  
  // 模块归属
  module: string;
  
  // 文件位置
  location: {
    file: string;
    line: number;
    column: number;
  };
  
  // 上下文信息
  context: string; // 用于显示的上下文代码片段
  
  // 推荐的替换代码
  suggestedReplacement?: string;
  
  // 复杂度信息
  complexity: ComplexityInfo;
}
```

#### 输出文件:

**1. 提取清单 (extract-manifest.json)**
```json
{
  "version": "1.0.0",
  "extractDate": "2025-11-13T10:30:00Z",
  "sourceLanguage": "zh-CN",
  "targetLanguages": ["en-US", "ja-JP"],
  
  "auto": {
    "count": 156,
    "items": [
      {
        "originalText": "提交",
        "generatedKey": "btn_submit",
        "module": "common.buttons",
        "location": {
          "file": "src/pages/user/login.tsx",
          "line": 45,
          "column": 12
        },
        "context": "<button>提交</button>",
        "suggestedReplacement": "<button>{t('common.buttons.btn_submit')}</button>"
      }
    ]
  },
  
  "review": {
    "count": 23,
    "items": [
      {
        "originalText": "欢迎使用产品管理系统...",
        "generatedKey": "text_a7f9e2c1",
        "module": "drama.detail",
        "location": {
          "file": "src/pages/drama/detail.tsx",
          "line": 120,
          "column": 8
        },
        "context": "const intro = `欢迎使用...`",
        "complexity": {
          "score": 7,
          "reasons": ["长文本", "包含多个句子"]
        }
      }
    ]
  }
}
```

**2. 待翻译文件 (pending-translations.json)**
```json
{
  "zh-CN": {
    "common.buttons.btn_submit": "提交",
    "common.buttons.btn_cancel": "取消",
    "drama.list.title": "剧集列表",
    "text_a7f9e2c1": "欢迎使用产品管理系统..."
  },
  "en-US": {
    "common.buttons.btn_submit": "TODO",
    "common.buttons.btn_cancel": "TODO",
    "drama.list.title": "TODO",
    "text_a7f9e2c1": "TODO"
  }
}
```

**3. 审核报告 (review-report.md)**
```markdown
# i18n 提取审核报告

## 统计信息
- 总计文件: 45
- 总计文本: 234
- 自动处理: 156 (66.7%)
- 需要审核: 23 (9.8%)
- 手动标记: 12 (5.1%)
- 忽略项: 43 (18.4%)

## 需要审核的项目

### 1. 长文本 (12 项)
这些文本过长,难以生成语义化 key,建议人工命名或使用 hash key。

| 位置 | 文本 | 建议 Key | 操作 |
|------|------|----------|------|
| `src/pages/drama/detail.tsx:120` | "欢迎使用产品..." | `drama.detail.introduction` | 人工审核 |

### 2. 复杂插值 (8 项)
这些文本包含复杂的插值表达式,需要人工确认插值变量。

### 3. 动态拼接 (3 项)
这些文本通过字符串拼接生成,建议重构为模板字符串。

## 建议操作
1. 审核"需要审核"列表,确认 key 命名
2. 处理"手动标记"列表,完成人工翻译
3. 运行 `npm run i18n:apply` 应用自动替换
```

---

## 三、工作流设计

### 3.1 提取阶段

```bash
# 1. 运行提取命令
npm run i18n:extract

# 2. 查看提取报告
cat extract-manifest.json
cat review-report.md

# 3. 审核需要人工处理的项目
npm run i18n:review

# 4. 对于复杂场景,添加标记
# 编辑源代码,添加 @i18n-manual 或 @i18n-key 注释

# 5. 重新提取
npm run i18n:extract
```

### 3.2 替换阶段

```bash
# 1. 自动替换简单场景
npm run i18n:apply --mode=auto

# 2. 人工处理复杂场景
# 根据 suggestedReplacement 手动替换

# 3. 验证替换结果
npm run i18n:validate

# 4. 运行测试
npm run test
```

### 3.3 翻译阶段

```bash
# 1. 导出待翻译清单
npm run i18n:export-pending

# 2. 提交给翻译团队
# 翻译人员填充 en-US, ja-JP 等字段

# 3. 导入翻译结果
npm run i18n:import-translations

# 4. 构建语言包
npm run i18n:build
```

---

## 四、配置设计

### 4.1 提取配置

```typescript
// i18n.config.ts
export default {
  extract: {
    // 扫描目录
    include: ['src/**/*.{ts,tsx,js,jsx,vue}'],
    exclude: ['**/*.test.*', '**/*.spec.*', 'node_modules/**'],
    
    // Key 生成策略
    keyStrategy: 'semantic', // 'semantic' | 'hash' | 'hybrid'
    
    // 命名配置
    naming: {
      // 类型前缀映射
      prefixMap: {
        button: 'btn_',
        error: 'err_',
        placeholder: 'ph_',
        message: 'msg_',
      },
      
      // 常用词映射
      wordMapping: {
        '提交': 'submit',
        '取消': 'cancel',
        '确认': 'confirm',
        '删除': 'delete',
        '保存': 'save',
      },
      
      // 最大嵌套深度
      maxDepth: 2,
    },
    
    // 复杂度阈值
    complexity: {
      // 超过此分数需要人工审核
      reviewThreshold: 5,
      
      // 长文本阈值 (字符数)
      longTextThreshold: 50,
      
      // 是否允许 HTML
      allowHtml: false,
    },
    
    // 模块推断规则
    moduleInference: {
      // 路径映射规则
      pathPatterns: [
        { pattern: /src\/pages\/([^/]+)\/([^/]+)/, format: '$1.$2' },
        { pattern: /src\/pages\/([^/]+)/, format: '$1' },
      ],
      
      // 作用域映射规则
      scopePatterns: [
        { pattern: /^(\w+)LoginForm$/, format: '$1.login' },
        { pattern: /^(\w+)ListPage$/, format: '$1.list' },
      ],
    },
    
    // 标记系统
    markers: {
      enabled: true,
      supportedMarkers: [
        '@i18n-ignore',
        '@i18n-manual',
        '@i18n-key',
        '@i18n-module',
        '@i18n-type',
      ],
    },
    
    // 输出配置
    output: {
      manifestPath: './i18n-extract/manifest.json',
      pendingPath: './i18n-extract/pending-translations.json',
      reportPath: './i18n-extract/review-report.md',
    },
  },
  
  // 应用配置 (替换)
  apply: {
    // 替换模式
    mode: 'safe', // 'safe' | 'aggressive'
    
    // 是否备份原文件
    backup: true,
    backupPath: './i18n-backup/',
    
    // 是否生成 diff
    generateDiff: true,
  },
}
```

---

## 五、推荐的开源工具

基于现有生态,推荐以下工具作为参考或集成:

### 5.1 AST 解析相关
- **@babel/parser**: AST 解析 (已使用)
- **@babel/traverse**: AST 遍历 (已使用)
- **@babel/types**: AST 节点类型 (已使用)
- **@vue/compiler-sfc**: Vue SFC 解析

### 5.2 Key 生成相关
- **pinyin**: 中文转拼音
- **crypto**: Hash 生成
- **lodash**: 字符串处理工具

### 5.3 翻译相关
- 已有: Google, Youdao, Baidu 翻译器
- 可扩展: DeepL, ChatGPT API

### 5.4 文件处理
- **glob**: 文件匹配 (已使用)
- **fs-extra**: 文件操作
- **chalk**: 终端彩色输出
- **ora**: 进度显示

### 5.5 工具链参考

#### **i18next-scanner** (参考)
- 优点: 成熟的提取工具
- 缺点: 不支持语义化 key,需要手动标记
- 借鉴: 配置结构和输出格式

#### **kiwi** (阿里开源) (参考)
- 优点: 支持语义化 key,提供 VSCode 插件
- 缺点: 强依赖 React/Vue,不够通用
- 借鉴: Key 生成策略和审核流程

#### **react-intl** / **vue-i18n** (运行时库)
- 使用场景: 运行时翻译调用
- 兼容性: 提取工具应生成兼容的格式

---

## 六、实施建议

### 阶段 1: 增强现有插件 (2 周)

1. **扩展上下文收集**
   - 增强 visitor,收集更丰富的上下文
   - 添加文件路径和作用域链分析

2. **实现标记系统**
   - 支持注释标记
   - 集成到现有扫描流程

3. **输出分类结果**
   - 区分 auto/review/manual
   - 生成审核报告

### 阶段 2: 开发 Key 生成器 (2 周)

1. **实现类型推断**
   - 基于上下文推断文本类型
   - 添加配置化的推断规则

2. **实现模块推断**
   - 基于文件路径推断模块
   - 基于作用域链推断模块

3. **实现 Key 生成**
   - 常用词映射
   - 语义化命名
   - Hash 降级

### 阶段 3: 开发应用工具 (1 周)

1. **自动替换工具**
   - 基于 AST 进行安全替换
   - 生成 diff 和备份

2. **验证工具**
   - 检查替换后代码语法
   - 检查 key 引用完整性

### 阶段 4: 完善工具链 (1 周)

1. **i18n-check**: 一致性检查
2. **i18n-sync**: 同步 key 结构
3. **i18n-build**: 构建时合并

---

## 七、总结

### 关键要点:

1. **AST 边界明确**
   - ✅ 简单场景: JSX 文本、字符串字面量、属性值 → 可自动处理
   - ⚠️ 复杂场景: 复杂模板、动态拼接、长文本 → 需要人工审核
   - ❌ 特殊场景: 正则、SQL、注释 → 应排除或忽略

2. **上下文是关键**
   - 收集丰富的上下文信息 (父元素、变量名、文件路径)
   - 基于上下文推断类型和模块
   - 生成语义化 key

3. **标记系统补充**
   - 支持注释标记处理特殊场景
   - `@i18n-ignore`, `@i18n-manual`, `@i18n-key` 等

4. **分类输出**
   - 自动处理 (auto): 可直接替换
   - 需要审核 (review): 复杂度较高
   - 手动处理 (manual): 已标记特殊场景

5. **借鉴现有工具**
   - 不要从零开始
   - 参考 i18next-scanner, kiwi 等工具
   - 集成现有翻译服务

### 后续工作:

1. 完善配置文件设计
2. 实现 Scanner 和 ContextAnalyzer
3. 实现 KeyGenerator
4. 开发 CLI 工具
5. 编写文档和示例

