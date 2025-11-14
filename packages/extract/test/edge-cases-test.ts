import { extract } from '../src/index';
import { join } from 'path';

async function test() {
  console.log('🧪 测试边界场景...\n');

  const result = await extract({
    include: join(__dirname, './fixtures/EdgeCases.vue'),
    namespace: 'test',
  });

  console.log(`📊 提取统计: 共 ${result.stats.total} 条文本\n`);

  // 按场景分组显示
  const scenes = [
    { name: '场景1: 分散的文本节点', lines: [6, 7, 8] },
    { name: '场景2: 分散的纯文本节点', lines: [12, 13] },
    { name: '场景3: 混合文本', lines: [17] },
    { name: '场景4: 嵌套结构', lines: [22, 23] },
    { name: '场景5: 表格单元格', lines: [28, 29, 32, 33] },
    { name: '场景6: 列表项', lines: [39, 40, 41] },
    { name: '场景7: 带标点的分散文本', lines: [46, 47, 48] },
    { name: '场景8: 完整的句子', lines: [52] },
    { name: '场景9: 按钮文本', lines: [55] },
    { name: '场景10: 带 HTML 的长文本', lines: [58, 59, 60] },
  ];

  scenes.forEach((scene) => {
    console.log(`\n${scene.name}:`);
    const sceneTexts = result.texts.filter((t) =>
      scene.lines.includes(t.location.line)
    );
    
    if (sceneTexts.length === 0) {
      console.log('  ❌ 未提取到文本');
    } else {
      sceneTexts.forEach((t) => {
        console.log(`  ✅ [${t.type}] "${t.text}" (行${t.location.line})`);
      });
    }
  });

  console.log('\n\n📋 完整的提取列表:');
  result.texts.forEach((t, index) => {
    console.log(`${index + 1}. [行${t.location.line}] [${t.type}] "${t.text}"`);
  });
}

test().catch(console.error);

