# 翻译 Key 生成策略

## 设计理念

**核心思想**：**命名空间 + Hash** 的复合命名方式

### 为什么不用语义化命名？

语义化命名（如 `user.profile.greeting`）存在以下问题：

1. **难以自动生成**：
   - 无法准确判断上下文语义
   - 容易产生歧义（同一个"提交"按钮，在不同页面的语义不同）
   - 需要大量规则和人工干预

2. **维护成本高**：
   - 代码重构时需要同步更新 key
   - 容易产生命名冲突
   - 难以统一命名规范

3. **灵活性差**：
   - 无法自动复用相同文本
   - 难以跨模块共享翻译

### 命名空间 + Hash 的优势

```
格式: {namespace}_{hash}
示例: product_a7f9e2c1
```

**✅ 优点：**

1. **简单可靠**：不需要复杂的语义分析，完全自动化
2. **稳定性好**：相同文本总是生成相同的 hash
3. **模块化**：通过 namespace 区分不同业务模块
4. **自动去重**：相同文本在同一 namespace 下自动复用
5. **可追溯**：hash 基于文本内容，便于反向查找

---

## 实现方案

### 1. 基础实现

```typescript
import crypto from 'crypto';

/**
 * 生成翻译 key
 * @param text 文本内容（参数化后的）
 * @param namespace 命名空间
 * @param hashLength hash 长度，默认 8
 */
function generateKey(
  text: string,
  namespace: string,
  hashLength: number = 8
): string {
  const hash = crypto
    .createHash('md5')
    .update(text)
    .digest('hex')
    .substring(0, hashLength);
  
  return `${namespace}_${hash}`;
}

// 使用示例
const key1 = generateKey('你好，{userName}!', 'user');
// 结果: 'user_a7f9e2c1'

const key2 = generateKey('提交', 'product');
// 结果: 'product_9f86d081'
```

### 2. Hash 冲突处理

虽然 MD5 的 8 位 hash 冲突概率很低，但仍需要处理：

```typescript
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

### 3. 去重与复用

```typescript
interface ExtractResult {
  texts: Map<string, ExtractedText>;
  duplicates: Array<{
    key: string;
    locations: string[];
  }>;
}

function deduplicateTexts(results: ExtractedText[]): ExtractResult {
  const textsMap = new Map<string, ExtractedText>();
  const locationMap = new Map<string, string[]>();
  
  for (const result of results) {
    const { key, location } = result;
    
    // 记录位置
    if (!locationMap.has(key)) {
      locationMap.set(key, []);
    }
    locationMap.get(key)!.push(`${location.file}:${location.line}`);
    
    // 保存第一次出现的结果
    if (!textsMap.has(key)) {
      textsMap.set(key, result);
    }
  }
  
  // 找出被复用的 key
  const duplicates = Array.from(locationMap.entries())
    .filter(([_, locations]) => locations.length > 1)
    .map(([key, locations]) => ({ key, locations }));
  
  return { texts: textsMap, duplicates };
}
```

---

## 命名空间规划

### 推荐方案

```typescript
// 配置文件: i18n.config.js
export default {
  extract: {
    patterns: [
      // 按业务模块划分
      { files: 'src/views/product/**/*.vue', namespace: 'product' },
      { files: 'src/views/user/**/*.vue', namespace: 'user' },
      { files: 'src/views/order/**/*.vue', namespace: 'order' },
      
      // 公共组件
      { files: 'src/components/**/*.vue', namespace: 'common' },
      
      // 布局和页面框架
      { files: 'src/layouts/**/*.vue', namespace: 'layout' },
    ]
  }
}
```

### CLI 使用

```bash
# 单个命名空间
$ i18n-extract --namespace=product src/views/product/**/*.vue

# 多个模块，分别提取
$ i18n-extract --namespace=product src/views/product/**/*.vue
$ i18n-extract --namespace=user src/views/user/**/*.vue

# 使用配置文件
$ i18n-extract --config=i18n.config.js
```

---

## 示例对比

### 场景 1：相同文本，相同 namespace

```typescript
// 文件: src/views/product/List.vue
<button>提交</button>

// 文件: src/views/product/Detail.vue
<button>提交</button>

// 提取结果（自动复用）
{
  key: 'product_9f86d081',
  text: '提交',
  locations: [
    'src/views/product/List.vue:10',
    'src/views/product/Detail.vue:25'
  ]
}
```

### 场景 2：相同文本，不同 namespace

```typescript
// 文件: src/views/product/List.vue (namespace: product)
<button>提交</button>

// 文件: src/views/user/Profile.vue (namespace: user)
<button>提交</button>

// 提取结果（独立的 key）
[
  { key: 'product_9f86d081', text: '提交', file: 'product/List.vue' },
  { key: 'user_9f86d081', text: '提交', file: 'user/Profile.vue' }
]
```

**为什么要分开？**
- 不同业务模块的"提交"可能有不同的翻译需求
- 便于按模块管理翻译文件
- 避免跨模块的翻译耦合

### 场景 3：参数化文本

```typescript
// 原始代码
const greeting = `欢迎${this.userName}使用系统`;

// 参数化后
const text = '欢迎{userName}使用系统';

// 生成 key（基于参数化后的文本）
const key = generateKey(text, 'common');
// 结果: 'common_f3e8d2a9'

// 相同参数化文本会生成相同的 key
const greeting2 = '欢迎' + this.userName + '使用系统';
// 参数化后也是: '欢迎{userName}使用系统'
// key 也是: 'common_f3e8d2a9' ✅ 自动复用
```

---

## 输出格式

### JSON 输出

```json
{
  "namespace": "product",
  "texts": [
    {
      "key": "product_a7f9e2c1",
      "text": "你好，{userName}!",
      "params": ["userName"],
      "context": { ... },
      "location": { ... }
    }
  ],
  "duplicates": [
    {
      "key": "product_9f86d081",
      "text": "提交",
      "locations": [
        "src/views/product/List.vue:10",
        "src/views/product/Detail.vue:25"
      ]
    }
  ],
  "stats": {
    "total": 50,
    "unique": 45,
    "reused": 5
  }
}
```

### 语言文件输出

```json
// locales/zh-CN.json
{
  "product_a7f9e2c1": "你好，{userName}!",
  "product_9f86d081": "提交",
  "product_b8c3d4e2": "产品列表",
  ...
}

// locales/en-US.json
{
  "product_a7f9e2c1": "Hello, {userName}!",
  "product_9f86d081": "Submit",
  "product_b8c3d4e2": "Product List",
  ...
}
```

---

## 总结

### 核心优势

1. ✅ **完全自动化**：无需人工干预命名
2. ✅ **稳定可靠**：相同文本总是生成相同的 key
3. ✅ **模块隔离**：通过 namespace 区分业务模块
4. ✅ **自动复用**：相同文本自动去重，节省翻译成本
5. ✅ **可追溯性**：hash 基于内容，便于反向查找

### 与语义化命名对比

| 特性 | 命名空间+Hash | 语义化命名 |
|------|--------------|-----------|
| 自动化程度 | ✅ 完全自动 | ⚠️ 需要大量规则 |
| 稳定性 | ✅ 非常稳定 | ❌ 重构易出问题 |
| 去重能力 | ✅ 自动去重 | ❌ 难以识别重复 |
| 维护成本 | ✅ 低 | ❌ 高 |
| 可读性 | ⚠️ 需要工具辅助 | ✅ 直观易读 |

**结论**：对于自动化提取工具，**命名空间 + Hash** 是更实用的方案。

