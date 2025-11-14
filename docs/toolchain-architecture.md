# i18n 工具链架构设计

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         i18n 工具链                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │ i18n-extract │──>│ i18n-review  │──>│  i18n-apply  │       │
│  │  代码提取    │   │   人工审核    │   │  代码替换    │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│         │                                      │                │
│         v                                      v                │
│  ┌──────────────┐                      ┌──────────────┐       │
│  │pending-trans │                      │ 替换后的代码  │       │
│  │   待翻译清单  │                      └──────────────┘       │
│  └──────────────┘                                              │
│         │                                                       │
│         v                                                       │
│  ┌──────────────┐   ┌──────────────┐                          │
│  │   翻译服务    │──>│ i18n-import  │                          │
│  │ (人工/API)   │   │  导入翻译    │                          │
│  └──────────────┘   └──────────────┘                          │
│                              │                                  │
│                              v                                  │
│                      ┌──────────────┐                          │
│                      │locales/*.ts  │                          │
│                      │ 翻译文件     │                          │
│                      └──────────────┘                          │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         v                    v                    v            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ i18n-check   │   │  i18n-sync   │   │ i18n-build   │      │
│  │  一致性检查   │   │  同步 key    │   │  构建合并    │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
│                                                  │              │
│                                                  v              │
│                                          ┌──────────────┐      │
│                                          │dist/locales/ │      │
│                                          │  按语言分组   │      │
│                                          └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、工具详细设计

### 2.1 i18n-extract (提取工具)

#### 核心职责:
1. 扫描源代码,提取待翻译文本
2. 分析上下文,生成语义化 key
3. 分类输出 (自动/审核/手动)
4. 生成待翻译清单

#### 输入:
- 源代码文件 (`src/**/*.{ts,tsx,js,jsx,vue}`)
- 配置文件 (`i18n.config.ts`)

#### 输出:
- `extract-manifest.json`: 提取清单 (包含所有提取项的详细信息)
- `pending-translations.json`: 待翻译文件 (源语言 + TODO 目标语言)
- `review-report.md`: 审核报告 (需要人工处理的项目)
- `auto-items.json`: 可自动处理的项目列表

#### 工作流程:

```typescript
class I18nExtractor {
  async extract() {
    // 1. 扫描文件
    const files = await this.scanFiles();
    
    // 2. 对每个文件进行 AST 解析
    const allExtracted: ExtractedText[] = [];
    for (const file of files) {
      const extracted = await this.parseFile(file);
      allExtracted.push(...extracted);
    }
    
    // 3. 上下文分析和 key 生成
    const analyzed = await this.analyzeAndGenerateKeys(allExtracted);
    
    // 4. 分类
    const classified = this.classify(analyzed);
    
    // 5. 输出结果
    await this.outputResults(classified);
    
    // 6. 生成报告
    await this.generateReport(classified);
  }
  
  private classify(items: AnalyzedItem[]): ClassifiedResult {
    return {
      auto: items.filter(item => 
        item.complexity.score < 5 && 
        !item.markers?.manual
      ),
      review: items.filter(item => 
        item.complexity.score >= 5 && 
        !item.markers?.manual
      ),
      manual: items.filter(item => 
        item.markers?.manual
      ),
      ignored: items.filter(item => 
        item.markers?.ignore
      ),
    };
  }
}
```

#### 命令行接口:

```bash
# 基础用法
npm run i18n:extract

# 指定配置文件
npm run i18n:extract -- --config=./custom-i18n.config.ts

# 只扫描特定目录
npm run i18n:extract -- --include="src/pages/user/**"

# 查看详细日志
npm run i18n:extract -- --verbose

