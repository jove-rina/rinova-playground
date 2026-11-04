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
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 18px 14px 24px 18px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  /* 闲置时透明，指针进到面板才显形 */
  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: transparent;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--rp-color-text-muted) 26%, transparent);
  }

  &:hover::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--rp-color-text-muted) 45%, transparent);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &__inner {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-right: 2px;
  }

  &__label {
    margin: 0 0 6px;
    /* 和链接文字同一条 9px 内缩 */
    padding-left: 9px;
    color: var(--rp-color-text-muted);
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__link {
    display: block;
    padding: 5px 9px;
    border-radius: 6px;
    color: var(--rp-color-text-muted);
    font-size: 12.5px;
    line-height: 1.5;
    text-decoration: none;
    transition: color 0.15s ease, background 0.15s ease;

    & + & {
      margin-top: 1px;
    }

    &:hover {
      background: color-mix(in srgb, var(--rp-color-text-muted) 10%, transparent);
      color: var(--rp-color-text);
    }

    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--rp-color-primary) 45%, transparent);
      outline-offset: -2px;
    }

    &.is-active {
      background: color-mix(in srgb, var(--rp-color-primary) 12%, transparent);
      color: var(--rp-color-primary);
      font-weight: 500;
    }
  }
}
</style>
