<template>
  <div>{{ message }}</div>
</template>

<script>
export default {
  name: 'ScriptTest',
  
  data() {
    return {
      // 简单字符串
      title: '产品列表',
      message: '欢迎使用',
      
      // 数组
      tabs: ['首页', '产品', '关于我们'],
      
      // 对象
      user: {
        name: '张三',
        role: '管理员',
      },
    };
  },
  
  computed: {
    // 模板字符串
    greeting() {
      return `你好，${this.user.name}！`;
    },
    
    // 字符串拼接
    fullMessage() {
      return '当前用户：' + this.user.name + '，角色：' + this.user.role;
    },
  },
  
  methods: {
    // 函数中的字符串
    showMessage() {
      alert('操作成功');
      console.log('数据已保存');
    },
    
    // 带参数的模板字符串
    formatMessage(count) {
      return `共有 ${count} 条记录`;
    },
    
    // 复杂拼接
    buildUrl(id) {
      return '/api/product/' + id + '/detail';
    },
  },
};
</script>