# 输出到指定目录
npm run i18n:extract -- --output=./i18n-extract-result/
```

---

### 2.2 i18n-review (审核工具)

#### 核心职责:
1. 交互式审核需要人工确认的项目
2. 调整 key 命名
3. 调整模块归属
4. 标记处理方式 (自动/手动/忽略)

#### 输入:
- `extract-manifest.json` (提取清单)

#### 输出:
- `reviewed-manifest.json` (审核后的清单)
- 更新 `auto-items.json` 和 `manual-items.json`

#### 交互界面 (CLI):

```
┌─────────────────────────────────────────────────────────┐
│ i18n Review Tool - 审核进度: 3/23                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📄 文件: src/pages/drama/detail.tsx:120                 │
│ 📝 文本: "欢迎使用我们的产品管理系统,这里提供..."       │
│                                                          │
│ 🏷️  建议 Key: text_a7f9e2c1                            │
│ 📦 建议模块: drama.detail                               │
│                                                          │
│ ⚠️  复杂度: 7/10                                        │
│    原因: 长文本 (125 字符), 包含多个句子                │
│                                                          │
│ 🔍 上下文:                                              │
│    const introduction = `欢迎使用...`                   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ 操作:                                                    │
│   [1] 接受建议 key                                       │
│   [2] 自定义 key   → introduction                       │
│   [3] 自定义模块   → drama.detail                       │
│   [4] 标记为手动处理                                     │
│   [5] 忽略此项                                          │
│   [s] 跳过                                              │
│   [q] 退出审核                                          │
│                                                          │
│ 请输入选项 (1-5/s/q): _                                 │
└─────────────────────────────────────────────────────────┘
```

#### 命令行接口:

```bash
# 交互式审核
npm run i18n:review

# 快速模式 (自动接受所有建议)
npm run i18n:review -- --accept-all

# 只审核特定模块
npm run i18n:review -- --module=drama

# 批量操作 (通过配置文件)
npm run i18n:review -- --batch=./review-config.json
```

---

### 2.3 i18n-apply (代码替换工具)

#### 核心职责:
1. 将提取的中文替换为 `t()` 调用
2. 保持代码格式和结构
3. 生成 diff 和备份
4. 支持撤销

#### 输入:
- `auto-items.json` (可自动处理的项目)
- `reviewed-manifest.json` (审核后的清单)
- 源代码文件

#### 输出:
- 更新后的源代码文件
- `apply-diff.patch` (变更 diff)
- `backup/` (原文件备份)

#### 替换策略:

```typescript
class I18nApplier {
  async apply(mode: 'auto' | 'all' = 'auto') {
    // 1. 加载待处理项目
    const items = mode === 'auto' 
      ? await this.loadAutoItems()
      : await this.loadAllItems();
    
    // 2. 按文件分组
    const itemsByFile = this.groupByFile(items);
    
    // 3. 对每个文件进行替换
    for (const [filePath, fileItems] of Object.entries(itemsByFile)) {
      // 备份原文件
      await this.backup(filePath);
      
      // AST 替换
      const result = await this.replaceInFile(filePath, fileItems);
      
      // 生成 diff
      await this.generateDiff(filePath, result);
      
      // 写入文件
      await this.writeFile(filePath, result.code);
    }
  }
  
  private async replaceInFile(
    filePath: string, 
    items: ApplyItem[]
  ): Promise<ReplaceResult> {
    const code = await fs.readFile(filePath, 'utf-8');
    const ast = parse(code);
    
    // 按行号排序 (从后往前替换,避免位置偏移)
    const sortedItems = items.sort((a, b) => b.line - a.line);
    
    traverse(ast, {
      // 根据 nodeType 使用对应的 visitor
      StringLiteral(path) {
        const item = this.findMatchingItem(path, sortedItems);
        if (item) {
          const replacement = this.generateReplacement(item);
          path.replaceWith(replacement);
        }
      },
      JSXText(path) {
        // 同上...
      },
    });
    
    const newCode = generate(ast);
    return { code: newCode, ast };
  }
  
  private generateReplacement(item: ApplyItem): Node {
    const fullKey = `${item.module}.${item.key}`;
    
    // 根据上下文生成不同的替换代码
    if (item.nodeType === 'JSXText') {
      // <div>文本</div> → <div>{t('key')}</div>
      return types.jSXExpressionContainer(
        types.callExpression(
          types.identifier('t'),
          [types.stringLiteral(fullKey)]
        )
      );
    } else if (item.parentType === 'JSXAttribute') {
      // <input placeholder="文本" />
      // → <input placeholder={t('key')} />
      return types.jSXExpressionContainer(
        types.callExpression(
          types.identifier('t'),
          [types.stringLiteral(fullKey)]
        )
      );
    } else {
      // const x = "文本" → const x = t('key')
      return types.callExpression(
        types.identifier('t'),
        [types.stringLiteral(fullKey)]
      );
    }
  }
}
```

#### 命令行接口:

```bash
# 只应用自动处理项
npm run i18n:apply

# 应用所有项 (包括审核后的)
npm run i18n:apply -- --mode=all

# 预览变更 (不实际修改文件)
npm run i18n:apply -- --dry-run

# 只处理特定文件
npm run i18n:apply -- --file="src/pages/user/login.tsx"

