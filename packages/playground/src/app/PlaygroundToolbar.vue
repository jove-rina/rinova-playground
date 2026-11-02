<script setup lang="ts">
import { Code2, Moon, Monitor, Smartphone, Sun, Tablet } from '@lucide/vue'
import PwButton from '../components/PwButton.vue'

defineProps<{
  group: string
  title: string
  showCode: boolean
  width: 'auto' | 'tablet' | 'mobile'
  theme: 'light' | 'dark'
}>()

const emit = defineEmits<{
  'toggle-code': []
  'update:width': [width: 'auto' | 'tablet' | 'mobile']
  'toggle-theme': []
}>()

const widths = [
  { value: 'auto', icon: Monitor, label: '自适应' },
  { value: 'tablet', icon: Tablet, label: '平板 820px' },
  { value: 'mobile', icon: Smartphone, label: '手机 420px' },
] as const
</script>

<template>
  <header class="pw-toolbar">
    <div class="pw-toolbar__crumb">
      <span class="pw-toolbar__group">{{ group }}</span>
      <span class="pw-toolbar__sep">/</span>
      <span class="pw-toolbar__title">{{ title }}</span>
    </div>

    <div class="pw-toolbar__actions">
      <div class="pw-width-group" role="group" aria-label="预览宽度">
        <button
          v-for="item in widths"
          :key="item.value"
          type="button"
          class="pw-width-btn"
          :class="{ 'is-active': width === item.value }"
          :title="item.label"
          @click="emit('update:width', item.value)"
        >
          <component :is="item.icon" :size="14" />
        </button>
      </div>

      <PwButton size="sm" :title="theme === 'dark' ? '切换到浅色' : '切换到深色'" @click="emit('toggle-theme')">
        <template #icon>
          <Moon v-if="theme === 'light'" :size="14" />
          <Sun v-else :size="14" />
        </template>
      </PwButton>

      <PwButton size="sm" :variant="showCode ? 'primary' : 'ghost'" @click="emit('toggle-code')">
        <template #icon>
          <Code2 :size="14" />
        </template>
        代码
      </PwButton>
    </div>
  </header>
</template>

<style scoped>
.pw-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 49px;
  flex: 0 0 49px;
  padding: 0 16px;
  border-bottom: 1px solid var(--rp-color-border);
  background: var(--rp-color-bg);
}

.pw-toolbar__crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
}

.pw-toolbar__group {
  color: var(--rp-color-text-muted);
  white-space: nowrap;
}

.pw-toolbar__sep {
  color: var(--rp-color-border);
}

.pw-toolbar__title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pw-width-group {
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border: 1px solid var(--rp-color-border);
  border-radius: calc(var(--rp-radius) - 2px);
  background: var(--rp-color-surface);
}

.pw-width-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--rp-color-text-muted);
  cursor: pointer;
}

.pw-width-btn:hover {
  color: var(--rp-color-text);
}

.pw-width-btn.is-active {
  background: var(--rp-color-bg);
  color: var(--rp-color-primary);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--rp-color-text) 10%, transparent);
}

.pw-width-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--rp-color-primary) 55%, transparent);
  outline-offset: -1px;
}
</style>
