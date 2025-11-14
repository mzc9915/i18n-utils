<template>
  <div>
    <!-- 场景1: 分散的文本节点 -->
    <div>
      <span style="color: grey;">已选择</span>
      <span style="color: blue; font-weight: bold;">{{ count }}</span>
      <span style="color: grey;">项</span>
    </div>

    <!-- 场景2: 分散的纯文本节点 -->
    <div>
      <span style="color: grey;">总共</span>
      <span style="color: grey;">条记录</span>
    </div>

    <!-- 场景3: 混合文本 -->
    <div>
      当前页：<span>{{ page }}</span> / 总页数：<span>{{ total }}</span>
    </div>

    <!-- 场景4: 嵌套结构 -->
    <div class="info">
      <span class="label">用户名：</span>
      <span class="value">{{ userName }}</span>
    </div>

    <!-- 场景5: 表格单元格 -->
    <table>
      <tr>
        <td>产品名称</td>
        <td>{{ product.name }}</td>
      </tr>
      <tr>
        <td>产品价格</td>
        <td>{{ product.price }}</td>
      </tr>
    </table>

    <!-- 场景6: 列表项 -->
    <ul>
      <li>第一项</li>
      <li>第二项</li>
      <li>第三项</li>
    </ul>

    <!-- 场景7: 带标点的分散文本 -->
    <div>
      <span>提示</span>
      <span>：</span>
      <span>请仔细阅读</span>
    </div>

    <!-- 场景8: 完整的句子（应该保持） -->
    <p>这是一个完整的段落文本，应该作为整体提取。</p>

    <!-- 场景9: 按钮文本（应该保持） -->
    <button>提交表单</button>

    <!-- 场景10: 带 HTML 的长文本 -->
    <div class="description">
      这是产品介绍的<strong>第一段</strong>内容，
      包含了<em>重要信息</em>。
    </div>
  </div>
</template>

<script>
export default {
  name: 'EdgeCases',
  data() {
    return {
      count: 10,
      page: 1,
      total: 100,
      userName: '张三',
      product: {
        name: '商品A',
        price: 99.99,
      },
    };
  },
};
</script>

