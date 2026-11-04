<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ChevronRight, PanelLeftClose, Search } from '@lucide/vue'
import PwInput from '../components/PwInput.vue'

interface NavPage {
  id: string
  title: string
  count: number
  /** 1 = 组件页，2 = 子组件页 */
  depth: 1 | 2
  children: NavPage[]
}

interface NavGroup {
  name: string
  pages: NavPage[]
}

const props = defineProps<{
  title: string
  groups: NavGroup[]
  activePageId: string
  sceneCount: number
}>()

const emit = defineEmits<{ select: [id: string]; collapse: [] }>()

const query = ref('')
const inputRef = ref<InstanceType<typeof PwInput> | null>(null)
const navRef = ref<HTMLElement | null>(null)

/** 分组展开状态：默认只展开活动页所在的那个组（没有活动页时展开第一个组） */
const expandedGroups = ref<Set<string>>(new Set())
/** 带子组件的组件页展开状态 */
const expandedPages = ref<Set<string>>(new Set())

const focusSearch = (): void => {
  inputRef.value?.focus()
}

defineExpose({ focusSearch })

const searching = computed(() => query.value.trim() !== '')

const groupOfPage = (id: string): NavGroup | undefined =>
  props.groups.find((group) => group.pages.some((page) => page.id === id || page.children.some((child) => child.id === id)))

const parentOf = (id: string): NavPage | undefined =>
  props.groups.flatMap((group) => group.pages).find((page) => page.children.some((child) => child.id === id))

/** 打开某一页时，把它所在分组与父组件页一起展开，保证能看见当前页 */
const reveal = (id: string): void => {
  if (!id) return
  const self = props.groups.flatMap((group) => group.pages).find((page) => page.id === id)
  const group = groupOfPage(id)
  if (group && !expandedGroups.value.has(group.name)) {
    expandedGroups.value = new Set([...expandedGroups.value, group.name])
  }
  const parent = parentOf(id)
  if (parent && !expandedPages.value.has(parent.id)) {
    expandedPages.value = new Set([...expandedPages.value, parent.id])
  }
  if (self && self.children.length && !expandedPages.value.has(self.id)) {
    expandedPages.value = new Set([...expandedPages.value, self.id])
  }
}

watch(() => props.activePageId, (id) => reveal(id), { immediate: true })

onMounted(() => {
  if (expandedGroups.value.size) return
  const first = props.groups[0]
  if (first) expandedGroups.value = new Set([first.name])
})