# 撤销替换
npm run i18n:apply -- --undo
```

---

### 2.4 i18n-sync (同步工具)

#### 核心职责:
1. 以源语言 (如中文) 为基准
2. 同步其他语言的 key 结构
3. 自动添加缺失的 key (标记 TODO)
4. 移除废弃的 key

#### 输入:
- `src/locales/**/*.ts` (所有翻译文件)

#### 输出:
- 更新后的翻译文件
- `sync-report.json` (同步报告)

#### 同步逻辑:

```typescript
class I18nSyncer {
  async sync() {
    // 1. 加载所有翻译文件
    const files = await this.loadAllTranslationFiles();
    
    // 2. 提取所有 key 和语言
    const { keys, languages } = this.extractKeysAndLanguages(files);
    
    // 3. 检测问题
    const issues = this.detectIssues(keys, languages);
    
    // 4. 自动修复
    const fixed = await this.autoFix(issues);
    
    // 5. 生成报告
    await this.generateReport(issues, fixed);
  }
  
  private detectIssues(
    keys: Set<string>, 
    languages: string[]
  ): SyncIssue[] {
    const issues: SyncIssue[] = [];
    
    for (const file of this.translationFiles) {
      const content = file.content;
      
      // 检查每个 key
      for (const [key, translations] of Object.entries(content)) {
        // 问题1: 某些语言缺失
        const missingLangs = languages.filter(
          lang => !translations[lang]
        );
        if (missingLangs.length > 0) {
          issues.push({
            type: 'MISSING_TRANSLATION',
            file: file.path,
            key,
            missingLangs,
          });
        }
        
        // 问题2: 翻译为空
        const emptyLangs = languages.filter(
          lang => translations[lang] === '' || 
                  translations[lang] === 'TODO'
        );
        if (emptyLangs.length > 0) {
          issues.push({
            type: 'EMPTY_TRANSLATION',
            file: file.path,
            key,
            emptyLangs,
          });
        }
        
        // 问题3: 多余的语言
        const extraLangs = Object.keys(translations).filter(
          lang => !languages.includes(lang)
        );
        if (extraLangs.length > 0) {
          issues.push({
            type: 'EXTRA_LANGUAGE',
            file: file.path,
            key,
            extraLangs,
          });
        }
      }
    }
    
    return issues;
  }
  
  private async autoFix(issues: SyncIssue[]): Promise<FixResult[]> {
    const results: FixResult[] = [];
    
    for (const issue of issues) {
      if (issue.type === 'MISSING_TRANSLATION') {
        // 添加缺失的语言,标记为 TODO
        for (const lang of issue.missingLangs) {
          await this.addTranslation(
            issue.file, 
            issue.key, 
            lang, 
            'TODO'
          );
        }
        results.push({ issue, action: 'ADDED_TODO' });
      }
      
      if (issue.type === 'EXTRA_LANGUAGE') {
        // 移除多余的语言
        for (const lang of issue.extraLangs) {
          await this.removeTranslation(issue.file, issue.key, lang);
        }
        results.push({ issue, action: 'REMOVED' });
      }
    }
    
    return results;
  }
}
```

#### 命令行接口:

```bash
# 检查并同步
npm run i18n:sync

# 只检查不修复
npm run i18n:sync -- --check-only

# 自动填充 TODO
npm run i18n:sync -- --fill-todo

# 移除废弃 key
npm run i18n:sync -- --remove-unused
```

---

### 2.5 i18n-check (一致性检查工具)

#### 核心职责:
1. 检查所有 key 在所有语言中是否存在
2. 检测翻译内容是否为空或 TODO
3. 验证插值变量一致性
4. 检测重复 key
5. 检查代码中引用的 key 是否存在

#### 输入:
- `src/locales/**/*.ts` (翻译文件)
- 源代码文件 (检查 `t()` 调用)

#### 输出:
- `check-report.json` (检查报告)
- 终端彩色输出
- CI 退出码 (有错误则非 0)

#### 检查逻辑:

```typescript
class I18nChecker {
  async check(): Promise<CheckResult> {
    const issues: Issue[] = [];
    
    // 检查1: Key 完整性
    issues.push(...await this.checkKeyCompleteness());
    
    // 检查2: 翻译内容
    issues.push(...await this.checkTranslationContent());
    
    // 检查3: 插值变量
    issues.push(...await this.checkInterpolationVars());
    
    // 检查4: 重复 key
    issues.push(...await this.checkDuplicateKeys());
    
    // 检查5: 代码引用
    issues.push(...await this.checkCodeReferences());
    
    return {
      issues,
      hasErrors: issues.some(i => i.severity === 'error'),
      hasWarnings: issues.some(i => i.severity === 'warning'),
    };
  }
  
