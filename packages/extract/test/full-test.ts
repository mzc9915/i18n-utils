import { extract, outputToJson, generateLocaleFiles, generateReport, deduplicate, printDedupReport } from '../src/index';
import { join } from 'path';

async function test() {
  console.log('🚀 完整功能测试...\n');

  // 1. 提取文本
  console.log('📝 Step 1: 提取文本...');
  const result = await extract({
    include: '/Users/mzc/Desktop/project/nexus_fe/src/views/drama/**/*.vue',
    namespace: 'drama',
  });

  console.log(`✅ 提取完成: ${result.stats.total} 条文本，来自 ${result.stats.files} 个文件\n`);

  // 2. 去重统计
  console.log('📝 Step 2: 去重统计...');
  // 注意：extract 内部已经做了去重，这里只是演示 API
  const allTextsResult = await extract({
    include: join(__dirname, './fixtures/Test.vue'),
    namespace: 'test',
  });
  
  console.log(`原始文本数量: ${allTextsResult.stats.total}`);
  
  // 3. 生成报告
  console.log('\n📝 Step 3: 生成统计报告...');
  const report = generateReport(result);
  console.log(report);

  // 4. 输出 JSON
  console.log('\n📝 Step 4: 输出 JSON 文件...');
  const outputDir = join(__dirname, '../output');
  outputToJson(result, join(outputDir, 'drama-extracted.json'));

  // 5. 生成翻译文件
  console.log('\n📝 Step 5: 生成翻译文件模板...');
  const localesDir = join(outputDir, 'locales');
  generateLocaleFiles(result, localesDir, ['zh-CN', 'en-US', 'ja-JP']);

  // 6. 显示示例文本
  console.log('\n📝 Step 6: 文本示例 (前 5 条):');
  result.texts.slice(0, 5).forEach((item, index) => {
    console.log(`\n${index + 1}. [${item.type}] "${item.text}"`);
    console.log(`   key: ${item.key}`);
    if (item.params && item.params.length > 0) {
      console.log(`   参数: ${item.params.map(p => `${p.name}=${p.expression}`).join(', ')}`);
    }
    if (item.replacement.script) {
      console.log(`   替换: ${item.replacement.script}`);
    } else if (item.replacement.template) {
      console.log(`   替换: ${item.replacement.template}`);
    }
  });

  console.log('\n\n✅ 全部测试完成！');
  console.log(`\n📁 输出文件位置: ${outputDir}`);
}

test().catch(console.error);

