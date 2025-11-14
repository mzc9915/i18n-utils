import { hasChinese, shouldExclude } from '../src/utils/chinese';
import { generateKey } from '../src/generator/key';

console.log('🧪 测试工具函数\n');

// 测试中文检测
console.log('1️⃣ 测试中文检测:');
console.log('  hasChinese("你好") =>', hasChinese('你好'));
console.log('  hasChinese("Hello") =>', hasChinese('Hello'));
console.log('  hasChinese("你好World") =>', hasChinese('你好World'));

// 测试排除规则
console.log('\n2️⃣ 测试排除规则:');
console.log('  shouldExclude("./path") =>', shouldExclude('./path'));
console.log('  shouldExclude("/api/users") =>', shouldExclude('/api/users'));
console.log('  shouldExclude("@click") =>', shouldExclude('@click'));
console.log('  shouldExclude(":title") =>', shouldExclude(':title'));
console.log('  shouldExclude("v-if") =>', shouldExclude('v-if'));
console.log('  shouldExclude("userName") =>', shouldExclude('userName'));
console.log('  shouldExclude("https://example.com") =>', shouldExclude('https://example.com'));
console.log('  shouldExclude("你好") =>', shouldExclude('你好'));

// 测试 Key 生成
console.log('\n3️⃣ 测试 Key 生成:');
console.log('  generateKey("你好，{userName}!", "user") =>', generateKey('你好，{userName}!', 'user'));
console.log('  generateKey("提交", "product") =>', generateKey('提交', 'product'));
console.log('  generateKey("欢迎使用", "common") =>', generateKey('欢迎使用', 'common'));

// 测试相同文本生成相同 key
console.log('\n4️⃣ 测试一致性:');
const key1 = generateKey('提交', 'product');
const key2 = generateKey('提交', 'product');
console.log('  相同文本生成相同 key:', key1 === key2, `(${key1})`);

// 测试不同命名空间
console.log('\n5️⃣ 测试不同命名空间:');
const keyProduct = generateKey('提交', 'product');
const keyUser = generateKey('提交', 'user');
console.log('  product:', keyProduct);
console.log('  user:', keyUser);
console.log('  命名空间不同，key 不同:', keyProduct !== keyUser);

console.log('\n✅ 测试完成!');

