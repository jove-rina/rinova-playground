<script setup lang="ts">
/**
 * Markdown 渲染：`.md` 场景就是它渲染出来的。
 *
 * 做法是「Markdown → 区块 → 组件」：普通段落走 `v-html`，
 * `::: tip` 变成 `PwCallout`、`::: steps` 变成 `PwSteps`，
 * 所以 Markdown 与手写 Vue 内容页共用同一套组件与样式。
 *
 * 代码块的语法高亮、语言角标、复制按钮由 `enhance.ts` 统一处理（与 `PwProse` 同一段逻辑）。
 */
import { nextTick, ref, watch } from 'vue'
import PwCallout from './PwCallout.vue'
import PwSteps from './PwSteps.vue'
import PwStep from './PwStep.vue'
import { enhanceCodeBlocks, handleCopyClick } from './enhance'
import { renderMarkdown, type MarkdownBlock } from './render'

const props = withDefaults(
  defineProps<{
    /** Markdown 原文 */
    source: string
    /** 正文宽度，默认 720px */
    width?: string
  }>(),
  { width: '' }
)

const blocks = ref<MarkdownBlock[]>([])
const failed = ref('')
const rootEl = ref<HTMLElement | null>(null)

watch(
  () => props.source,
  async (source) => {
    try {
      blocks.value = await renderMarkdown(source)
      failed.value = ''
    } catch (error) {
      failed.value = error instanceof Error ? error.message : String(error)
      blocks.value = []
    }
    await nextTick()
    await enhanceCodeBlocks(rootEl.value)
  },
  { immediate: true }
)
</script>

<template>
  <article
    ref="rootEl"
    class="pw-prose"
    :style="width ? { '--pw-prose-width': width } : undefined"
    @click="handleCopyClick"
  >
    <template v-for="(block, index) in blocks" :key="index">
      <PwCallout v-if="block.kind === 'callout'" :tone="block.tone" :title="block.title">
        <div class="pw-prose__block" v-html="block.html" />
      </PwCallout>

      <PwSteps v-else-if="block.kind === 'steps'">
        <PwStep v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <div class="pw-prose__block" v-html="item" />
        </PwStep>
      </PwSteps>

      <div v-else class="pw-prose__block" v-html="block.html" />
    </template>

    <p v-if="failed" class="pw-prose__error">Markdown 渲染失败：{{ failed }}</p>
  </article>
</template>

<style lang="less">
@import './prose.less';

.pw-prose__block > :first-child {
  margin-top: 0;
}

.pw-prose__block > :last-child {
  margin-bottom: 0;
}

.pw-prose__error {
  margin: 0;
  color: var(--rp-color-danger);
  font-size: 13px;
}
</style>