  private async checkKeyCompleteness(): Promise<Issue[]> {
    const issues: Issue[] = [];
    const allKeys = new Set<string>();
    const languages = this.config.targetLangList;
    
    // 收集所有 key
    for (const file of this.translationFiles) {
      for (const key of Object.keys(file.content)) {
        allKeys.add(key);
      }
    }
    
    // 检查每个 key 在所有语言中是否存在
    for (const key of allKeys) {
      for (const lang of languages) {
        const translation = this.getTranslation(key, lang);
        if (!translation) {
          issues.push({
            type: 'MISSING_KEY',
            severity: 'error',
            key,
            language: lang,
            message: `Key "${key}" 缺失 ${lang} 翻译`,
          });
        }
      }
    }
    
    return issues;
  }
  
  private async checkInterpolationVars(): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    for (const file of this.translationFiles) {
      for (const [key, translations] of Object.entries(file.content)) {
        // 提取所有语言的插值变量
        const varsMap: Record<string, string[]> = {};
        for (const [lang, text] of Object.entries(translations)) {
          varsMap[lang] = this.extractInterpolationVars(text);
        }
        
        // 检查变量是否一致
        const refLang = this.config.originLang;
        const refVars = varsMap[refLang] || [];
        
        for (const [lang, vars] of Object.entries(varsMap)) {
          if (lang === refLang) continue;
          
          const missing = refVars.filter(v => !vars.includes(v));
          const extra = vars.filter(v => !refVars.includes(v));
          
          if (missing.length > 0 || extra.length > 0) {
            issues.push({
              type: 'INTERPOLATION_MISMATCH',
              severity: 'error',
              key,
              language: lang,
              message: `插值变量不一致`,
              details: { missing, extra, expected: refVars },
            });
          }
        }
      }
    }
    
    return issues;
  }
  
  private async checkCodeReferences(): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // 1. 收集所有有效的 key
    const validKeys = new Set<string>();
    for (const file of this.translationFiles) {
      const module = this.getModuleName(file.path);
      for (const key of Object.keys(file.content)) {
        validKeys.add(`${module}.${key}`);
      }
    }
    
    // 2. 扫描代码中的 t() 调用
    const codeFiles = await this.scanCodeFiles();
    for (const file of codeFiles) {
      const usedKeys = this.extractUsedKeys(file);
      
      for (const usedKey of usedKeys) {
        if (!validKeys.has(usedKey.key)) {
          issues.push({
            type: 'INVALID_REFERENCE',
            severity: 'error',
            key: usedKey.key,
            file: file.path,
            line: usedKey.line,
            message: `引用的 key "${usedKey.key}" 不存在`,
          });
        }
      }
    }
    
    return issues;
  }
}
```

#### 命令行接口:

```bash
# 运行所有检查
npm run i18n:check

# 只检查特定类型
npm run i18n:check -- --checks=completeness,interpolation

# 以 JSON 格式输出
npm run i18n:check -- --format=json > check-result.json

# CI 模式 (有错误时退出码非 0)
npm run i18n:check -- --ci
```

#### 输出示例:

```
┌─────────────────────────────────────────────────────────┐
│ i18n Check Report                                        │
├─────────────────────────────────────────────────────────┤
│ ✅ 通过: 156 项                                         │
│ ❌ 错误: 3 项                                           │
│ ⚠️  警告: 12 项                                         │
└─────────────────────────────────────────────────────────┘

❌ 错误 (3):

  1. [MISSING_KEY] drama.list.title 缺失 en-US 翻译
     📄 src/locales/drama/list.ts
     
  2. [INTERPOLATION_MISMATCH] user.login.welcome 插值变量不一致
     📄 src/locales/user/login.ts
     预期变量: [username]
     实际变量: [userName]  (en-US)
     
  3. [INVALID_REFERENCE] 引用的 key "drama.player.controls" 不存在
     📄 src/pages/drama/player.tsx:45

⚠️  警告 (12):

  1. [EMPTY_TRANSLATION] common.buttons.submit 翻译为空 (ja-JP)
  2. [TODO_TRANSLATION] drama.detail.intro 翻译为 TODO (ko-KR)
  ...
