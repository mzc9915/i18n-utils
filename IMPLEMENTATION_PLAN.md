# i18n-extract 实现计划

## 一、项目结构（Monorepo）

```
i18n-utils/
├── packages/
│   ├── extract/              # 提取功能包
│   │   ├── src/
│   │   │   ├── index.ts      # 入口文件
│   │   │   ├── types.ts      # 核心类型定义
│   │   │   ├── parser/       # 解析器
│   │   │   │   ├── vue.ts    # Vue 文件解析
│   │   │   │   ├── template.ts  # Template 解析
│   │   │   │   └── script.ts    # Script 解析
│   │   │   ├── generator/    # 生成器
│   │   │   │   └── key.ts    # Key 生成
│   │   │   └── utils/        # 工具函数
│   │   │       └── chinese.ts   # 中文检测
│   │   ├── test/             # 测试文件
│   │   └── package.json
│   └── cli/                  # CLI 工具（后续实现）
├── package.json
├── tsconfig.json
└── pnpm-workspace.yaml
```

## 二、核心入口参数设计

### 主函数签名

```typescript
// packages/extract/src/index.ts
export function extract(options: ExtractOptions): ExtractResult;
```

### 入口参数（ExtractOptions）

```typescript
interface ExtractOptions {
  // 必选：文件路径（单个文件或 glob 模式）
  files: string | string[];
  
  // 必选：命名空间
  namespace: string;
  
  // 可选：工作目录（默认 process.cwd()）
  cwd?: string;
  
  // 可选：排除模式（默认 ['**/node_modules/**']）
  exclude?: string[];
}
```

**说明**：
- ✅ 参数精简，只保留核心必需的
- ✅ `files` 支持单个文件或 glob 模式
- ✅ `namespace` 必传，用于生成 key
- ✅ `cwd` 和 `exclude` 有合理默认值

### 返回结果（ExtractResult）

```typescript
interface ExtractResult {
  // 命名空间
  namespace: string;
  
  // 提取的文本列表
  texts: ExtractedText[];
  
  // 统计信息
  stats: {
    total: number;
    files: number;
  };
}
```

## 三、实现步骤

### Step 1: 项目初始化 + 类型定义 ✅
- 创建 monorepo 结构
- 定义核心类型（types.ts）
- 配置 TypeScript

### Step 2: 工具函数实现
- 中文检测函数
- Key 生成函数

### Step 3: Vue SFC 解析
- 使用 @vue/compiler-sfc 解析 .vue 文件
- 提取 template 和 script 内容

### Step 4: Template 解析
- 使用 @vue/compiler-dom 解析模板
- 提取文本节点和属性

### Step 5: Script 解析
- 使用 @babel/parser 解析 JavaScript
- 提取字符串字面量
- 处理模板字符串
- 处理字符串拼接

### Step 6: 整合 + 测试
- 整合所有模块
- 编写测试用例
- 确保可以快速测试

## 四、快速测试方案

```typescript
// packages/extract/test/quick-test.ts
import { extract } from '../src/index';

// 测试单个文件
const result = extract({
  files: './fixtures/Test.vue',
  namespace: 'test',
});

console.log(JSON.stringify(result, null, 2));
```

运行测试：
```bash
cd packages/extract
pnpm test:quick
```

---

## 当前步骤：Step 1 - 项目初始化 + 类型定义

准备开始实现...