const toggleGroup = (name: string): void => {
  if (searching.value) return
  const next = new Set(expandedGroups.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  expandedGroups.value = next
}

/** 点父页本身：先进入该页，再有子组件就顺手展开，不必再点右侧箭头 */
const openPage = (page: NavPage): void => {
  emit('select', page.id)
  if (page.children.length && !expandedPages.value.has(page.id)) togglePage(page.id)
}

const togglePage = (id: string): void => {
  const next = new Set(expandedPages.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedPages.value = next
}

const pageExpanded = (id: string): boolean => searching.value || expandedPages.value.has(id)

const groupExpanded = (name: string): boolean => searching.value || expandedGroups.value.has(name)

/** 父页展开且当前页就是它的子页时，父行也要有“包含当前页”的弱提示 */
const pageHasActiveChild = (page: NavPage): boolean =>
  page.children.some((child) => child.id === props.activePageId)

/** 把命中片段切出来，模板里用 <mark> 标出，用户能看懂为什么这一项被搜出来 */
const splitMatch = (text: string): { text: string; hit: boolean }[] => {
  const needle = query.value.trim()
  if (!needle) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const target = needle.toLowerCase()
  const parts: { text: string; hit: boolean }[] = []
  let cursor = 0
  for (;;) {
    const index = lower.indexOf(target, cursor)
    if (index < 0) {
      if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
      return parts
    }
    if (index > cursor) parts.push({ text: text.slice(cursor, index), hit: false })
    parts.push({ text: text.slice(index, index + target.length), hit: true })
    cursor = index + target.length
  }
}

const groupHasActive = (group: NavGroup): boolean =>
  group.pages.some((page) => page.id === props.activePageId || page.children.some((child) => child.id === props.activePageId))

const matches = (node: NavPage, needle: string): boolean =>
  node.title.toLowerCase().includes(needle) || node.id.toLowerCase().includes(needle)

/** 搜索时把命中的页 / 子页提出来并全部展开；平时按折叠状态渲染 */
const filteredGroups = computed<NavGroup[]>(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.groups
  return props.groups
    .map((group) => {
      const groupHit = group.name.toLowerCase().includes(needle)
      const pages = group.pages
        .map((page) => {
          const pageHit = groupHit || matches(page, needle)
          const children = page.children.filter((child) => groupHit || pageHit || matches(child, needle))
          return pageHit || children.length ? { ...page, children } : null
        })
        .filter((page): page is NavPage => page !== null)
      return pages.length ? { name: group.name, pages } : null
    })
    .filter((group): group is NavGroup => group !== null)
})

const pageCount = computed(() =>
  props.groups.reduce((sum, group) => sum + group.pages.reduce((inner, page) => inner + 1 + page.children.length, 0), 0)
)

const visibleItems = (): HTMLButtonElement[] =>
  [...(navRef.value?.querySelectorAll<HTMLButtonElement>('.pw-nav-item') ?? [])].filter((el) => el.offsetParent !== null)

/** 键盘浏览：↑ / ↓ 在可见页项间移动，Home / End 到首尾，Enter 交给原生 button */
const onNavKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
  const items = visibleItems()
  if (!items.length) return
  event.preventDefault()
  const index = items.indexOf(document.activeElement as HTMLButtonElement)
  if (event.key === 'Home') {
    items[0]?.focus()
    return
  }
  if (event.key === 'End') {
    items[items.length - 1]?.focus()
    return
  }
  const step = event.key === 'ArrowDown' ? 1 : -1
  items[index < 0 ? 0 : (index + step + items.length) % items.length]?.focus()
}

/** 搜索框的键盘约定：Enter 进第一条命中，↓ 把焦点交给列表，Esc 先清空再退出 */
const onSearchKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter') {
    const first = visibleItems()[0]
    if (first) {
      event.preventDefault()
      first.click()
    }
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    visibleItems()[0]?.focus()
    return
  }
  if (event.key !== 'Escape') return
  if (query.value) {
    query.value = ''
    event.preventDefault()
    return
  }
  ;(event.target as HTMLInputElement | null)?.blur()
}

/** 当前页切换、分组展开后，把它滚进侧栏视口（长列表时不会“高亮在屏幕外”） */
watch(
  [() => props.activePageId, expandedGroups, expandedPages, query],
  async () => {
    await nextTick()
    navRef.value?.querySelector<HTMLElement>('.pw-nav-item.is-active')?.scrollIntoView({ block: 'nearest' })
  },
  { flush: 'post' }
)
</script>

