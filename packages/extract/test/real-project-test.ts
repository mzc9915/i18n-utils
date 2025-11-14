import { extract } from '../src/index';

async function test() {
  console.log('🚀 测试真实项目提取...\n');

  const result = await extract({
    include: '/Users/mzc/Desktop/project/nexus_fe/src/views/drama/**/*.vue',
    namespace: 'drama',
  });

  console.log('✅ 提取结果:');
  console.log(`   命名空间: ${result.namespace}`);
  console.log(`   文件数量: ${result.stats.files}`);
  console.log(`   文本数量: ${result.stats.total}`);
  console.log('');
  
  console.log('📋 扫描的文件:');
  // 由于还没实现提取逻辑，这里先显示基本信息
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);

