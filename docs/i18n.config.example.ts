/**
 * i18n 工具链配置文件示例
 * 
 * 使用说明:
 * 1. 复制此文件为 i18n.config.ts
 * 2. 根据项目需求调整配置
 * 3. 运行 i18n 命令时会自动加载此配置
 */

import type { I18nConfig } from '@i18n-toolchain/core';

const config: I18nConfig = {
  // ==================== 基础配置 ====================
  
  /**
   * 源语言 (用于自动提取和同步基准)
   */
  sourceLanguage: 'zh-CN',
  
  /**
   * 支持的目标语言
   */
  targetLanguages: ['en-US', 'ja-JP', 'ko-KR'],
  
  /**
   * 翻译文件目录
   */
  localesDir: './src/locales',
  
  /**
   * 构建输出目录
   */
  outputDir: './dist/locales',
  
  
  // ==================== 提取配置 (i18n-extract) ====================
  
  extract: {
    /**
     * 扫描目录 (支持 glob 模式)
     */
    include: [
      'src/**/*.{ts,tsx,js,jsx}',
      'src/**/*.vue',
    ],
    
    /**
     * 排除目录
     */
    exclude: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
    ],
    
    /**
     * Key 生成策略
     * - 'semantic': 语义化命名 (推荐)
     * - 'hash': Hash 命名
     * - 'hybrid': 混合模式 (简单场景语义化,复杂场景 hash)
     */
    keyStrategy: 'semantic',
    
    /**
     * 命名配置
     */
    naming: {
      /**
       * 类型前缀映射
       * 用于给不同类型的文本添加前缀
       */
      prefixMap: {
        button: 'btn_',
        error: 'err_',
        placeholder: 'ph_',
        message: 'msg_',
        tip: 'tip_',
        link: 'link_',
        confirm: 'confirm_',
        tab: 'tab_',
        filter: 'filter_',
        sort: 'sort_',
      },
      
      /**
       * 常用词映射
       * 用于将常见中文词汇映射为英文
       */
      wordMapping: {
        // 通用操作
        '提交': 'submit',
        '取消': 'cancel',
        '确认': 'confirm',
        '删除': 'delete',
        '保存': 'save',
        '编辑': 'edit',
        '返回': 'back',
        '刷新': 'refresh',
        '搜索': 'search',
        '查询': 'query',
        '重置': 'reset',
        '导出': 'export',
        '导入': 'import',
        '上传': 'upload',
        '下载': 'download',
        
        // 状态
        '成功': 'success',
        '失败': 'failed',
        '错误': 'error',
        '警告': 'warning',
        '加载中': 'loading',
        '已完成': 'completed',
        '进行中': 'inProgress',
        '待处理': 'pending',
        
        // 数据
        '列表': 'list',
        '详情': 'detail',
        '设置': 'settings',
        '配置': 'config',
        '信息': 'info',
        '数据': 'data',
        
        // 用户相关
        '登录': 'login',
        '注册': 'register',
        '退出': 'logout',
        '用户': 'user',
        '用户名': 'username',
        '密码': 'password',
        '邮箱': 'email',
        '手机': 'phone',
        
        // 时间
        '今天': 'today',
        '昨天': 'yesterday',
        '明天': 'tomorrow',
        '本周': 'thisWeek',
        '本月': 'thisMonth',
        '本年': 'thisYear',
        
        // 常用词
        '全部': 'all',
        '更多': 'more',
        '展开': 'expand',
        '收起': 'collapse',
        '暂无数据': 'noData',
        '操作': 'action',
      },
      
      /**
       * 最大嵌套深度
       * 控制生成的 key 的嵌套层级
       */
      maxDepth: 2,
      
      /**
       * 驼峰命名 or 下划线
       * - 'camelCase': userName
       * - 'snake_case': user_name
       * - 'kebab-case': user-name
       */
      caseStyle: 'camelCase',
    },
    
    /**
     * 复杂度配置
     */
    complexity: {
      /**
       * 需要人工审核的复杂度阈值 (0-10)
       * 超过此分数的项目会被分类为 "需要审核"
       */
      reviewThreshold: 5,
      
      /**
       * 长文本阈值 (字符数)
       * 超过此长度的文本复杂度 +2
       */
      longTextThreshold: 50,
      
      /**
       * 是否允许包含 HTML
       * 如果为 false,包含 HTML 的文本复杂度 +3
       */
      allowHtml: false,
      
      /**
       * 是否允许插值
       * 如果为 false,包含插值的文本复杂度 +1
       */
      allowInterpolation: true,
    },
    
    /**
     * 模块推断规则
     */
    moduleInference: {
      /**
       * 路径映射规则
       * 使用正则表达式从文件路径推断模块名
       */
      pathPatterns: [
        // src/pages/user/login.tsx → user.login
        { 
          pattern: /src\/pages\/([^/]+)\/([^/]+)\.(tsx?|jsx?)$/, 
          format: '$1.$2' 
        },
        // src/pages/user.tsx → user
        { 
          pattern: /src\/pages\/([^/]+)\.(tsx?|jsx?)$/, 
          format: '$1' 
        },
        // src/views/drama/list.vue → drama.list
        { 
          pattern: /src\/views\/([^/]+)\/([^/]+)\.vue$/, 
          format: '$1.$2' 
        },
        // src/components/common/Button.tsx → common
        { 
          pattern: /src\/components\/([^/]+)/, 
          format: '$1' 
        },
      ],
      
      /**
       * 作用域映射规则
       * 从组件名推断模块名
       */
      scopePatterns: [
        // UserLoginForm → user.login
        { 
          pattern: /^(\w+)LoginForm$/, 
          format: '$1.login' 
        },
        // DramaListPage → drama.list
        { 
          pattern: /^(\w+)ListPage$/, 
          format: '$1.list' 
        },
        // ProductDetailView → product.detail
        { 
          pattern: /^(\w+)DetailView$/, 
          format: '$1.detail' 
        },
      ],
      
      /**
       * 默认模块
       * 当无法推断模块时使用
       */
      defaultModule: 'common',
    },
    
    /**
     * 标记系统配置
     */
    markers: {
      /**
       * 是否启用标记系统
       */
      enabled: true,
      
      /**
       * 支持的标记类型
       */
      supportedMarkers: [
        '@i18n-ignore',      // 忽略此项
        '@i18n-manual',      // 手动处理
        '@i18n-key',         // 指定 key
        '@i18n-module',      // 指定模块
        '@i18n-type',        // 指定类型
      ],
    },
    
    /**
     * 输出配置
     */
    output: {
      /**
       * 提取清单路径
       */
      manifestPath: './i18n-extract/manifest.json',
      
      /**
       * 待翻译文件路径
       */
      pendingPath: './i18n-extract/pending-translations.json',
      
      /**
       * 审核报告路径
       */
      reportPath: './i18n-extract/review-report.md',
      
      /**
       * 自动处理项列表路径
       */
      autoItemsPath: './i18n-extract/auto-items.json',
      
      /**
       * 是否生成详细日志
       */
      verbose: true,
    },
  },
  
  
  // ==================== 应用配置 (i18n-apply) ====================
  
  apply: {
    /**
     * 替换模式
     * - 'safe': 只替换自动处理项
     * - 'all': 替换所有项 (包括审核后的)
     */
    mode: 'safe',
    
    /**
     * 是否备份原文件
     */
    backup: true,
    
    /**
     * 备份目录
     */
    backupPath: './i18n-backup/',
    
    /**
     * 是否生成 diff
     */
    generateDiff: true,
    
    /**
     * Diff 文件路径
     */
    diffPath: './i18n-extract/apply-diff.patch',
    
    /**
     * 翻译函数名
     * - React: t
     * - Vue: $t
     */
    translateFunction: 't',
    
    /**
     * 是否格式化代码
     */
    format: true,
    
    /**
     * 格式化配置 (Prettier)
     */
    formatOptions: {
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 100,
    },
  },
  
  
  // ==================== 同步配置 (i18n-sync) ====================
  
  sync: {
    /**
     * 同步模式
     * - 'check': 只检查不修复
     * - 'auto': 自动修复
     */
    mode: 'auto',
    
    /**
     * 是否自动填充缺失的翻译为 TODO
     */
    fillTodo: true,
    
    /**
     * 是否移除废弃的 key
     */
    removeUnused: false,
    
    /**
     * 是否移除多余的语言
     */
    removeExtraLanguages: false,
  },
  
  
  // ==================== 检查配置 (i18n-check) ====================
  
  check: {
    /**
     * 检查项
     */
    checks: [
      'completeness',      // Key 完整性
      'content',          // 翻译内容非空
      'interpolation',    // 插值变量一致性
      'duplicates',       // 重复 key
      'references',       // 代码引用有效性
    ],
    
    /**
     * 严格模式
     * 开启后,警告也会导致检查失败
     */
    strict: false,
    
    /**
     * 输出格式
     * - 'text': 终端彩色输出
     * - 'json': JSON 格式
     * - 'html': HTML 报告
     */
    outputFormat: 'text',
    
    /**
     * 报告路径
     */
    reportPath: './i18n-check-report.json',
  },
  
  
  // ==================== 构建配置 (i18n-build) ====================
  
  build: {
    /**
     * 是否在构建时合并
     */
    mergeOnBuild: true,
    
    /**
     * 输出格式
     * - 'flat': 扁平化 { "drama.list.title": "剧集列表" }
     * - 'nested': 嵌套 { drama: { list: { title: "剧集列表" } } }
     */
    outputFormat: 'flat',
    
    /**
     * 是否压缩 JSON
     */
    minify: false,
    
    /**
     * 是否生成类型定义
     */
    generateTypes: true,
    
    /**
     * 类型定义输出路径
     */
    typesPath: './src/locales/types.ts',
  },
  
  
  // ==================== 翻译配置 ====================
  
  translation: {
    /**
     * 翻译服务
     * - 'google': Google 翻译
     * - 'youdao': 有道翻译
     * - 'baidu': 百度翻译
     * - 'deepl': DeepL 翻译
     * - 'custom': 自定义翻译服务
     */
    service: 'youdao',
    
    /**
     * 翻译服务配置
     */
    serviceConfig: {
      // 有道翻译
      youdao: {
        appId: 'YOUR_APP_ID',
        appKey: 'YOUR_APP_KEY',
      },
      
      // Google 翻译
      google: {
        apiKey: 'YOUR_API_KEY',
        // 或使用代理
        proxy: {
          host: '127.0.0.1',
          port: 7890,
        },
      },
      
      // 百度翻译
      baidu: {
        appId: 'YOUR_APP_ID',
        appKey: 'YOUR_APP_KEY',
      },
    },
    
    /**
     * 自动翻译
     * 是否在提取后自动调用翻译服务
     */
    autoTranslate: false,
    
    /**
     * 翻译间隔 (毫秒)
     * 避免频繁调用 API 被限流
     */
    interval: 1000,
  },
  
  
  // ==================== 高级配置 ====================
  
  advanced: {
    /**
     * 缓存配置
     */
    cache: {
      /**
       * 是否启用缓存
       */
      enabled: true,
      
      /**
       * 缓存目录
       */
      cacheDir: './node_modules/.cache/i18n',
      
      /**
       * 缓存过期时间 (秒)
       */
      ttl: 3600,
    },
    
    /**
     * 并行处理
     */
    parallel: {
      /**
       * 是否启用并行处理
       */
      enabled: true,
      
      /**
       * 最大并发数
       */
      maxConcurrency: 4,
    },
    
    /**
     * 日志配置
     */
    logging: {
      /**
       * 日志级别
       * - 'silent': 静默
       * - 'error': 只显示错误
       * - 'warn': 显示警告和错误
       * - 'info': 显示信息、警告和错误
       * - 'debug': 显示所有日志
       */
      level: 'info',
      
      /**
       * 日志文件路径
       * 如果设置,日志会同时输出到文件
       */
      file: './i18n.log',
    },
  },
};

export default config;

