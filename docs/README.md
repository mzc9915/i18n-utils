# i18n 工具链设计文档

## 📚 文档导航

本目录包含 i18n 工具链的完整设计文档:

### 核心文档

1. **[i18n-solution-design.md](./i18n-solution-design.md)** - 国际化解决方案设计
   - 设计目标与原则
   - Key 命名规范
   - 文件组织结构
   - 完整的设计理念

2. **[ast-scene-analysis.md](./ast-scene-analysis.md)** - AST 场景识别能力分析 ⭐
   - AST 能够识别的场景
   - AST 难以处理的场景
   - 需要标记的特殊场景
   - i18n-extract 工具设计

3. **[toolchain-architecture.md](./toolchain-architecture.md)** - 工具链架构设计 ⭐
   - 整体架构设计
   - 6 大核心工具详细设计
   - 技术选型与实现建议
   - 工作流与集成方案

4. **[implementation-roadmap.md](./implementation-roadmap.md)** - 实施路线图 ⭐
   - 8 周开发计划
   - 分阶段实施方案
   - 优先级排序
   - 风险与应对

### 配置文件

5. **[i18n.config.example.ts](./i18n.config.example.ts)** - 配置文件示例
   - 完整的配置项说明
   - 最佳实践配置
   - 各工具的配置选项

### 原有文档

6. **[implementation-plan.md](./implementation-plan.md)** - 原实施方案
   - 基于现有插件的改进方案
   - 技术路线对比

7. **[config-example.ts](./config-example.ts)** - 原配置示例

---

## 🎯 快速开始

### 1. 了解设计理念

先阅读 **[i18n-solution-design.md](./i18n-solution-design.md)** 了解:
- 为什么要这样设计?
- Key 命名规范是什么?
- 文件如何组织?

**关键概念**:
- ✅ 语义化 Key: `common.buttons.btn_submit` vs `zccsau6`
- ✅ Key 聚合: 每个 key 下维护所有语言
- ✅ 模块化: 按业务模块划分文件

### 2. 理解技术边界

阅读 **[ast-scene-analysis.md](./ast-scene-analysis.md)** 了解:
- AST 能自动处理哪些场景? ✅
- 哪些场景需要人工审核? ⚠️
- 如何使用标记系统处理特殊场景? 🏷️

**关键点**:
```jsx
// ✅ 可以自动处理
<button>提交</button>
const title = "产品列表"

// ⚠️ 需要人工审核
const html = `<div><h1>标题</h1></div>`

// 🏷️ 使用标记
// @i18n-key: drama.detail.introduction
const intro = "这是一段很长的介绍..."
```

### 3. 掌握工具链

阅读 **[toolchain-architecture.md](./toolchain-architecture.md)** 了解:
- 有哪些工具?
- 每个工具的作用是什么?
- 如何配合使用?

**核心工具**:
```bash
i18n extract  # 提取代码中的文本
i18n apply    # 应用替换为 t() 调用
i18n build    # 构建语言包
i18n check    # 一致性检查
i18n sync     # 同步 key 结构
```

### 4. 制定实施计划

阅读 **[implementation-roadmap.md](./implementation-roadmap.md)** 了解:
- 如何分阶段实施?
- 优先级如何排序?
- 预计需要多长时间?

**开发计划**:
- Week 1-2: i18n-extract (核心)
- Week 3: i18n-apply (核心)
- Week 4: i18n-build (核心)
- Week 5: i18n-check + i18n-sync
- Week 6+: 优化和完善

---

## 🔥 核心亮点

### 1. AST 增强识别

**问题**: 现有插件只能识别文本,无法理解上下文

**解决方案**: 收集丰富的上下文信息

```typescript
interface ExtractedText {
  text: string;
  context: {
    parentTag: 'button',           // 父元素
    attributeName: 'placeholder',  // 属性名
    variableName: 'errorMsg',      // 变量名
    filePath: 'src/pages/user/login.tsx',  // 文件路径
    scopeChain: ['UserModule', 'LoginForm'], // 作用域链
  };
}
```

**效果**:
- `<button>提交</button>` → 推断为按钮文本 → `btn_submit`
- `<input placeholder="请输入" />` → 推断为占位符 → `ph_input`
- 文件路径 `src/pages/drama/list.tsx` → 推断模块 → `drama.list`

### 2. 智能 Key 生成

**问题**: 纯 hash key (`zccsau6`) 难以维护

