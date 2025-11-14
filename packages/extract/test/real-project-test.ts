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
  
  // 显示前 10 条文本示例
  if (result.texts.length > 0) {
    console.log('📝 文本示例（前 10 条）:');
    result.texts.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. [${item.type}] "${item.text}"`);
      console.log(`   key: ${item.key}`);
      console.log(`   位置: ${item.location.file.replace('/Users/mzc/Desktop/project/nexus_fe/', '')}:${item.location.line}`);
      console.log('');
    });
  }
  
  // 统计信息
  const typeStats = result.texts.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('📊 类型统计:');
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
}

test().catch(console.error);

