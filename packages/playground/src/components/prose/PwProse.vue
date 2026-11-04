<script setup lang="ts">
/**
 * 文档排版容器：给内容页（介绍、指南、说明）提供统一的标题 / 段落 / 列表 / 表格 / 代码样式。
 *
 * 样式之外只多做一件事：把插槽里的 `<pre><code class="language-ts">` 就地升级成
 * 高亮 + 语言角标 + 复制按钮，和 Markdown 代码块完全一致。
 */
import { onMounted, onUpdated, ref } from 'vue'
import { enhanceCodeBlocks, handleCopyClick } from './enhance'

withDefaults(
  defineProps<{
    /** 大标题（可选，通常是页标题或场景标题） */
    title?: string
    /** 标题下的一行引导语 */
    lead?: string
    /** 正文宽度，默认 720px */
    width?: string
  }>(),
  { title: '', lead: '', width: '' }
)

const rootEl = ref<HTMLElement | null>(null)
/** 增强是幂等的：按钮还在就跳过，Vue 重渲染把 DOM 覆盖了才重新跑 */
const enhance = (): void => {
  void enhanceCodeBlocks(rootEl.value)
}

onMounted(enhance)
onUpdated(enhance)
</script>

<template>
  <article
    ref="rootEl"
    class="pw-prose"
    :style="width ? { '--pw-prose-width': width } : undefined"
    @click="handleCopyClick"
  >
    <header v-if="title || lead" class="pw-prose__head">
      <h1 v-if="title">{{ title }}</h1>
      <p v-if="lead" class="pw-prose__lead">{{ lead }}</p>
    </header>
    <slot />
  </article>
</template>

<style lang="less">
@import './prose.less';
</style>
