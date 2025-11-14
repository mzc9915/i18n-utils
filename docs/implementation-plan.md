# 国际化方案实施计划

## 一、项目现状分析

### 1.1 现有插件能力

当前 `auto-i18n-translation-plugins` 项目具备以下能力：

- ✅ 自动扫描代码中的中文字符串
- ✅ 自动生成 hash key（如 `zccsau6`、`dure2` 等）
- ✅ 支持多种翻译服务（Google、有道、百度、火山引擎等）
- ✅ 支持 Webpack、Vite、Rsbuild 等主流构建工具
- ✅ 生成统一的 `lang/index.json` 翻译文件

**文件输出示例：**
```json
{
  "zccsau6": {
    "en": "Hello,",
    "zh-cn": "你好,",
    "ko": "안녕 하세요,",
    "ja": "こんにちは"
  }
}
```

### 1.2 存在的问题

1. **Key 不可读**：纯 hash 方式（如 `zccsau6`），维护困难
2. **单一文件**：所有翻译在一个大 JSON 文件中，缺少模块化
3. **缺少语义**：看不出 key 的含义和使用场景
4. **难以协作**：翻译人员无法理解上下文

### 1.3 改进目标

基于《国际化解决方案设计文档》，我们需要：

1. **语义化 Key**：从 `zccsau6` 改为 `common.buttons.submit`
2. **模块化管理**：按业务模块划分文件
3. **Key 聚合**：每个 key 下维护所有语言
4. **构建时合并**：开发时分散，构建时合并

---

## 二、实施方案

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   开发阶段                               │
│  src/locales/                                           │
│    ├── common/buttons.ts (语义化 + Key聚合)            │
│    ├── drama/list.ts                                    │
│    └── drama/detail.ts                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │  构建工具 (i18n-builder)  │
          └─────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   构建输出                               │
│  dist/locales/                                          │
│    ├── zh-CN.json (扁平化，按语言分组)                  │
│    ├── en-US.json                                       │
│    └── ja-JP.json                                       │
└─────────────────────────────────────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │  运行时 (i18next/vue-i18n) │
          └─────────────────────────┘
```

### 2.2 技术路线

#### 方案 A：扩展现有插件（推荐）

**思路**：在现有插件基础上增加配置选项，支持语义化 Key 生成

**优点**：
- 复用现有的扫描和翻译逻辑
- 保持插件的兼容性
- 渐进式升级

**改动点**：
1. 增加 `keyNamingStrategy` 配置：`hash` | `semantic` | `hybrid`
2. 增加 `fileOrganization` 配置：`single` | `modular`
3. 增加 `keyAggregation` 配置：是否按 key 聚合所有语言
4. 提供智能命名器：根据上下文生成语义化 key

#### 方案 B：独立工具链（适合复杂场景）

**思路**：开发独立的命令行工具，配合现有插件使用

**优点**：
- 功能更灵活
- 不影响现有插件
- 支持更多高级特性

**工具集**：
- `i18n-extract`：提取 + 语义化命名
- `i18n-build`：构建时合并
- `i18n-check`：一致性检查
- `i18n-sync`：同步 key 结构

---

## 三、具体实施步骤

### 阶段一：配置文件设计（Week 1）

#### 1. 新增配置项

```typescript
// i18n.config.ts
export interface I18nConfig {
  // 现有配置...
  
  // 新增：Key 命名策略
  keyNamingStrategy?: 'hash' | 'semantic' | 'hybrid';
  
  // 新增：Key 生成规则
  keyGeneration?: {
    // 前缀映射
    prefixMap?: {
      button: 'btn_';
      error: 'err_';
      placeholder: 'ph_';
      // ...
    };
    
    // 常用词映射
    wordMapping?: {
      '提交': 'submit';
      '取消': 'cancel';
      // ...
    };
    
    // 最大嵌套深度
    maxDepth?: number;
  };
  
  // 新增：文件组织方式
  fileOrganization?: {
    mode: 'single' | 'modular';  // 单文件 or 模块化
    aggregation: boolean;         // 是否按 key 聚合语言
    structure?: {
      common: string[];           // 公共文案分类
      modules: Record<string, string[]>;  // 业务模块
    };
  };
  
