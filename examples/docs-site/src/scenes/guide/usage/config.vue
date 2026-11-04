<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: '配置项', order: 1, tags: ['config'] })
</script>

<script setup lang="ts">
import Prose from '../../../components/Prose.vue'
</script>

<template>
  <Prose title="playground.config.ts" lead="唯一配置文件。大部分字段可以不写。">
    <pre data-lang="ts"><code>import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'My Lib',
  scenes: 'src/scenes',
  port: 5273,
  components: ['src/components/**/*.vue'],
  theme: { ui: 'auto', stage: 'light' },
})</code></pre>

    <table>
      <thead><tr><th>字段</th><th>默认</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>title</code></td><td>包名</td><td>左上角品牌标题</td></tr>
        <tr><td><code>scenes</code></td><td><code>src/scenes</code></td><td>场景扫描根目录</td></tr>
        <tr><td><code>port</code></td><td><code>5273</code></td><td>dev server 端口</td></tr>
        <tr><td><code>components</code></td><td>—</td><td>契约清单要扫描的组件 glob，不配则不生成 manifest</td></tr>
        <tr><td><code>sources</code></td><td><code>true</code></td><td>是否展示每个场景下方的源码行</td></tr>
        <tr><td><code>theme.ui</code></td><td><code>auto</code></td><td>外壳主题（12 个 CSS 变量）</td></tr>
        <tr><td><code>theme.stage</code></td><td><code>light</code></td><td>演示画布主题，独立于外壳（组件库只有浅色时保持 light）</td></tr>
        <tr><td>代码配色</td><td><code>light-plus</code> / <code>tokyo-night</code></td><td>随外壳明暗切换，不可配</td></tr>
        <tr><td><code>groups</code></td><td>—</td><td>分组目录名 → 侧栏显示名，声明顺序即侧栏顺序</td></tr>
        <tr><td><code>editor</code></td><td>—</td><td>本地编辑器：<code>preset</code> / <code>options</code> / <code>allowChoice</code> / <code>allowCustom</code> / <code>exposeRoot</code></td></tr>
        <tr><td><code>base</code></td><td><code>/</code></td><td>部署子路径</td></tr>
        <tr><td><code>routeBase</code></td><td>同 base</td><td>只影响场景 URL 前缀（MPA 子路径部署）</td></tr>
      </tbody>
    </table>
  </Prose>
</template>