```

---

### 2.6 i18n-build (构建工具)

#### 核心职责:
1. 扫描 `src/locales/` 下所有翻译文件
2. 按模块路径生成完整 key
3. 按语言重新组织数据
4. 输出按语言分组的 JSON 文件

#### 输入:
- `src/locales/**/*.ts` (模块化翻译文件)

#### 输出:
- `dist/locales/zh-CN.json`
- `dist/locales/en-US.json`
- `dist/locales/ja-JP.json`
- ...

#### 构建逻辑:

```typescript
class I18nBuilder {
  async build() {
    // 1. 扫描所有翻译文件
    const files = glob.sync('src/locales/**/*.ts');
    
    // 2. 提取翻译内容
    const translations = await this.extractTranslations(files);
    
    // 3. 按语言重组
    const byLang = this.groupByLanguage(translations);
    
    // 4. 扁平化 (可选)
    const flattened = this.config.build.outputFormat === 'flat'
      ? this.flatten(byLang)
      : byLang;
    
    // 5. 输出文件
    for (const [lang, content] of Object.entries(flattened)) {
      await this.writeJSON(
        `${this.config.build.outputDir}/${lang}.json`,
        content
      );
    }
  }
  
  private async extractTranslations(
    files: string[]
  ): Promise<Translation[]> {
    const translations: Translation[] = [];
    
    for (const filePath of files) {
      // 推断模块名: src/locales/drama/list.ts → drama.list
      const module = this.inferModuleName(filePath);
      
      // 动态导入 TypeScript 文件
      const content = await import(filePath);
      const defaultExport = content.default;
      
      // 遍历文件中的所有 key
      for (const [key, langMap] of Object.entries(defaultExport)) {
        translations.push({
          fullKey: `${module}.${key}`,
          translations: langMap as Record<string, string>,
        });
      }
    }
    
    return translations;
  }
  
  private groupByLanguage(
    translations: Translation[]
  ): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    
    for (const item of translations) {
      for (const [lang, text] of Object.entries(item.translations)) {
        result[lang] = result[lang] || {};
        result[lang][item.fullKey] = text;
      }
    }
    
    return result;
  }
  
  private flatten(
    nested: Record<string, any>
  ): Record<string, string> {
    // 将嵌套对象转为扁平化
    // { drama: { list: { title: "xxx" } } }
    // → { "drama.list.title": "xxx" }
    const result: Record<string, string> = {};
    
    function recurse(obj: any, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object') {
          recurse(value, fullKey);
        } else {
          result[fullKey] = value;
        }
      }
    }
    
    recurse(nested);
    return result;
  }
}
```

#### 命令行接口:

```bash
# 构建所有语言
npm run i18n:build

# 只构建特定语言
npm run i18n:build -- --lang=en-US,ja-JP

# 输出格式: 嵌套
npm run i18n:build -- --format=nested

# 输出格式: 扁平
npm run i18n:build -- --format=flat

# 输出到指定目录
npm run i18n:build -- --output=./public/locales/
```

#### 输出示例:

**扁平化格式** (`zh-CN.json`):
```json
{
  "common.buttons.btn_submit": "提交",
  "common.buttons.btn_cancel": "取消",
  "drama.list.title": "剧集列表",
  "drama.detail.btn_play": "播放"
}
```

**嵌套格式** (`zh-CN.json`):
```json
{
  "common": {
    "buttons": {
      "btn_submit": "提交",
      "btn_cancel": "取消"
    }
  },
  "drama": {
    "list": {
      "title": "剧集列表"
    },
    "detail": {
      "btn_play": "播放"
    }
  }
}
```

---

## 三、工具集成与工作流

### 3.1 完整工作流

```bash
# 步骤 1: 提取
npm run i18n:extract
# 输出: extract-manifest.json, pending-translations.json, review-report.md

# 步骤 2: 审核 (可选)
npm run i18n:review
# 输出: reviewed-manifest.json

# 步骤 3: 应用替换
npm run i18n:apply
# 输出: 更新后的源代码, apply-diff.patch

# 步骤 4: 导入翻译
# (人工翻译或 API 翻译)
npm run i18n:import -- --file=./translations.json

# 步骤 5: 同步
npm run i18n:sync
# 输出: sync-report.json

# 步骤 6: 检查
npm run i18n:check
# 输出: check-report.json

# 步骤 7: 构建
npm run i18n:build
# 输出: dist/locales/*.json
```

### 3.2 日常开发流程

```bash
# 开发新功能
# 1. 手动在 src/locales/ 添加 key
# 2. 在代码中使用 t('module.key')

