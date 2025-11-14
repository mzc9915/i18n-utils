<template>
  <div class="test">
    <!-- 简单文本 -->
    <h1>产品列表</h1>
    
    <!-- 静态属性 -->
    <input placeholder="请输入搜索关键词" />
    
    <!-- 按钮 -->
    <button>提交</button>
  </div>
</template>

<script>
export default {
  name: 'Test',
  
  data() {
    return {
      // 简单字符串
      title: '欢迎使用',
      
      // 数组
      tabs: ['首页', '产品', '关于'],
    };
  },
  
  methods: {
    handleClick() {
      alert('操作成功');
    },
  },
};
</script>

