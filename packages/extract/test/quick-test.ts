import { extract } from '../src/index';
import { join } from 'path';

async function test() {
  console.log('🚀 开始测试...\n');

  const result = await extract({
    include: join(__dirname, './fixtures/Test.vue'),
    namespace: 'test',
  });

  console.log('✅ 提取结果:');
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n📊 统计: 共 ${result.stats.total} 条文本，来自 ${result.stats.files} 个文件`);
}

test().catch(console.error);