<template>
  <aside class="pw-sidebar" aria-label="组件导航">
    <div class="pw-sidebar__brand">
      <span class="pw-sidebar__logo" aria-hidden="true" />
      <span class="pw-sidebar__title">{{ title }}</span>
      <button type="button" class="pw-sidebar__collapse" title="收起侧栏（⌘.）" @click="emit('collapse')">
        <PanelLeftClose :size="13" />
      </button>
    </div>

    <div class="pw-sidebar__search">
      <PwInput ref="inputRef" v-model="query" size="sm" placeholder="搜索页面" @keydown="onSearchKeydown">
        <template #prefix>
          <Search :size="13" class="pw-sidebar__search-icon" />
        </template>
        <template v-if="!query" #suffix>
          <kbd class="pw-sidebar__kbd">⌘K</kbd>
        </template>
      </PwInput>
    </div>

    <nav ref="navRef" class="pw-sidebar__nav" aria-label="组件页列表" @keydown="onNavKeydown">
      <section v-for="group in filteredGroups" :key="group.name" class="pw-nav-group">
        <button
          type="button"
          class="pw-nav-group__title"
          :class="{ 'has-active': !groupExpanded(group.name) && groupHasActive(group) }"
          :disabled="searching"
          :aria-expanded="groupExpanded(group.name)"
          :title="searching ? `${group.name}（搜索中）` : groupExpanded(group.name) ? `收起 ${group.name}` : `展开 ${group.name}`"
          @click="toggleGroup(group.name)"
        >
          <span class="pw-nav-group__name">
            <template v-for="(part, index) in splitMatch(group.name)" :key="index">
              <mark v-if="part.hit" class="pw-nav__hit">{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </span>
          <span v-if="!groupExpanded(group.name)" class="pw-nav-group__count">{{ group.pages.length }}</span>
          <span class="pw-nav-group__chevron-box">
            <ChevronRight :size="12" class="pw-nav-group__chevron" :class="{ 'is-open': groupExpanded(group.name) }" />
          </span>
        </button>

        <div v-show="groupExpanded(group.name)" class="pw-nav-group__list">
          <template v-for="page in group.pages" :key="page.id">
            <div class="pw-nav-row" :class="{ 'is-branch-active': pageHasActiveChild(page) }">
              <button
                type="button"
                class="pw-nav-item"
                :class="{ 'is-active': page.id === activePageId, 'has-children': page.children.length }"
                :aria-current="page.id === activePageId ? 'page' : undefined"
                :title="`${page.title} · ${page.count} 个场景`"
                @click="openPage(page)"
              >
                <span class="pw-nav-item__title">
                  <template v-for="(part, index) in splitMatch(page.title)" :key="index">
                    <mark v-if="part.hit" class="pw-nav__hit">{{ part.text }}</mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
              </button>
              <button
                v-if="page.children.length"
                type="button"
                class="pw-nav-toggle"
                :aria-expanded="pageExpanded(page.id)"
                :aria-label="`${pageExpanded(page.id) ? '收起' : '展开'} ${page.title} 的子组件`"
                :title="pageExpanded(page.id) ? `收起 ${page.title} 的子组件` : `展开 ${page.title} 的子组件`"
                @click="togglePage(page.id)"
              >
                <ChevronRight :size="12" :class="{ 'is-open': pageExpanded(page.id) }" />
              </button>
            </div>

            <div v-show="pageExpanded(page.id)" class="pw-nav-children">
              <button
                v-for="child in page.children"
                :key="child.id"
                type="button"
                class="pw-nav-item is-child"
                :class="{ 'is-active': child.id === activePageId }"
                :aria-current="child.id === activePageId ? 'page' : undefined"
                :title="`${child.title} · ${child.count} 个场景`"
                @click="emit('select', child.id)"
              >
                <span class="pw-nav-item__title">
                  <template v-for="(part, index) in splitMatch(child.title)" :key="index">
                    <mark v-if="part.hit" class="pw-nav__hit">{{ part.text }}</mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </span>
              </button>
            </div>
          </template>
        </div>
      </section>

      <p v-if="!filteredGroups.length" class="pw-sidebar__empty">没有匹配的页面<kbd class="pw-sidebar__kbd">Esc</kbd> 清空</p>
    </nav>

    <footer class="pw-sidebar__footer">
      <span>{{ pageCount }} 个页面 · {{ sceneCount }} 个场景</span>
      <kbd class="pw-sidebar__kbd">⌘.</kbd>
    </footer>
  </aside>
</template>

<style scoped lang="less">
@import (reference) '../styles/mixins.less';

.pw-sidebar {
  display: flex;
  flex: 0 0 260px;
  flex-direction: column;
  width: 260px;
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

.pw-sidebar__collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--rp-color-text-muted);
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--rp-color-text-muted) 12%, transparent);
    color: var(--rp-color-text);
  }

  &:focus-visible {
    .pw-focus-ring(-2px);
  }
}

.pw-sidebar__search {
  /* 与品牌 logo、分组标题同一条 16px 导轨 */
  padding: 12px 16px 4px;
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
  /* 覆盖式滚动条不压正文 */
  scrollbar-gutter: stable;
  padding: 4px 16px 16px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--rp-color-text-muted) 26%, transparent) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 3px;
    background: color-mix(in srgb, var(--rp-color-text-muted) 26%, transparent);
  }

  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--rp-color-text-muted) 45%, transparent);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.pw-nav-group + .pw-nav-group {
  padding-top: 6px;
}