# 提交前检查
npm run i18n:check

# 定期同步
npm run i18n:sync

# 构建
npm run i18n:build
```

### 3.3 CI/CD 集成

```yaml
# .github/workflows/i18n-check.yml
name: i18n Check

on: [push, pull_request]

jobs:
  i18n-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Run i18n check
        run: npm run i18n:check -- --ci
      
      - name: Upload check report
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: i18n-check-report
          path: check-report.json
```

---

## 四、技术选型与实现建议

### 4.1 推荐技术栈

| 模块 | 推荐工具 | 用途 |
|-----|---------|------|
| AST 解析 | @babel/parser, @babel/traverse | 代码解析和遍历 |
| 文件操作 | fs-extra, glob | 文件读写和匹配 |
| CLI 工具 | commander, inquirer, chalk, ora | 命令行交互 |
| 配置管理 | cosmiconfig | 配置文件加载 |
| 中文处理 | pinyin | 中文转拼音 |
| Hash 生成 | crypto (Node.js 内置) | 生成唯一标识 |
| Diff 生成 | diff | 生成代码差异 |
| 类型支持 | TypeScript | 类型安全 |

### 4.2 项目结构

```
packages/
├── i18n-extract/
│   ├── src/
│   │   ├── scanner/         # 扫描器
│   │   ├── analyzer/        # 分析器
│   │   ├── generator/       # Key 生成器
│   │   ├── marker/          # 标记解析器
│   │   └── index.ts
│   └── package.json
│
├── i18n-apply/
│   ├── src/
│   │   ├── replacer/        # 替换逻辑
│   │   ├── backup/          # 备份管理
│   │   └── index.ts
│   └── package.json
│
├── i18n-sync/
├── i18n-check/
├── i18n-build/
│
└── i18n-cli/               # 统一 CLI 入口
    ├── src/
    │   └── index.ts
    └── package.json
```

### 4.3 代码复用

共享核心模块:
```
packages/
└── i18n-core/              # 共享核心
    ├── src/
    │   ├── config/         # 配置加载
    │   ├── utils/          # 工具函数
    │   ├── types/          # 类型定义
    │   └── constants/      # 常量
    └── package.json
```

---

## 五、开发建议

### 5.1 渐进式开发

**阶段 1** (2 周): i18n-extract
- 基础扫描功能
- 简单的 key 生成
- 输出 JSON 清单

**阶段 2** (1 周): i18n-apply
- 基础替换功能
- 支持备份和撤销

**阶段 3** (1 周): i18n-build
- 构建时合并
- 输出按语言分组

**阶段 4** (1 周): i18n-check + i18n-sync
- 一致性检查
- 自动同步

**阶段 5** (1 周): 增强和优化
- 交互式审核 (i18n-review)
- 复杂场景支持
- 性能优化

### 5.2 参考和借鉴

不要从零开始,参考现有工具:

1. **i18next-scanner**
   - GitHub: https://github.com/i18next/i18next-scanner
   - 借鉴: 扫描逻辑、配置结构

2. **kiwi (阿里)**
   - GitHub: https://github.com/alibaba/kiwi
   - 借鉴: Key 生成策略、VSCode 插件

3. **react-intl-universal**
   - 借鉴: 运行时 API 设计

4. **formatjs**
   - 借鉴: 插值和复数处理

### 5.3 优先级建议

**高优先级:**
- ✅ i18n-extract (核心,最重要)
- ✅ i18n-apply (代码替换)
- ✅ i18n-build (构建合并)

**中优先级:**
- ⚠️ i18n-check (质量保证)
- ⚠️ i18n-sync (维护便利)

**低优先级:**
- 💡 i18n-review (交互式审核,可后续优化)
- 💡 VSCode 插件 (提升体验,可 v2.0)

---

## 六、总结

这套工具链的核心理念是:

1. **自动化优先**: 能自动处理的场景,尽量自动化
2. **人工审核补充**: 复杂场景,提供审核机制
3. **灵活可配置**: 支持多种策略和自定义
4. **质量保证**: 多重检查,确保一致性
5. **渐进式实施**: 不要求一次完成所有功能

下一步:
1. 基于 `ast-scene-analysis.md` 完善 AST 识别能力
2. 实现 `i18n-extract` 核心功能
3. 开发 CLI 工具
4. 编写测试用例
5. 撰写使用文档

