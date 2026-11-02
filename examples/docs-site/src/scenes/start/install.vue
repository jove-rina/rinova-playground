<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({ title: '安装与启动', order: 2, description: '三条命令跑起来。' })
</script>

<script setup lang="ts">
import Prose from '../../components/Prose.vue'
</script>

<template>
  <Prose title="安装与启动" lead="从零到首屏，目标是 3 分钟以内。">
    <h2>新建项目</h2>
    <pre><code>pnpm create rinova-playground my-lib
cd my-lib &amp;&amp; pnpm install
pnpm dev        # http://localhost:5273</code></pre>

    <h2>接入已有项目</h2>
    <pre><code>pnpm add -D @rinova/playground @rinova/playground-vite less
pnpm add vue</code></pre>
    <p>然后两处接线：</p>
    <pre><code>// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { playground } from '@rinova/playground-vite'

export default defineConfig({ plugins: [vue(), playground()] })</code></pre>
    <pre><code>// src/main.ts
import '@rinova/playground/style.css'
import { createPlayground } from '@rinova/playground'
createPlayground()</code></pre>

    <h2>构建</h2>
    <pre><code>pnpm build      # 产物是纯静态站，可直接扔 CDN</code></pre>
    <p>history 路由要求静态托管把未匹配路径 rewrite 到 <code>index.html</code>（nginx：<code>try_files $uri $uri/ /index.html;</code>）。</p>
  </Prose>
</template>
