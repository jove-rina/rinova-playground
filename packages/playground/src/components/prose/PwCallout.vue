<script setup lang="ts">
/**
 * 提示块：把「注意 / 建议 / 警告 / 危险」这类旁注从正文里拎出来。
 *
 * Markdown 里写 `::: tip 标题`，渲染出来就是同一个组件。
 */
import { Info, Lightbulb, OctagonAlert, TriangleAlert } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 语义：info 说明 / tip 建议 / warn 警告 / danger 危险 */
    tone?: 'info' | 'tip' | 'warn' | 'danger'
    /** 小标题，留空则只有正文 */
    title?: string
  }>(),
  { tone: 'info', title: '' }
)

const icons = { info: Info, tip: Lightbulb, warn: TriangleAlert, danger: OctagonAlert }
const icon = computed(() => icons[props.tone])
</script>

<template>
  <aside class="pw-callout" :class="`pw-callout--${tone}`">
    <component :is="icon" :size="15" class="pw-callout__icon" />
    <div class="pw-callout__main">
      <p v-if="title" class="pw-callout__title">{{ title }}</p>
      <div class="pw-callout__body">
        <slot />
      </div>
    </div>
  </aside>
</template>

<style scoped lang="less">
.pw-callout {
  --pw-tone: var(--rp-color-primary);

  display: flex;
  gap: 10px;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid var(--rp-color-border);
  border-left: 3px solid var(--pw-tone);
  border-radius: var(--rp-radius);
  background: color-mix(in srgb, var(--pw-tone) 7%, transparent);
}

.pw-callout--tip {
  --pw-tone: var(--rp-color-success);
}

.pw-callout--warn {
  --pw-tone: var(--rp-color-warning);
}

.pw-callout--danger {
  --pw-tone: var(--rp-color-danger);
}

.pw-callout__icon {
  flex: 0 0 auto;
  margin-top: 3px;
  color: var(--pw-tone);
}

.pw-callout__main {
  min-width: 0;
  flex: 1;
}

.pw-callout__title {
  margin: 0 0 2px;
  color: var(--pw-tone);
  font-size: 13px;
  font-weight: 600;
}

.pw-callout__body {
  font-size: 13px;
  line-height: 1.7;

  :deep(> :last-child) {
    margin-bottom: 0;
  }

  :deep(p) {
    margin: 0 0 6px;
  }

  :deep(code) {
    padding: 1px 4px;
    border: 1px solid var(--rp-color-border);
    border-radius: 4px;
    background: color-mix(in srgb, var(--rp-color-text-muted) 8%, transparent);
    font-family: var(--rp-font-mono);
    font-size: 12px;
  }
}
</style>
