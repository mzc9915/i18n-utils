# 国际化(i18n)解决方案设计文档

## 一、背景与目标

### 1.1 项目背景
在运行多年的项目中落地国际化需求，需要：
- 提取现有代码中的中文字符串
- 生成多语言翻译文件
- 完成代码的国际化改造
- 建立长期可维护的国际化体系

### 1.2 设计目标
- ✅ **可维护性**：清晰的文件组织和命名规范
- ✅ **可读性**：语义化的 key 命名，避免纯 hash
- ✅ **易协作**：翻译人员能理解上下文
- ✅ **可扩展**：支持新增语言和模块
- ✅ **自动化**：工具辅助，降低人工成本

---

## 二、核心设计原则

### 2.1 文件组织原则

#### **统一目录管理**
所有国际化资源统一存放在 `src/locales/` 目录下，便于集中管理和维护。

#### **公共 + 模块化结合**
- **公共文案 (common/)**：通用按钮、操作、错误提示等
- **业务模块**：按业务线和功能模块划分（如 drama/、movie/、user/ 等）

```
src/locales/
  ├── common/          # 公共文案
  │   ├── buttons.ts
  │   ├── actions.ts
  │   ├── messages.ts
  │   └── errors.ts
  ├── drama/           # Drama 业务线
  │   ├── list.ts
  │   ├── detail.ts
  │   └── player.ts
  └── movie/           # Movie 业务线
      ├── list.ts
      └── detail.ts
```

### 2.2 Key 聚合原则

**每个 key 下维护所有语言**，而非按语言分文件夹：

```typescript
// ✅ 推荐：同 key 聚合
export default {
  submit: {
    'zh-CN': '提交',
    'en-US': 'Submit',
    'ja-JP': '送信'
  }
}

// ❌ 不推荐：按语言分离
// zh-CN/common.json: { "submit": "提交" }
// en-US/common.json: { "submit": "Submit" }
```

**优势：**
- 同一个 key 的所有翻译在一起，易于对比和维护
- 添加或修改 key 时，所有语言在同一文件，不会遗漏
- 减少文件间的同步成本

### 2.3 构建策略

**开发时分散，构建时合并**

- **开发阶段**：模块化文件，每个模块独立维护
- **构建阶段**：自动合并为按语言分组的 JSON 文件
- **运行时**：加载合并后的语言包

```
开发时：
src/locales/drama/list.ts (包含所有语言)

构建后：
dist/locales/zh-CN.json (drama.list.* 的中文)
dist/locales/en-US.json (drama.list.* 的英文)
```

---

## 三、Key 命名规范

### 3.1 命名格式

**基本格式：`[前缀_]语义化描述`**

采用小驼峰命名法（camelCase）或下划线分隔。

### 3.2 前缀约定（可选但推荐）

| 前缀 | 用途 | 示例 |
|-----|------|------|
| 无前缀 | 普通文本、标题、标签 | `title`, `username`, `description` |
| `btn_` | 按钮文本 | `btn_submit`, `btn_cancel` |
| `ph_` | 输入框占位符 | `ph_username`, `ph_searchKeyword` |
| `err_` | 错误提示 | `err_required`, `err_networkTimeout` |
| `msg_` | 操作提示消息 | `msg_success`, `msg_loginSuccess` |
| `tip_` | 帮助提示 | `tip_passwordRule` |
| `link_` | 链接文本 | `link_forgotPassword` |
| `confirm_` | 确认对话框 | `confirm_delete` |

### 3.3 嵌套层级控制

**扁平化优先，最多 2 层嵌套**

```typescript
// ✅ 推荐：扁平化
{
  title: { ... },
  username: { ... },
  btn_submit: { ... }
}

// ⚠️ 可接受：1 层嵌套（仅在必要时）
{
  title: { ... },
  field: {
    username: { ... },
    password: { ... }
  }
}

// ❌ 避免：嵌套过深
{
  page: {
    login: {
      form: {
        field: {
          username: { ... }
        }
      }
    }
  }
}
```

### 3.4 完整 Key 路径

使用时的完整路径格式：`模块.文件.key`

```typescript
// 文件：src/locales/drama/list.ts，key: title
// 完整路径：drama.list.title

t('drama.list.title')           // ✅ 清晰明了
t('common.buttons.submit')       // ✅ 公共按钮
```

### 3.5 降级策略：Hash 命名

当语义化命名困难时，可使用 hash 作为补充：

```typescript
{
  // 复杂的、一次性的长文本可以用 hash
  text_a8f3d2e1: {
    'zh-CN': '这是一段很长的、很难用简短语义描述的文本...',
    'en-US': 'This is a very long text...'
  }
}
```

**原则：优先语义化，实在不行再用 hash**

---

## 四、文件结构详细设计

### 4.1 公共文案（Common）