**解决方案**: 多策略生成语义化 key

```typescript
// 策略 1: 常用词映射
"提交" → "btn_submit"
"取消" → "btn_cancel"

// 策略 2: 中文转拼音
"用户登录" → "user_login"

// 策略 3: 降级 hash (复杂场景)
"这是一段很长的文本..." → "text_a7f9e2c1"
```

**效果**:
- 60%+ 场景自动生成语义化 key
- 复杂场景提供人工审核
- 降级机制保证所有场景都能处理

### 3. 分类处理

**问题**: 不是所有场景都能自动处理

**解决方案**: 三级分类

```typescript
{
  auto: [       // 66%: 简单场景,自动处理
    { text: "提交", key: "btn_submit" }
  ],
  review: [     // 10%: 复杂场景,人工审核
    { text: "欢迎使用...", key: "text_a7f9e2c1", 
      reason: "长文本" }
  ],
  manual: [     // 5%: 已标记手动处理
    { text: "<div>...</div>", key: "drama.detail.intro",
      marker: "@i18n-manual" }
  ],
  ignored: [    // 19%: 已标记忽略
    { text: "SELECT * FROM", marker: "@i18n-ignore" }
  ]
}
```

**效果**:
- 自动处理率 60%+
- 人工审核有的放矢
- 提高整体效率

### 4. 标记系统

**问题**: 某些特殊场景 AST 无法准确识别

**解决方案**: 支持注释标记

```typescript
// @i18n-ignore
const sql = "SELECT * FROM 产品表"

// @i18n-manual
const complexHtml = `<div>...</div>`

// @i18n-key: drama.detail.introduction
const intro = "这是一段很长的介绍..."

// @i18n-module: user.login
// @i18n-type: error
const errorMsg = "登录失败"
```

**效果**:
- 开发者可以主动控制
- 处理边界场景
- 提高准确率

### 5. 完整工具链

**问题**: 只有提取功能,缺少后续工具

**解决方案**: 6 大工具覆盖全流程

```
提取 → 审核 → 应用 → 翻译 → 同步 → 检查 → 构建
  ↓       ↓      ↓       ↓       ↓       ↓       ↓
清单   调整key  替换代码  填充翻译  保持一致  质量保证  语言包
```

**效果**:
- 完整的工作流
- 自动化程度高
- 质量有保证

---

## 💡 使用场景

### 场景 1: 老项目国际化改造

**需求**: 
- 项目运行多年,代码中硬编码大量中文
- 需要支持多语言
- 人工改造成本太高

**方案**:
1. 运行 `i18n extract` 提取所有中文
2. 审核生成的 key 命名
3. 运行 `i18n apply` 自动替换代码
4. 提交给翻译团队
5. 导入翻译结果
6. 构建语言包

**效果**:
- 自动处理 60%+ 场景
- 节省人工成本 70%+
- 1-2 周完成改造

### 场景 2: 新项目国际化

**需求**:
- 新项目从头建立国际化体系
- 需要规范的 key 命名
- 需要可维护的翻译文件

**方案**:
1. 制定 key 命名规范
2. 开发时直接在 `src/locales/` 添加翻译
3. 代码中使用 `t('module.key')`
4. 定期运行 `i18n check` 检查一致性
5. 运行 `i18n build` 构建语言包

**效果**:
- 从头规范
- 易于维护
- 质量有保证

### 场景 3: 翻译文件重构

**需求**:
- 现有翻译文件是 hash key
- 难以维护
- 需要重构为语义化 key

**方案**:
1. 运行 `i18n extract` 重新提取
2. 使用语义化命名策略
3. 生成新的翻译文件
4. 运行 `i18n apply` 更新代码引用
5. 对比新旧翻译,确保完整性

**效果**:
- 从 hash key 升级为语义化 key
- 提升可维护性

---

## 📊 预期效果

### 效率提升

| 指标 | 人工处理 | 使用工具 | 提升 |
|-----|---------|---------|------|
| 提取时间 | 2-3 周 | 1 小时 | **90%** ↑ |
| 替换时间 | 3-4 周 | 1 天 | **95%** ↑ |
| 出错率 | 10%+ | <2% | **80%** ↓ |
| 维护成本 | 高 | 低 | **70%** ↓ |

### 质量保证

- ✅ 自动检查 key 完整性
- ✅ 自动检查翻译内容
- ✅ 自动检查插值变量
- ✅ 自动检查代码引用

