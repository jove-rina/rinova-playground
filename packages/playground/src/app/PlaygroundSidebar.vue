<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@lucide/vue'
import PwInput from '../components/PwInput.vue'
import type { SceneDescriptor } from '../types'

const props = defineProps<{
  title: string
  groups: { name: string; items: SceneDescriptor[] }[]
  activeId: string
  sceneCount: number
}>()

defineEmits<{ select: [id: string] }>()

const query = ref('')
const inputRef = ref<InstanceType<typeof PwInput> | null>(null)

const focusSearch = () => {
  inputRef.value?.focus()
}

defineExpose({ focusSearch })

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.groups
  return props.groups
    .map((group) => ({
      name: group.name,
      items: group.items.filter(
        (item) => item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
      ),
    }))
    .filter((group) => group.items.length > 0)
})
</script>

<template>
  <aside class="pw-sidebar">
    <div class="pw-sidebar__brand">
      <span class="pw-sidebar__logo" aria-hidden="true" />
      <span class="pw-sidebar__title">{{ title }}</span>
    </div>

    <div class="pw-sidebar__search">
      <PwInput ref="inputRef" v-model="query" size="sm" placeholder="搜索场景">
        <template #prefix>
          <Search :size="13" class="pw-sidebar__search-icon" />
        </template>
        <template #suffix>
          <kbd class="pw-sidebar__kbd">⌘K</kbd>
        </template>
      </PwInput>
    </div>

    <nav class="pw-sidebar__nav">
      <section v-for="group in filteredGroups" :key="group.name" class="pw-nav-group">
        <div class="pw-nav-group__title">{{ group.name }}</div>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="pw-nav-item"
          :class="{ 'is-active': item.id === activeId }"
          @click="$emit('select', item.id)"
        >
          {{ item.title }}
        </button>
      </section>

      <p v-if="!filteredGroups.length" class="pw-sidebar__empty">没有匹配的场景</p>
    </nav>

    <footer class="pw-sidebar__footer">{{ sceneCount }} 个场景</footer>
  </aside>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-sidebar {
  display: flex;
  flex-direction: column;
  width: 264px;
  flex: 0 0 264px;
  height: 100%;
  border-right: 1px solid var(--rp-color-border);
  background: var(--rp-color-surface);
}

.pw-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 49px;
  padding: 0 16px;
  border-bottom: 1px solid var(--rp-color-border);
}

.pw-sidebar__logo {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--rp-color-primary);
}

.pw-sidebar__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--rp-color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-sidebar__search {
  padding: 12px 12px 8px;
}

.pw-sidebar__search-icon {
  color: var(--rp-color-text-muted);
  flex: 0 0 auto;
}

.pw-sidebar__kbd {
  flex: 0 0 auto;
  padding: 1px 4px;
  border: 1px solid var(--rp-color-border);
  border-radius: 4px;
  color: var(--rp-color-text-muted);
  font-family: var(--rp-font-mono);
  font-size: 10px;
  line-height: 1.4;
}

.pw-sidebar__nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 8px 12px;
}

.pw-nav-group + .pw-nav-group {
  margin-top: 10px;
}

.pw-nav-group__title {
  padding: 6px 8px 4px;
  color: var(--rp-color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pw-nav-item {
  display: block;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: calc(var(--rp-radius) - 3px);
  background: transparent;
  color: var(--rp-color-text);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-nav-item:hover {
  background: color-mix(in srgb, var(--rp-color-text-muted) 10%, transparent);
}

.pw-nav-item.is-active {
  background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
  color: var(--rp-color-primary);
  font-weight: 500;
}

.pw-nav-item:focus-visible {
  .pw-focus-ring(-2px);
}

.pw-sidebar__empty {
  margin: 16px 8px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}

.pw-sidebar__footer {
  padding: 10px 16px;
  border-top: 1px solid var(--rp-color-border);
  color: var(--rp-color-text-muted);
  font-size: 11px;
}
</style>