  // 新增：构建配置
  build?: {
    mergeOnBuild: boolean;        // 构建时是否合并
    outputFormat: 'flat' | 'nested';  // 输出格式
  };
}
```

#### 2. 默认配置

```typescript
const DEFAULT_I18N_CONFIG = {
  keyNamingStrategy: 'hybrid',  // 默认混合模式
  keyGeneration: {
    prefixMap: {
      button: 'btn_',
      error: 'err_',
      placeholder: 'ph_',
      message: 'msg_',
      tip: 'tip_'
    },
    wordMapping: {
      '提交': 'submit',
      '取消': 'cancel',
      '确认': 'confirm',
      '删除': 'delete',
      '保存': 'save',
      '编辑': 'edit'
    },
    maxDepth: 2
  },
  fileOrganization: {
    mode: 'modular',
    aggregation: true,
    structure: {
      common: ['buttons', 'actions', 'messages', 'errors', 'validation'],
      modules: {}  // 根据项目自定义
    }
  },
  build: {
    mergeOnBuild: true,
    outputFormat: 'flat'
  }
};
```

### 阶段二：智能命名器（Week 2）

#### 核心功能

```typescript
class SemanticKeyGenerator {
  /**
   * 根据文本和上下文生成语义化 key
   */
  generate(text: string, context: Context): string {
    // 1. 检测文本类型（按钮、错误、占位符等）
    const type = this.detectType(text, context);
    
    // 2. 检查常用词映射
    const mappedKey = this.checkWordMapping(text);
    
    // 3. 添加前缀
    const prefix = this.getPrefix(type);
    
    // 4. 生成最终 key
    if (mappedKey) {
      return prefix + mappedKey;
    }
    
    // 5. 转换为拼音或英文
    const semantic = this.toSemantic(text);
    
    // 6. 降级：如果语义化失败，使用 hash
    return semantic || this.generateHash(text);
  }
  
  /**
   * 检测文本类型
   */
  private detectType(text: string, context: Context): string {
    // 根据父元素判断
    if (context.parentTag === 'button') return 'button';
    if (context.parentTag === 'input' && context.attr === 'placeholder') {
      return 'placeholder';
    }
    
    // 根据文本特征判断
    if (/错误|失败/.test(text)) return 'error';
    if (/请输入|请选择/.test(text)) return 'placeholder';
    
    return 'text';
  }
}
```

### 阶段三：模块化文件生成（Week 3）

#### 文件生成器

```typescript
class ModularFileGenerator {
  /**
   * 将扫描结果组织为模块化文件
   */
  generate(scanResults: ScanResult[], config: I18nConfig) {
    const modules = this.groupByModule(scanResults);
    
    for (const [moduleName, items] of Object.entries(modules)) {
      const content = this.generateModuleContent(items);
      this.writeFile(`src/locales/${moduleName}.ts`, content);
    }
  }
  
  /**
   * 生成模块文件内容
   */
  private generateModuleContent(items: TranslationItem[]) {
    const lines = ['export default {'];
    
    for (const item of items) {
      lines.push(`  ${item.key}: {`);
      for (const [lang, text] of Object.entries(item.translations)) {
        lines.push(`    '${lang}': '${text}',`);
      }
      lines.push(`  },`);
    }
    
    lines.push('};');
    return lines.join('\n');
  }
}
```

### 阶段四：构建工具（Week 4）

#### 构建时合并

```typescript
class I18nBuilder {
  /**
   * 构建时将模块化文件合并为按语言分组
   */
  async build() {
    // 1. 扫描所有翻译文件
    const files = glob.sync('src/locales/**/*.ts');
    
    // 2. 提取所有翻译
    const translations = await this.extractTranslations(files);
    
    // 3. 按语言重组
    const byLang = this.groupByLanguage(translations);
    
    // 4. 输出
    for (const [lang, content] of Object.entries(byLang)) {
      this.writeJSON(`dist/locales/${lang}.json`, content);
    }
  }
  
  /**
   * 按语言重组数据
   */
  private groupByLanguage(translations: Translation[]) {
    const result: Record<string, Record<string, string>> = {};
    
    for (const item of translations) {
      const fullKey = `${item.module}.${item.key}`;
      
      for (const [lang, text] of Object.entries(item.translations)) {
        result[lang] = result[lang] || {};
        result[lang][fullKey] = text;
      }
    }
    
    return result;
  }
}
```

### 阶段五：一致性检查（Week 5）

#### 检查工具

```typescript
class I18nChecker {
  /**
   * 检查所有语言的 key 是否一致
   */
  check() {
    const files = this.getTranslationFiles();
    const issues: Issue[] = [];
    
    for (const file of files) {
      const content = this.loadFile(file);
      
      // 检查 1：所有语言 key 是否一致
      const keyIssues = this.checkKeyConsistency(content);
      issues.push(...keyIssues);
      
      // 检查 2：翻译内容是否为空
      const emptyIssues = this.checkEmptyTranslations(content);
      issues.push(...emptyIssues);
      
      // 检查 3：插值变量是否一致
      const varIssues = this.checkInterpolationVars(content);
      issues.push(...varIssues);
    }
    
    return issues;
  }
}
```

---

## 四、兼容性方案

### 4.1 渐进式迁移

为了保证现有项目平滑升级，提供兼容模式：

```typescript
// 配置文件
export default {
  // 开启兼容模式
  compatibilityMode: 'legacy',  // 'legacy' | 'modern' | 'hybrid'
  
  // legacy: 完全兼容现有 hash 模式
  // modern: 使用新的语义化模式
  // hybrid: 混合模式，新功能用语义化，老功能保持 hash
}
```

### 4.2 迁移脚本

```typescript
// 提供自动迁移工具
class LegacyMigrator {
  /**
   * 将现有的 hash key 映射为语义化 key
   */
  migrate() {
    const legacy = this.loadLegacyJSON();
    const mapping = this.generateMapping(legacy);
    
    // 生成映射文件
    this.writeMappingFile(mapping);
    
    // 更新代码中的引用
    this.updateCodeReferences(mapping);
  }
}
```

---

## 五、开发计划

### Week 1-2：设计与配置
- [ ] 完善配置文件结构
- [ ] 设计 API 接口
- [ ] 编写技术方案文档

### Week 3-4：核心功能开发
- [ ] 实现智能命名器
- [ ] 实现模块化文件生成
- [ ] 实现构建工具

### Week 5-6：辅助工具
- [ ] 开发一致性检查工具
- [ ] 开发同步工具
- [ ] 开发类型生成工具

### Week 7-8：测试与优化
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化

### Week 9-10：文档与示例
- [ ] API 文档
- [ ] 使用指南
- [ ] 示例项目

---

## 六、关键技术点

### 6.1 AST 解析增强

```typescript
// 增强上下文识别能力
interface EnhancedContext {
  // 文件信息
  filePath: string;
  fileType: 'vue' | 'tsx' | 'jsx';
  