#### `common/buttons.ts` - 通用按钮

```typescript
export default {
  submit: { 'zh-CN': '提交', 'en-US': 'Submit', ... },
  cancel: { 'zh-CN': '取消', 'en-US': 'Cancel', ... },
  confirm: { 'zh-CN': '确认', 'en-US': 'Confirm', ... },
  delete: { 'zh-CN': '删除', 'en-US': 'Delete', ... },
  save: { 'zh-CN': '保存', 'en-US': 'Save', ... },
  edit: { 'zh-CN': '编辑', 'en-US': 'Edit', ... },
  back: { 'zh-CN': '返回', 'en-US': 'Back', ... }
}
```

#### `common/actions.ts` - 通用操作

```typescript
export default {
  loading: { 'zh-CN': '加载中...', 'en-US': 'Loading...', ... },
  loadMore: { 'zh-CN': '加载更多', 'en-US': 'Load More', ... },
  refresh: { 'zh-CN': '刷新', 'en-US': 'Refresh', ... },
  search: { 'zh-CN': '搜索', 'en-US': 'Search', ... }
}
```

#### `common/messages.ts` - 通用消息

```typescript
export default {
  success: { 'zh-CN': '操作成功', 'en-US': 'Success', ... },
  failed: { 'zh-CN': '操作失败', 'en-US': 'Failed', ... },
  noData: { 'zh-CN': '暂无数据', 'en-US': 'No Data', ... }
}
```

#### `common/errors.ts` - 通用错误

```typescript
export default {
  networkTimeout: { 'zh-CN': '网络超时', 'en-US': 'Network Timeout', ... },
  serverError: { 'zh-CN': '服务器错误', 'en-US': 'Server Error', ... },
  unauthorized: { 'zh-CN': '未授权', 'en-US': 'Unauthorized', ... }
}
```

#### `common/validation.ts` - 表单验证

```typescript
export default {
  required: { 'zh-CN': '不能为空', 'en-US': 'Required', ... },
  emailInvalid: { 'zh-CN': '邮箱格式不正确', 'en-US': 'Invalid email', ... },
  passwordWeak: { 'zh-CN': '密码强度太弱', 'en-US': 'Password too weak', ... }
}
```

### 4.2 业务模块（Drama 示例）

#### `drama/list.ts` - 剧集列表

```typescript
export default {
  title: { 'zh-CN': '剧集列表', 'en-US': 'Drama List', ... },
  
  // 筛选
  filter_all: { 'zh-CN': '全部', 'en-US': 'All', ... },
  filter_region: { 'zh-CN': '地区', 'en-US': 'Region', ... },
  filter_genre: { 'zh-CN': '类型', 'en-US': 'Genre', ... },
  
  // 排序
  sort_hot: { 'zh-CN': '最热', 'en-US': 'Hot', ... },
  sort_latest: { 'zh-CN': '最新', 'en-US': 'Latest', ... },
  
  // 空状态
  empty_title: { 'zh-CN': '暂无内容', 'en-US': 'No Content', ... },
  empty_desc: { 'zh-CN': '换个条件试试', 'en-US': 'Try different filters', ... }
}
```

#### `drama/detail.ts` - 剧集详情

```typescript
export default {
  title: { 'zh-CN': '剧集详情', 'en-US': 'Drama Detail', ... },
  
  // 信息标签
  info_director: { 'zh-CN': '导演', 'en-US': 'Director', ... },
  info_actors: { 'zh-CN': '主演', 'en-US': 'Cast', ... },
  info_genre: { 'zh-CN': '类型', 'en-US': 'Genre', ... },
  
  // 操作按钮
  btn_play: { 'zh-CN': '播放', 'en-US': 'Play', ... },
  btn_favorite: { 'zh-CN': '收藏', 'en-US': 'Favorite', ... },
  
  // Tab 标签
  tab_episodes: { 'zh-CN': '选集', 'en-US': 'Episodes', ... },
  tab_intro: { 'zh-CN': '简介', 'en-US': 'Introduction', ... },
  tab_comments: { 'zh-CN': '评论', 'en-US': 'Comments', ... }
}
```

### 4.3 汇总导出

#### `locales/index.ts`

```typescript
import commonButtons from './common/buttons';
import commonActions from './common/actions';
import dramaList from './drama/list';
import dramaDetail from './drama/detail';
// ... 导入所有模块

export default {
  common: {
    buttons: commonButtons,
    actions: commonActions,
    // ...
  },
  drama: {
    list: dramaList,
    detail: dramaDetail,
    // ...
  },
  movie: {
    // ...
  }
};
```

---

## 五、工具链设计

### 5.1 构建工具（i18n-builder）

**功能：**
- 扫描 `src/locales/` 下所有翻译文件
- 将分散的模块文件合并
- 生成按语言分组的 JSON 文件