### 团队协作

- ✅ 清晰的 key 命名,易于理解
- ✅ 模块化管理,易于分工
- ✅ 完整的文档,易于交接
- ✅ 工具化支持,降低门槛

---

## 🛠️ 技术架构

### 技术栈

| 类别 | 技术选型 |
|-----|---------|
| AST 解析 | @babel/parser, @babel/traverse |
| 文件操作 | fs-extra, glob |
| CLI 工具 | commander, inquirer, chalk, ora |
| 配置管理 | cosmiconfig |
| 中文处理 | pinyin |
| 类型支持 | TypeScript |

### 项目结构

```
packages/
├── i18n-core/          # 共享核心 (配置、工具、类型)
├── i18n-extract/       # 提取工具 ⭐
├── i18n-apply/         # 替换工具 ⭐
├── i18n-build/         # 构建工具 ⭐
├── i18n-check/         # 检查工具
├── i18n-sync/          # 同步工具
├── i18n-review/        # 审核工具 (后期)
└── i18n-cli/           # 统一 CLI
```

### 开源参考

不要从零开始,参考现有工具:

- **i18next-scanner**: 扫描逻辑、配置结构
- **kiwi** (阿里): Key 生成策略、VSCode 插件
- **formatjs**: 插值和复数处理

---

## 📅 开发计划

### Phase 1: MVP (4 周)

**核心功能**:
- ✅ i18n-extract (提取 + Key 生成)
- ✅ i18n-apply (代码替换)
- ✅ i18n-build (构建合并)

**目标**:
- 自动处理率 >60%
- 基础功能可用
- 发布 v1.0.0-alpha

### Phase 2: 完善 (2 周)

**新增功能**:
- ✅ i18n-check (一致性检查)
- ✅ i18n-sync (同步 key)
- ✅ 测试和文档

**目标**:
- 测试覆盖率 >80%
- 完整文档
- 发布 v1.0.0-beta

### Phase 3: 增强 (2 周)

**新增功能**:
- ✅ i18n-review (交互式审核)
- ✅ 性能优化
- ✅ 边界场景处理

**目标**:
- 生产环境可用
- 发布 v1.0.0

### Phase 4: 扩展 (未来)

**计划功能**:
- 💡 VSCode 插件
- 💡 在线管理平台
- 💡 AI 增强

---

## 🚀 下一步行动

### 立即开始

1. **阅读文档**
   - [ ] 阅读 i18n-solution-design.md
   - [ ] 阅读 ast-scene-analysis.md
   - [ ] 阅读 toolchain-architecture.md
   - [ ] 阅读 implementation-roadmap.md

2. **搭建环境**
   - [ ] 创建 monorepo 项目
   - [ ] 配置 TypeScript
   - [ ] 配置 Rollup
   - [ ] 搭建测试环境

3. **开始开发**
   - [ ] 实现 i18n-extract Scanner
   - [ ] 实现 ContextAnalyzer
   - [ ] 实现 KeyGenerator
   - [ ] 编写测试用例

### 本周目标

- [ ] 完成项目搭建
- [ ] 完成 Scanner 实现
- [ ] 完成 ContextAnalyzer 实现

### 本月目标

- [ ] 完成 i18n-extract
- [ ] 完成 i18n-apply
- [ ] 完成 i18n-build
- [ ] 发布 v1.0.0-alpha

---

## 📝 注意事项

### ⚠️ 技术边界

**AST 不是万能的**:
- 复杂模板字符串需要人工审核
- 动态拼接字符串需要重构
- 边界场景需要标记系统补充

### ⚠️ 不要重复造轮子

**借鉴现有工具**:
- 参考 i18next-scanner 的扫描逻辑
- 参考 kiwi 的 key 生成策略
- 集成现有的翻译服务

### ⚠️ 渐进式实施

**不要期望一次完美**:
- 先做 MVP,快速验证
- 持续迭代优化
- 根据反馈调整方案

---

## 🤝 贡献指南

### 如何贡献

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写单元测试
- 更新文档

---

## 📄 许可证

MIT License

---

## 👥 团队

**设计者**: 国际化工作组  
**维护者**: TBD  
**最后更新**: 2025-11-13

---

## 📞 联系我们

- GitHub Issues: [提交问题](https://github.com/your-repo/issues)
- Email: TBD
- 微信群: TBD

---

**让国际化变得简单! 🌍✨**
