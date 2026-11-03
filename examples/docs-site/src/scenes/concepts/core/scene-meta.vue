<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: 'sceneMeta', order: 2, tags: ['元信息'] })
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="sceneMeta" lead="可选。只有要改标题、排序、加说明或藏起场景时才写。">
    <pre><code>&lt;script lang="ts"&gt;
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '按钮 · 基础用法',
  order: 1,
  tags: ['基础', 'click'],
  description: '显示在预览区上方的一句话说明。',
  files: ['src/components/MyButton.vue'],
  hideInNav: false,
})
&lt;/script&gt;</code></pre>

    <table>
      <thead><tr><th>字段</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>title</code></td><td>覆盖文件名推导出的标题</td></tr>
        <tr><td><code>order</code></td><td>同层排序，小在前</td></tr>
        <tr><td><code>tags</code></td><td>搜索与筛选</td></tr>
        <tr><td><code>description</code></td><td>预览区上方的说明文字</td></tr>
        <tr><td><code>files</code></td><td>额外要展示的源码文件，会变成源码面板的多文件 Tab</td></tr>
        <tr><td><code>hideInNav</code></td><td>不进侧栏，但 URL 直达仍可用</td></tr>
      </tbody>
    </table>

    <h2>怎么被解析的</h2>
    <p>插件在扫描阶段用 <code>@vue/compiler-sfc</code> 取出 <code>&lt;script&gt;</code> 块交给 jiti 执行，只把可序列化的导航字段注入虚拟模块。写运行时表达式（如 <code>title: someVar</code>）会在控制台告警并回退到文件名。</p>
  </Prose>
</template>