**输入：** `src/locales/**/*.ts`  
**输出：** `dist/locales/{lang}.json`

**构建流程：**
```
1. 扫描所有 .ts 文件
2. 提取每个文件中的翻译对象
3. 按模块路径生成完整 key（如 drama.list.title）
4. 按语言重新组织数据结构
5. 输出每个语言的独立 JSON 文件
```

### 5.2 一致性检查工具（i18n-checker）

**功能：**
- 检查所有 key 是否在所有语言中都存在
- 检测缺失的翻译
- 检测多余的翻译
- 验证翻译格式（如插值变量）

**检查项：**
- ✅ Key 完整性检查
- ✅ 翻译内容非空检查
- ✅ 插值变量一致性（如 `{{username}}`）
- ✅ 重复 key 检测

### 5.3 自动提取工具（i18n-extractor）

**功能：**
- 扫描代码中的中文字符串
- 智能识别上下文（按钮、错误、占位符等）
- 自动生成语义化 key
- 生成待翻译清单

**提取策略：**
- 基于 AST 分析，识别 JSX/TSX 中的文本节点
- 根据父元素类型推断文本用途（button → `btn_`）
- 使用词库映射常用词（提交 → submit）
- 无法语义化时生成 hash key

### 5.4 类型生成工具（i18n-types-generator）

**功能：**
- 自动生成 TypeScript 类型定义
- 提供 IDE 自动补全支持
- 类型安全的翻译调用

**输出示例：**
```typescript
export type TranslationKeys = 
  | 'common.buttons.submit'
  | 'drama.list.title'
  | 'drama.detail.btn_play';
```

### 5.5 同步工具（i18n-sync）

**功能：**
- 以中文（源语言）为基准
- 同步其他语言的 key 结构
- 自动添加缺失的 key（标记为待翻译）
- 移除废弃的 key

---

## 六、开发工作流

### 6.1 初次国际化改造

```bash
1. 运行提取工具，扫描现有代码
   npm run i18n:extract

2. 人工审核生成的 key 命名
   - 调整不合理的命名
   - 合并重复的文案
   - 标记不需要翻译的内容

3. 组织翻译文件结构
   - 将提取的文案分配到对应模块
   - 公共文案放入 common/

4. 提交给翻译人员
   - 导出待翻译清单
   - 提供上下文和截图

5. 导入翻译结果
   - 填充各语言的翻译内容

6. 替换代码中的硬编码文本
   - 使用工具辅助替换
   - Code Review 确认

7. 构建和测试
   npm run i18n:build
   npm run test
```

### 6.2 日常开发流程

```bash
1. 开发新功能时
   - 直接在对应模块的翻译文件中添加 key
   - 使用语义化命名
   - 先填写中文，其他语言标记 TODO

2. 提交前检查
   npm run i18n:check
   - 自动检测缺失的翻译

3. 定期翻译更新
   - 导出新增的待翻译内容
   - 提交给翻译团队
   - 导入翻译结果

4. CI/CD 集成
   - 自动运行 i18n:validate
   - 检测到问题时阻止部署
```

### 6.3 版本管理

```bash
# 分支策略
main          - 生产环境，所有语言翻译完整
develop       - 开发环境，允许部分翻译缺失
feature/*     - 功能分支，可包含 TODO 翻译

# 发布前检查
npm run i18n:validate
- 确保所有语言翻译完整
- 确保 key 命名规范
```

---

## 七、代码使用示例

### 7.1 React 组件中使用

```typescript
import { useTranslation } from 'react-i18next';

function DramaListPage() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('drama.list.title')}</h1>
      <button>{t('drama.list.filter_all')}</button>
      <button>{t('common.buttons.submit')}</button>
    </div>
  );
}
```

### 7.2 带插值的翻译

```typescript
// 翻译文件
welcome: {
  'zh-CN': '欢迎，{{username}}！',
  'en-US': 'Welcome, {{username}}!',
}

// 使用
t('user.login.welcome', { username: 'Alice' })
```

### 7.3 复数形式处理

```typescript
// 翻译文件
itemCount: {
  'zh-CN': '{{count}} 个项目',
  'en-US': '{{count}} item',
  'en-US_plural': '{{count}} items',
}

// 使用
t('common.itemCount', { count: 5 })
```

---

## 八、最佳实践建议

### 8.1 命名建议

- ✅ **语义清晰**：看 key 就能理解含义
- ✅ **保持简洁**：避免过长的 key 名
- ✅ **统一风格**：团队内保持一致的命名习惯
- ✅ **复用优先**：先查 common/ 是否有可复用的

### 8.2 组织建议

- ✅ **模块化**：按业务模块划分文件
- ✅ **粒度适中**：单个文件 50-100 个 key 为宜
- ✅ **分组清晰**：相关的 key 放在一起
- ✅ **注释说明**：复杂场景添加注释

