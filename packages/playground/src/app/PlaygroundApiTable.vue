<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Copy } from '@lucide/vue'
import CodeBlock from '../code/CodeBlock.vue'
import { copyText } from '../code/clipboard'
import { toast } from '../components/toast'
import type { ComponentApi, SceneDescriptor } from '../types'

const props = defineProps<{
  contract: ComponentApi
  scenes: SceneDescriptor[]
  /** 要高亮的 API，格式 `props:disabled` */
  focus?: string
  /** pageMeta.apiNotes：补 JSDoc 覆盖不到的说明 */
  notes?: Record<string, string> | null
}>()

const emit = defineEmits<{ jump: [sceneName: string] }>()

type TabKey = 'props' | 'events' | 'slots' | 'exposed' | 'types'

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'props', label: 'Props' },
  { key: 'events', label: 'Events' },
  { key: 'slots', label: 'Slots' },
  { key: 'exposed', label: 'Exposes' },
  { key: 'types', label: 'Types' },
]

const tab = ref<TabKey>('props')

const typeDefs = computed(() => props.contract.types ?? [])

const counts = computed(() => ({
  props: props.contract.props.length,
  events: props.contract.events.length,
  slots: props.contract.slots.length,
  exposed: props.contract.exposed.length,
  types: typeDefs.value.length,
}))

const total = computed(
  () => counts.value.props + counts.value.events + counts.value.slots + counts.value.exposed
)
const undocumentedCount = computed(() => props.contract.undocumented.length)

const tabs = computed(() =>
  TAB_LABELS.filter((item) => counts.value[item.key] > 0).map((item) => ({ ...item, count: counts.value[item.key] }))
)

/** 某个 API 有哪些场景演示 */
const scenesOf = (kind: TabKey, name: string): SceneDescriptor[] =>
  props.scenes.filter((scene) => (scene.api ?? []).includes(name))

const notesOf = (kind: TabKey, name: string): string => props.notes?.[`${kind}:${name}`] ?? ''

/** 类型名 → 声明，供类型列点击跳转 */
const typeNames = computed(() => typeDefs.value.map((item) => item.name))

/** 类型字符串里引用到的具名类型（`TableColumn[]` → `TableColumn`） */
const linkedType = (text: string): string =>
  typeNames.value.find((name) => new RegExp(`\\b${name}\\b`).test(text)) ?? ''

const rows = computed(() => {
  if (tab.value === 'props') {
    return props.contract.props.map((item) => ({
      key: item.name,
      name: item.name,
      type: item.type,
      default: item.default,
      required: item.required,
      description: item.description || notesOf('props', item.name),
      signature: '',
      demos: scenesOf('props', item.name),
    }))
  }
  if (tab.value === 'events') {
    return props.contract.events.map((item) => ({
      key: item.name,
      name: item.name,
      type: item.type,
      default: '',
      required: false,
      description: item.description || notesOf('events', item.name),
      signature: item.signature,
      demos: scenesOf('events', item.name),
    }))
  }
  if (tab.value === 'slots') {
    return props.contract.slots.map((item) => ({
      key: item.name,
      name: item.name,
      type: item.type,
      default: '',
      required: false,
      description: item.description || notesOf('slots', item.name),
      signature: '',
      demos: scenesOf('slots', item.name),
    }))
  }
  if (tab.value === 'exposed') {
    return props.contract.exposed.map((item) => ({
      key: item.name,
      name: item.name,
      type: item.type,
      default: '',
      required: false,
      description: item.description || notesOf('exposed', item.name),
      signature: '',
      demos: scenesOf('exposed', item.name),
    }))
  }
  return []
})