.pw-nav-group__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pw-nav-group__title {
  /* 分组标题吸顶：长列表滚动时始终知道自己在哪一组 */
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 28px;
  /* 整行 28px 可点，左边缘与页项 hover 底色对齐（16px 导轨）；
     右缘留 4px，让箭头中心和页项箭头中心重合 */
  margin: 0;
  padding: 0 4px 0 0;
  border: 0;
  background: var(--rp-color-surface);
  color: var(--rp-color-text-muted);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;

  &:hover:not(:disabled) {
    /* 吸顶标题必须是不透明底色，否则滚动的列表会透过来 */
    background: color-mix(in srgb, var(--rp-color-text-muted) 8%, var(--rp-color-surface));
    color: var(--rp-color-text);
  }

  &:disabled {
    cursor: default;
  }

  /* 当前页被收在这个组里时，标题也给出品牌色，别让人找不到自己 */
  &.has-active {
    color: var(--rp-color-primary);
  }

  &:hover:not(:disabled) .pw-nav-group__count {
    background: color-mix(in srgb, var(--rp-color-text-muted) 20%, transparent);
    color: var(--rp-color-text);
  }

  &.has-active .pw-nav-group__count {
    background: color-mix(in srgb, var(--rp-color-primary) 16%, transparent);
    color: var(--rp-color-primary);
  }
}

.pw-nav-group__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 收起时显示「这一组有几页」，避免收起后看起来是空的 */
.pw-nav-group__count {
  flex: 0 0 auto;
  padding: 0 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--rp-color-text-muted) 12%, transparent);
  color: var(--rp-color-text-muted);
  font-size: 10px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 16px;
  letter-spacing: 0;
}

.pw-nav-group__chevron-box {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.pw-nav-group__chevron {
  flex: 0 0 auto;
  transition: transform 0.15s ease;

  &.is-open {
    transform: rotate(90deg);
  }
}

.pw-nav-row {
  position: relative;
}

.pw-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 28px;
  /* 分组标题在 16px 导轨上，页项再缩进 8px（文字 24px） */
  padding: 5px 8px;
  border: 0;
  border-radius: calc(var(--rp-radius) - 3px);
  background: transparent;
  color: var(--rp-color-text);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;

  &.has-children {
    padding-right: 28px;
  }

  &.is-child {
    font-size: 12.5px;
  }
}

.pw-nav__hit {
  padding: 0 1px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--rp-color-primary) 24%, transparent);
  color: inherit;
  font-weight: 600;
}

.pw-nav-item__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pw-nav-row.is-branch-active .pw-nav-item:not(.is-active) {
  color: color-mix(in srgb, var(--rp-color-primary) 72%, var(--rp-color-text));
}

.pw-nav-row.is-branch-active .pw-nav-toggle {
  color: var(--rp-color-primary);
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

.pw-nav-toggle {
  position: absolute;
  top: 50%;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--rp-color-text-muted);
  cursor: pointer;
  transform: translateY(-50%);

  &:hover {
    background: color-mix(in srgb, var(--rp-color-text-muted) 14%, transparent);
    color: var(--rp-color-text);
  }

  .is-open {
    transform: rotate(90deg);
  }
}

/* 子组件：缩进 + 一条短竖线做「归属」，不做梯子，避免和文字抢注意力 */
.pw-nav-children {
  position: relative;
  padding-left: 16px;

  &::before {
    content: '';
    position: absolute;
    /* 落在父页文字与子项文字之间（x=28），与子项选中药丸留 4px；
       从父页行底边起笔，覆盖整个子项区 */
    left: 12px;
    top: -2px;
    bottom: 1px;
    width: 2px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--rp-color-text-muted) 16%, transparent);
  }

  /* 当前页就在这一组里时，竖线跟着用品牌色，位置一眼可辨 */
  &:has(.is-active)::before {
    background: color-mix(in srgb, var(--rp-color-primary) 45%, transparent);
  }
}

.pw-sidebar__empty {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 16px 8px;
  color: var(--rp-color-text-muted);
  font-size: 12px;
}

.pw-sidebar__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 16px;
  border-top: 1px solid var(--rp-color-border);
  color: var(--rp-color-text-muted);
  font-size: 10.5px;
}
</style>