  // 代码位置
  line: number;
  column: number;
  
  // 元素信息
  parentTag: string;
  parentComponent: string;
  attributes: Record<string, string>;
  
  // 作用域信息
  scopeChain: string[];  // 如 ['UserModule', 'LoginPage', 'LoginForm']
}
```

### 6.2 智能分类算法

```typescript
// 根据多种信息推断文本分类
class TextClassifier {
  classify(text: string, context: EnhancedContext): Classification {
    // 1. 文件路径分析
    const moduleFromPath = this.inferModuleFromPath(context.filePath);
    // 例如：src/pages/user/login.tsx → user.login
    
    // 2. 组件作用域分析
    const moduleFromScope = this.inferModuleFromScope(context.scopeChain);
    
    // 3. 文本特征分析
    const typeFromText = this.inferTypeFromText(text);
    
    // 4. 上下文分析
    const typeFromContext = this.inferTypeFromContext(context);
    
    return {
      module: moduleFromPath || moduleFromScope || 'common',
      type: typeFromContext || typeFromText || 'text'
    };
  }
}
```

### 6.3 冲突解决

```typescript
// 处理 key 命名冲突
class KeyConflictResolver {
  resolve(key: string, existingKeys: Set<string>): string {
    if (!existingKeys.has(key)) {
      return key;
    }
    
    // 策略 1：添加数字后缀
    let suffix = 2;
    while (existingKeys.has(`${key}${suffix}`)) {
      suffix++;
    }
    
    return `${key}${suffix}`;
  }
}
```

---

## 七、测试策略

### 7.1 单元测试

```typescript
describe('SemanticKeyGenerator', () => {
  it('should generate button key with prefix', () => {
    const generator = new SemanticKeyGenerator();
    const result = generator.generate('提交', {
      parentTag: 'button'
    });
    expect(result).toBe('btn_submit');
  });
  
  it('should fallback to hash for complex text', () => {
    const generator = new SemanticKeyGenerator();
    const result = generator.generate('这是一段很长的复杂文本...', {});
    expect(result).toMatch(/^text_[a-z0-9]+$/);
  });
});
```

### 7.2 集成测试

```typescript
describe('Full Pipeline', () => {
  it('should extract, name, and build correctly', async () => {
    // 1. 扫描测试项目
    const results = await extract('./test-project');
    
    // 2. 生成模块化文件
    await generateModules(results);
    
    // 3. 构建
    await build();
    
    // 4. 验证输出
    const zhCN = require('./dist/locales/zh-CN.json');
    expect(zhCN['common.buttons.submit']).toBe('提交');
  });
});
```

---

## 八、注意事项

### 8.1 性能考虑

- 大型项目可能有上千个翻译条目，需要考虑：
  - 文件扫描性能
  - AST 解析性能
  - 构建时间

**优化方案**：
- 使用缓存机制
- 增量构建
- 并行处理

### 8.2 兼容性考虑

- 保持与现有插件的向后兼容
- 提供迁移工具和文档
- 支持渐进式升级

### 8.3 用户体验

- 提供 VSCode 插件
- 自动补全和跳转
- 错误提示和修复建议

---

## 九、里程碑

| 时间 | 里程碑 | 交付物 |
|-----|-------|--------|
| Week 2 | 设计完成 | 技术方案、API 设计 |
| Week 4 | 核心功能 | 命名器、文件生成器 |
| Week 6 | 辅助工具 | 检查、同步、类型生成 |
| Week 8 | 测试完成 | 测试报告、性能优化 |
| Week 10 | 发布 v2.0 | 完整文档、示例项目 |

---

## 十、后续规划

### Phase 2 功能（v2.1）
- [ ] VSCode 插件
- [ ] 在线翻译管理平台
- [ ] AI 辅助翻译建议

### Phase 3 功能（v2.2）
- [ ] 多项目翻译复用
- [ ] 翻译版本管理
- [ ] A/B 测试支持

---

**最后更新**：2025-11-13  
**维护者**：国际化工作组