### 8.3 维护建议

- ✅ **定期清理**：删除未使用的 key
- ✅ **定期同步**：确保所有语言 key 一致
- ✅ **Code Review**：关注 i18n 的改动
- ✅ **文档更新**：及时更新命名规范

### 8.4 团队协作

- ✅ **规范文档**：制定团队 i18n 规范
- ✅ **培训指导**：新成员了解规范
- ✅ **工具支持**：VSCode 插件辅助开发
- ✅ **持续优化**：根据实践调整方案

---

## 九、技术栈选型

### 9.1 推荐技术栈

- **i18n 库**：react-i18next / vue-i18n
- **构建工具**：TypeScript + Node.js
- **AST 解析**：@babel/parser, @babel/traverse
- **文件操作**：fs-extra, glob
- **类型支持**：TypeScript

### 9.2 配置文件

```typescript
// i18n.config.ts
export default {
  // 源语言（用于自动提取和同步基准）
  sourceLanguage: 'zh-CN',
  
  // 支持的目标语言
  targetLanguages: ['en-US', 'ja-JP', 'ko-KR'],
  
  // 翻译文件目录
  localesDir: './src/locales',
  
  // 构建输出目录
  outputDir: './dist/locales',
  
  // Key 命名规则
  keyNaming: {
    maxDepth: 2,          // 最大嵌套层级
    usePrefixes: true,    // 是否使用前缀
  },
  
  // 提取规则
  extract: {
    include: ['src/**/*.{ts,tsx,js,jsx}'],
    exclude: ['**/*.test.*', '**/*.spec.*'],
  }
};
```

---

## 十、总结

### 10.1 方案优势

| 方面 | 优势 |
|-----|------|
| **可维护性** | 模块化组织，语义化命名，易于长期维护 |
| **可读性** | key 名称清晰，避免 hash 带来的困扰 |
| **协作性** | 翻译在一起，上下文明确，减少沟通成本 |
| **扩展性** | 支持新增语言和模块，结构灵活 |
| **工程化** | 完整工具链，自动化程度高 |

### 10.2 关键要点

1. **统一目录**：`src/locales/` 集中管理
2. **Key 聚合**：每个 key 下维护所有语言
3. **模块化**：公共 + 业务模块分离
4. **语义化**：优先可读的 key 命名
5. **工具化**：自动构建、检查、同步

### 10.3 后续迭代

- [ ] 开发 VSCode 插件，提升开发体验
- [ ] 集成翻译管理平台（如 Crowdin）
- [ ] 支持按需加载和代码分割
- [ ] 性能优化和缓存策略
- [ ] 完善监控和错误追踪

---

## 附录

### A. 文件结构完整示例

```
project-root/
├── src/
│   ├── locales/
│   │   ├── common/
│   │   │   ├── buttons.ts
│   │   │   ├── actions.ts
│   │   │   ├── messages.ts
│   │   │   ├── errors.ts
│   │   │   └── validation.ts
│   │   ├── drama/
│   │   │   ├── list.ts
│   │   │   ├── detail.ts
│   │   │   ├── player.ts
│   │   │   └── comment.ts
│   │   ├── movie/
│   │   │   ├── list.ts
│   │   │   ├── detail.ts
│   │   │   └── recommend.ts
│   │   ├── user/
│   │   │   ├── login.ts
│   │   │   ├── profile.ts
│   │   │   └── settings.ts
│   │   ├── index.ts
│   │   └── types.ts
│   └── pages/
│       └── ...
├── scripts/
│   ├── i18n-builder.ts
│   ├── i18n-checker.ts
│   ├── i18n-extractor.ts
│   ├── i18n-types-generator.ts
│   └── i18n-sync.ts
├── i18n.config.ts
└── package.json
```

### B. 命名规范速查表

| 类型 | 前缀 | 示例 |
|-----|------|------|
| 标题 | 无 | `title`, `pageTitle` |
| 按钮 | `btn_` | `btn_submit`, `btn_cancel` |
| 字段标签 | 无 | `username`, `email` |
| 占位符 | `ph_` | `ph_username`, `ph_search` |
| 错误提示 | `err_` | `err_required`, `err_invalid` |
| 成功消息 | `msg_` | `msg_success`, `msg_saved` |
| 帮助提示 | `tip_` | `tip_passwordRule` |
| 链接文本 | `link_` | `link_forgot`, `link_register` |
| 确认对话框 | `confirm_` | `confirm_delete` |
| Tab 标签 | `tab_` | `tab_info`, `tab_comments` |
| 筛选项 | `filter_` | `filter_all`, `filter_region` |
| 排序项 | `sort_` | `sort_hot`, `sort_latest` |



