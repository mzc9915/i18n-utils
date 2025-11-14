/**
 * 国际化配置示例
 * 基于新的语义化 Key + 模块化管理方案
 * 
 * 此配置文件展示了如何在现有 auto-i18n-translation-plugins 基础上
 * 扩展支持语义化命名和模块化管理
 */

import type { OptionInfo } from '../packages/autoI18nPluginCore/src/option';

/**
 * 扩展配置接口（未来版本）
 */
interface ExtendedI18nConfig extends OptionInfo {
  /**
   * Key 命名策略
   * - hash: 纯 Hash 模式（现有方式）
   * - semantic: 语义化模式（新方案）
   * - hybrid: 混合模式（推荐：语义化优先，降级为 hash）
   */
  keyNamingStrategy?: 'hash' | 'semantic' | 'hybrid';
  
  /**
   * Key 生成规则
   */
  keyGeneration?: {
    /**
     * 前缀映射
     */
    prefixMap?: {
      button?: string;      // 按钮前缀，如 'btn_'
      error?: string;       // 错误前缀，如 'err_'
      placeholder?: string; // 占位符前缀，如 'ph_'
      message?: string;     // 消息前缀，如 'msg_'
      tip?: string;         // 提示前缀，如 'tip_'
      link?: string;        // 链接前缀，如 'link_'
      confirm?: string;     // 确认对话框前缀，如 'confirm_'
    };
    
    /**
     * 常用词映射（中文 → 英文）
     */
    wordMapping?: Record<string, string>;
    
    /**
     * 最大嵌套深度（推荐 2）
     */
    maxDepth?: number;
    
    /**
     * 是否自动识别文本类型
     */
    autoDetectType?: boolean;
  };
  
  /**
   * 文件组织方式
   */
  fileOrganization?: {
    /**
     * 组织模式
     * - single: 单文件模式（所有翻译在一个文件）
     * - modular: 模块化模式（按业务模块分文件）
     */
    mode: 'single' | 'modular';
    
    /**
     * Key 聚合方式
     * - true: 每个 key 下包含所有语言（推荐）
     * - false: 按语言分文件
     */
    aggregation: boolean;
    
    /**
     * 模块结构定义
     */
    structure?: {
      /**
       * 公共文案分类
       */
      common?: string[];
      
      /**
       * 业务模块定义
       * key: 模块名称
       * value: 子模块列表
       */
      modules?: Record<string, string[]>;
    };
  };
  
  /**
   * 构建配置
   */
  build?: {
    /**
     * 是否在构建时合并模块化文件
     */
    mergeOnBuild?: boolean;
    
    /**
     * 输出格式
     * - flat: 扁平化（common.buttons.submit）
     * - nested: 嵌套对象
     */
    outputFormat?: 'flat' | 'nested';
    
    /**
     * 输出目录
     */
    outputDir?: string;
  };
}

// ============================================
// 配置示例 1：基础配置（混合模式）
// ============================================

export const basicConfig: ExtendedI18nConfig = {
  // ===== 现有配置保持不变 =====
  enabled: true,
  translateKey: '$t',
  originLang: 'zh-cn',
  targetLangList: ['en', 'ja', 'ko'],
  globalPath: './lang',
  namespace: 'lang',
  
  // ===== 新增配置 =====
  
  // 使用混合模式：语义化优先，降级为 hash
  keyNamingStrategy: 'hybrid',
  
  // Key 生成规则
  keyGeneration: {
    // 前缀映射
    prefixMap: {
      button: 'btn_',
      error: 'err_',
      placeholder: 'ph_',
      message: 'msg_',
      tip: 'tip_',
      link: 'link_',
      confirm: 'confirm_'
    },
    
    // 常用词映射
    wordMapping: {
      '提交': 'submit',
      '取消': 'cancel',
      '确认': 'confirm',
      '删除': 'delete',
      '保存': 'save',
      '编辑': 'edit',
      '返回': 'back',
      '下一步': 'next',
      '上一步': 'prev',
      '搜索': 'search',
      '刷新': 'refresh',
      '加载': 'loading'
    },
    
    // 最大嵌套深度
    maxDepth: 2,
    
    // 自动识别文本类型
    autoDetectType: true
  },
  
  // 文件组织：模块化 + Key 聚合
  fileOrganization: {
    mode: 'modular',
    aggregation: true,
    
    structure: {
      // 公共文案分类
      common: [
        'buttons',     // 通用按钮
        'actions',     // 通用操作
        'messages',    // 通用消息
        'errors',      // 通用错误
        'validation'   // 表单验证
      ],
      
      // 业务模块（根据实际项目调整）
      modules: {
        drama: ['list', 'detail', 'player', 'comment'],
        movie: ['list', 'detail', 'player', 'recommend'],
        user: ['login', 'profile', 'settings']
      }
    }
  },
  
  // 构建配置
  build: {
    mergeOnBuild: true,
    outputFormat: 'flat',
    outputDir: './dist/locales'
  }
};

// ============================================
// 配置示例 2：完全语义化模式（适合新项目）
// ============================================

export const semanticConfig: ExtendedI18nConfig = {
  enabled: true,
  translateKey: '$t',
  originLang: 'zh-cn',
  targetLangList: ['en', 'ja', 'ko'],
  globalPath: './src/locales',  // 放在 src 目录下
  namespace: 'i18n',
  
  // 完全语义化模式
  keyNamingStrategy: 'semantic',
  
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
    
    maxDepth: 2,
    autoDetectType: true
  },
  
  fileOrganization: {
    mode: 'modular',
    aggregation: true,
    
    structure: {
      common: ['buttons', 'actions', 'messages', 'errors', 'validation'],
      modules: {
        drama: ['list', 'detail', 'player'],
        movie: ['list', 'detail']
      }
    }
  },
  
  build: {
    mergeOnBuild: true,
    outputFormat: 'flat',
    outputDir: './dist/locales'
  }
};

