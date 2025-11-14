import { extract } from '../src/index';
import { join } from 'path';

async function test() {
  console.log('🧪 测试 Script 解析...\n');

  const result = await extract({
    include: join(__dirname, './fixtures/ScriptTest.vue'),
    namespace: 'test',
  });

  console.log(`📊 提取统计: 共 ${result.stats.total} 条文本\n`);

  // 按类型分组
  const byType = result.texts.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, typeof result.texts>);

  console.log('📋 按类型统计:');
  Object.entries(byType).forEach(([type, items]) => {
    console.log(`\n${type} (${items.length} 条):`);
    items.forEach((item) => {
      console.log(`  ✅ "${item.text}"`);
      console.log(`     key: ${item.key}`);
      if (item.params && item.params.length > 0) {
        console.log(`     参数: ${item.params.map(p => p.name).join(', ')}`);
      }
      if (item.context.scope) {
        console.log(`     作用域: ${item.context.scope}`);
      }
      if (item.replacement?.script) {
        console.log(`     替换: ${item.replacement.script}`);
      }
      console.log('');
    });
  });
}

test().catch(console.error);

