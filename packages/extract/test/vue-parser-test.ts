import { parseVueFile } from '../src/parser/vue';
import { join } from 'path';

console.log('🧪 测试 Vue 文件解析\n');

const testFile = join(__dirname, './fixtures/Test.vue');

try {
  const result = parseVueFile(testFile);
  
  console.log('📄 文件:', result.filePath);
  console.log('🏷️  组件名:', result.componentName);
  console.log('');
  
  if (result.template) {
    console.log('📝 Template:');
    console.log('   起始行:', result.template.line);
    console.log('   内容长度:', result.template.content.length, '字符');
    console.log('   内容预览:', result.template.content.substring(0, 100) + '...');
    console.log('');
  }
  
  if (result.script) {
    console.log('💻 Script:');
    console.log('   起始行:', result.script.line);
    console.log('   setup模式:', result.script.isSetup);
    console.log('   内容长度:', result.script.content.length, '字符');
    console.log('   内容预览:', result.script.content.substring(0, 100) + '...');
    console.log('');
  }
  
  console.log('✅ 解析成功!');
} catch (error) {
  console.error('❌ 解析失败:', error);
}