/** 类型页签里当前高亮的类型 */
const focusedType = ref('')
const openType = async (name: string): Promise<void> => {
  tab.value = 'types'
  focusedType.value = name
  await nextTick()
  rootEl.value?.querySelector(`[data-type="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

/** 高亮来自场景内标签的点击 */
const highlighted = ref('')
const rootEl = ref<HTMLElement | null>(null)

watch(
  () => props.focus,
  async (value) => {
    if (!value) return
    const [kind, name] = value.split(':')
    if (kind && TAB_LABELS.some((item) => item.key === kind)) tab.value = kind as TabKey
    highlighted.value = name ?? ''
    await nextTick()
    rootEl.value?.querySelector(`[data-api="${CSS.escape(highlighted.value)}"]`)?.scrollIntoView({ block: 'center' })
  },
  { immediate: true }
)

const copyType = async (text: string): Promise<void> => {
  if (!text) return
  const ok = await copyText(text)
  toast(ok ? `已复制 ${text}` : '复制失败')
}
</script>

<template>
  <section ref="rootEl" class="pw-api">
    <header class="pw-api__head">
      <div class="pw-api__title">
        <span class="pw-api__name">{{ contract.name }}</span>
        <span class="pw-api__meta">
          {{ total }} 个 API
          <template v-if="undocumentedCount"> · <span class="pw-api__warn">{{ undocumentedCount }} 个缺说明</span></template>
        </span>
      </div>
      <div class="pw-api__tabs">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          class="pw-api__tab"
          :class="{ 'is-active': tab === item.key }"
          @click="tab = item.key"
        >
          {{ item.label }}
          <span class="pw-api__count">{{ item.count }}</span>
        </button>
      </div>
    </header>

    <div class="pw-api__body">
      <table v-if="tab !== 'types'" class="pw-api__table" :class="{ 'is-props': tab === 'props' }">
        <thead>
          <tr>
            <th class="pw-api__col-name">名称</th>
            <th class="pw-api__col-type">类型</th>
            <th v-if="tab === 'props'" class="pw-api__col-default">默认值</th>
            <th>说明</th>
            <th class="pw-api__col-demo">演示</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.key"
            :data-api="row.name"
            :class="{ 'is-missing': !row.description, 'is-focus': row.name === highlighted }"
          >
            <td class="pw-api__name-cell">
              <div class="pw-api__name-line">
                <code>{{ row.name }}</code>
                <span v-if="row.required" class="pw-api__required">必填</span>
              </div>
            </td>
            <td>
              <button
                v-if="linkedType(row.type)"
                type="button"
                class="pw-api__type is-link"
                :title="`查看 ${linkedType(row.type)} 定义`"
                @click="openType(linkedType(row.type))"
              >
                {{ row.type }}
              </button>
              <button
                v-else-if="row.type"
                type="button"
                class="pw-api__type"
                :title="`复制 ${row.type}`"
                @click="copyType(row.type)"
              >
                {{ row.type }}
              </button>
              <span v-else class="pw-api__empty">—</span>
              <div v-if="row.signature && row.signature !== row.type" class="pw-api__signature">{{ row.signature }}</div>
            </td>
            <td v-if="tab === 'props'" class="pw-api__default" :title="row.default">
              <span v-if="row.default">{{ row.default }}</span>
              <span v-else class="pw-api__empty">—</span>
            </td>
            <td class="pw-api__desc">
              <template v-if="row.description">{{ row.description }}</template>
              <span v-else class="pw-api__empty" title="补 JSDoc 就会显示在这里">缺说明</span>
            </td>
            <td class="pw-api__demo-cell">
              <div class="pw-api__demo">
                <button
                  v-for="demo in row.demos"
                  :key="demo.id"
                  type="button"
                  class="pw-api__demo-link"
                  @click="emit('jump', demo.name)"
                >
                  {{ demo.title }}
                </button>
                <span v-if="!row.demos.length" class="pw-api__empty">无</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="pw-api__types">
        <article
          v-for="item in typeDefs"
          :key="item.name"
          class="pw-api__type-card"
          :class="{ 'is-focus': item.name === focusedType }"
          :data-type="item.name"
        >
          <header class="pw-api__type-head">
            <code class="pw-api__type-name">{{ item.name }}</code>
            <span class="pw-api__type-kind">{{ item.kind }}</span>
            <span class="pw-api__type-file" :title="item.file">{{ item.file }}</span>
            <button type="button" class="pw-api__copy" :title="`复制 ${item.name} 定义`" @click="copyType(item.code)">
              <Copy :size="12" :stroke-width="2" />
              复制
            </button>
          </header>
          <CodeBlock :code="item.code" lang="ts" />
        </article>
      </div>
    </div>
  </section>
</template>
