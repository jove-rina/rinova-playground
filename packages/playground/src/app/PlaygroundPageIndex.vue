<script setup lang="ts">
import { computed } from 'vue'
import type { SceneDescriptor } from '../types'

const props = defineProps<{
  scenes: SceneDescriptor[]
  active: string
}>()

const emit = defineEmits<{ jump: [name: string] }>()

const SECTION_LABELS: { key: SceneDescriptor['section']; label: string }[] = [
  { key: 'overview', label: '概要' },
  { key: 'props', label: 'Props' },
  { key: 'events', label: 'Events' },
  { key: 'exposes', label: 'Exposes' },
  { key: 'slots', label: 'Slots' },
]

const groups = computed(() =>
  SECTION_LABELS.map((section) => ({
    ...section,
    items: props.scenes.filter((scene) => !scene.hidden && scene.section === section.key),
  })).filter((group) => group.items.length > 0)
)
</script>

<template>
  <aside class="pw-index" aria-label="场景索引">
    <nav class="pw-index__inner">
      <div v-for="group in groups" :key="group.key" class="pw-index__group">
        <div class="pw-index__label">{{ group.label }}</div>
        <a
          v-for="scene in group.items"
          :key="scene.id"
          :href="`#${scene.name}`"
          class="pw-index__link"
          :class="{ 'is-active': scene.name === active }"
          @click.prevent="emit('jump', scene.name)"
        >
          {{ scene.title }}
        </a>
      </div>
    </nav>
  </aside>
</template>

<style scoped lang="less">
.pw-index {
  position: sticky;
  top: 0;
  flex: 0 0 200px;
  width: 200px;
  max-height: calc(100vh - 80px);
  overflow: auto;
  padding: 4px 0 24px;

  &__inner {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__label {
    margin-bottom: 4px;
    color: var(--rp-color-text-muted);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__link {
    display: block;
    padding: 3px 8px;
    margin-left: -8px;
    border-radius: 6px;
    color: var(--rp-color-text-muted);
    font-size: 12px;
    line-height: 1.5;
    text-decoration: none;
    transition: color 0.15s ease, background 0.15s ease;

    &:hover {
      background: var(--rp-color-surface);
      color: var(--rp-color-text);
    }

    &.is-active {
      background: color-mix(in srgb, var(--rp-color-primary) 11%, transparent);
      color: var(--rp-color-primary);
      font-weight: 600;
    }
  }
}
</style>