// ============================================
// 配置示例 3：兼容模式（适合老项目迁移）
// ============================================

export const compatibilityConfig: ExtendedI18nConfig = {
  enabled: true,
  translateKey: '$t',
  originLang: 'zh-cn',
  targetLangList: ['en'],
  globalPath: './lang',
  namespace: 'lang',
  
  // 保持 Hash 模式，与现有项目兼容
  keyNamingStrategy: 'hash',
  
  // 单文件模式
  fileOrganization: {
    mode: 'single',
    aggregation: false  // 按语言分离
  }
};

// ============================================
// 使用示例
// ============================================

/**
 * Vite 项目配置
 */
// vite.config.ts
/*
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vitePluginsAutoI18n from 'vite-auto-i18n-plugin';
import { YoudaoTranslator } from 'vite-auto-i18n-plugin';
import { basicConfig } from './docs/config-example';

export default defineConfig({
  plugins: [
    vue(),
    vitePluginsAutoI18n({
      ...basicConfig,
      translator: new YoudaoTranslator({
        appId: 'your-app-id',
        appKey: 'your-app-key'
      })
    })
  ]
});
*/

/**
 * Webpack 项目配置
 */
// webpack.config.js
/*
const webpackPluginsAutoI18n = require('webpack-auto-i18n-plugin');
const { YoudaoTranslator } = require('webpack-auto-i18n-plugin');
const { basicConfig } = require('./docs/config-example');

module.exports = {
  plugins: [
    new webpackPluginsAutoI18n.default({
      ...basicConfig,
      translator: new YoudaoTranslator({
        appId: 'your-app-id',
        appKey: 'your-app-key'
      })
    })
  ]
};
*/

// ============================================
// 生成的文件结构示例
// ============================================

/**
 * 模块化模式 + Key 聚合
 * 
 * src/locales/
 *   ├── common/
 *   │   ├── buttons.ts
 *   │   ├── actions.ts
 *   │   └── messages.ts
 *   ├── drama/
 *   │   ├── list.ts
 *   │   └── detail.ts
 *   └── movie/
 *       ├── list.ts
 *       └── detail.ts
 */

// src/locales/common/buttons.ts
/*
export default {
  submit: {
    'zh-cn': '提交',
    'en': 'Submit',
    'ja': '送信',
    'ko': '제출'
  },
  cancel: {
    'zh-cn': '取消',
    'en': 'Cancel',
    'ja': 'キャンセル',
    'ko': '취소'
  }
};
*/

// src/locales/drama/list.ts
/*
export default {
  title: {
    'zh-cn': '剧集列表',
    'en': 'Drama List',
    'ja': 'ドラマリスト',
    'ko': '드라마 목록'
  },
  filter_all: {
    'zh-cn': '全部',
    'en': 'All',
    'ja': 'すべて',
    'ko': '전체'
  }
};
*/

// ============================================
// 构建后的输出（按语言分组）
// ============================================

// dist/locales/zh-cn.json
/*
{
  "common.buttons.submit": "提交",
  "common.buttons.cancel": "取消",
  "drama.list.title": "剧集列表",
  "drama.list.filter_all": "全部"
}
*/

// dist/locales/en.json
/*
{
  "common.buttons.submit": "Submit",
  "common.buttons.cancel": "Cancel",
  "drama.list.title": "Drama List",
  "drama.list.filter_all": "All"
}
*/

// ============================================
// 代码中的使用
// ============================================

// React 组件
/*
import { useTranslation } from 'react-i18next';

function DramaList() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('drama.list.title')}</h1>
      <button>{t('drama.list.filter_all')}</button>
      <button>{t('common.buttons.submit')}</button>
    </div>
  );
}
*/

// Vue 组件
/*
<template>
  <div>
    <h1>{{ $t('drama.list.title') }}</h1>
    <button>{{ $t('drama.list.filter_all') }}</button>
    <button>{{ $t('common.buttons.submit') }}</button>
  </div>
</template>
*/

// ============================================
// 迁移路径建议
// ============================================

/**
 * 从现有 Hash 模式迁移到语义化模式
 * 
 * 步骤 1：启用混合模式
 * - 设置 keyNamingStrategy: 'hybrid'
 * - 老代码保持 Hash，新代码用语义化
 * 
 * 步骤 2：生成映射表
 * - 使用工具分析现有 Hash key 的使用场景
 * - 生成 Hash → 语义化的映射关系
 * 
 * 步骤 3：渐进式替换
 * - 在重构时逐步替换 Hash key
 * - 保持兼容性，两种方式并存
 * 
 * 步骤 4：完全切换
 * - 所有 Hash key 替换完成后
 * - 切换到 keyNamingStrategy: 'semantic'
 */

export const migrationConfig: ExtendedI18nConfig = {
  enabled: true,
  translateKey: '$t',
  originLang: 'zh-cn',
  targetLangList: ['en'],
  globalPath: './lang',
  namespace: 'lang',
  
  // 第一阶段：混合模式
  keyNamingStrategy: 'hybrid',
  
  // 提供 Hash → 语义化映射
  // 这个功能需要在未来版本中实现
  // keyMapping: {
  //   'zccsau6': 'common.greetings.hello',
  //   'dure2': 'common.languages.chinese',
  //   // ...
  // },
  
  fileOrganization: {
    mode: 'modular',
    aggregation: true
  }
};

