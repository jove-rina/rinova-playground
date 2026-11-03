<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Copy } from '@lucide/vue'
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

type TabKey = 'props' | 'events' | 'slots' | 'exposed'

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'props', label: 'Props' },
  { key: 'events', label: 'Events' },
  { key: 'slots', label: 'Slots' },
  { key: 'exposed', label: 'Exposes' },
]

const tab = ref<TabKey>('props')

const counts = computed(() => ({
  props: props.contract.props.length,
  events: props.contract.events.length,
  slots: props.contract.slots.length,
  exposed: props.contract.exposed.length,
}))

const total = computed(() => Object.values(counts.value).reduce((sum, value) => sum + value, 0))
const undocumentedCount = computed(() => props.contract.undocumented.length)

const tabs = computed(() =>
  TAB_LABELS.filter((item) => counts.value[item.key] > 0).map((item) => ({ ...item, count: counts.value[item.key] }))
)

/** 某个 API 有哪些场景演示 */
const scenesOf = (kind: TabKey, name: string): SceneDescriptor[] =>
  props.scenes.filter((scene) => (scene.api ?? []).includes(name))

const notesOf = (kind: TabKey, name: string): string => props.notes?.[`${kind}:${name}`] ?? ''

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
      fields: item.fields ?? [],
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
      fields: item.fields ?? [],
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
      fields: [],
      demos: scenesOf('slots', item.name),
    }))
  }
  return props.contract.exposed.map((item) => ({
    key: item.name,
    name: item.name,
    type: item.type,
    default: '',
    required: false,
    description: item.description || notesOf('exposed', item.name),
    signature: '',
    fields: [],
    demos: scenesOf('exposed', item.name),
  }))
})

/** 对象类型 prop 的字段展开 */
const expanded = ref<Record<string, boolean>>({})
const toggleFields = (key: string): void => {
  expanded.value = { ...expanded.value, [key]: !expanded.value[key] }
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

    <table class="pw-api__table">
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
        <template v-for="row in rows" :key="row.key">
        <tr
          :data-api="row.name"
          :class="{ 'is-missing': !row.description, 'is-focus': row.name === highlighted }"
        >
          <td class="pw-api__name-cell">
            <div class="pw-api__name-line">
              <code>{{ row.name }}</code>
              <span v-if="row.required" class="pw-api__required">必填</span>
            </div>
            <button
              v-if="row.fields.length"
              type="button"
              class="pw-api__expand"
              @click="toggleFields(row.key)"
            >
              {{ expanded[row.key] ? '▾' : '▸' }} {{ row.fields.length }} 个字段
            </button>
          </td>
          <td>
            <button type="button" class="pw-api__type" :title="`复制 ${row.type}`" @click="copyType(row.type)">
              {{ row.type || '—' }}
            </button>
            <div v-if="row.signature && row.signature !== row.type" class="pw-api__signature">{{ row.signature }}</div>
          </td>
          <td v-if="tab === 'props'" class="pw-api__default">{{ row.default || '—' }}</td>
          <td class="pw-api__desc">
            <template v-if="row.description">{{ row.description }}</template>
            <span v-else class="pw-api__missing">补 JSDoc 就会显示在这里</span>
          </td>
          <td class="pw-api__demo">
            <button
              v-for="demo in row.demos"
              :key="demo.id"
              type="button"
              class="pw-api__demo-link"
              @click="emit('jump', demo.name)"
            >
              {{ demo.title }}
            </button>
            <span v-if="!row.demos.length" class="pw-api__no-demo">无</span>
          </td>
        </tr>
        <tr v-if="row.fields.length && expanded[row.key]" :key="`${row.key}-fields`" class="pw-api__fields-row">
          <td :colspan="tab === 'props' ? 5 : 4">
            <table class="pw-api__fields">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>类型</th>
                  <th class="pw-api__fields-required">必填</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="field in row.fields" :key="field.name" :class="{ 'is-missing': !field.description }">
                  <td><code>{{ field.name }}</code></td>
                  <td><span class="pw-api__field-type">{{ field.type }}</span></td>
                  <td class="pw-api__fields-required">{{ field.required ? '是' : '否' }}</td>
                  <td>
                    <template v-if="field.description">{{ field.description }}</template>
                    <span v-else class="pw-api__missing">补 JSDoc 就会显示在这里</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        </template>
      </tbody>
    </table>
  </section>
</template>

<style scoped lang="less">
.pw-api {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__head {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__title {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  &__name {
    font-size: 15px;
    font-weight: 600;
  }

  &__meta {
    color: var(--rp-color-text-muted);
    font-size: 12px;
  }

  &__warn {
    color: var(--rp-color-warning);
  }

  &__tabs {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  &__tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--rp-color-border);
    border-radius: 999px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      color: var(--rp-color-text);
    }

    &.is-active {
      border-color: var(--rp-color-primary);
      background: color-mix(in srgb, var(--rp-color-primary) 10%, transparent);
      color: var(--rp-color-primary);
    }
  }

  &__count {
    color: inherit;
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }

  th {
    padding: 8px 10px;
    border-bottom: 1px solid var(--rp-color-border);
    color: var(--rp-color-text-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-align: left;
    text-transform: uppercase;
  }

  td {
    padding: 8px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--rp-color-border) 60%, transparent);
    vertical-align: top;
  }

  tr.is-focus td {
    background: color-mix(in srgb, var(--rp-color-primary) 8%, transparent);
  }

  tr.is-missing .pw-api__desc {
    color: var(--rp-color-text-muted);
  }

  &__col-type {
    width: 32%;
  }

  &__col-default {
    width: 12%;
  }

  &__col-demo {
    width: 18%;
  }

  &__name-cell code {
    font-family: var(--rp-font-mono);
    font-size: 12px;
  }

  &__name-line {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__expand {
    margin-top: 4px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--rp-color-primary);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  &__fields-row > td {
    padding: 0 10px 10px 26px;
    background: color-mix(in srgb, var(--rp-color-surface) 60%, transparent);
  }

  &__fields {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;

    th {
      padding: 6px 8px;
      border-bottom: 1px solid var(--rp-color-border);
      color: var(--rp-color-text-muted);
      font-size: 10.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    td {
      padding: 6px 8px;
      border-bottom: 1px solid color-mix(in srgb, var(--rp-color-border) 45%, transparent);
    }

    code {
      font-family: var(--rp-font-mono);
      font-size: 11.5px;
    }
  }

  &__field-type {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11px;
    word-break: break-word;
  }

  &__fields-required {
    width: 56px;
    color: var(--rp-color-text-muted);
    text-align: center;
  }

  &__required {
    margin-left: 6px;
    padding: 0 5px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--rp-color-danger) 12%, transparent);
    color: var(--rp-color-danger);
    font-size: 10px;
  }

  &__type {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--rp-color-text);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
    text-align: left;
    cursor: copy;
    word-break: break-word;

    &:hover {
      color: var(--rp-color-primary);
    }
  }

  &__signature {
    margin-top: 3px;
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 10.5px;
    word-break: break-all;
  }

  &__default {
    color: var(--rp-color-text-muted);
    font-family: var(--rp-font-mono);
    font-size: 11.5px;
  }

  &__desc {
    color: var(--rp-color-text);
  }

  &__missing {
    color: var(--rp-color-warning);
    font-size: 11.5px;
  }

  &__demo {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__demo-link {
    padding: 1px 7px;
    border: 1px solid var(--rp-color-border);
    border-radius: 999px;
    background: transparent;
    color: var(--rp-color-text-muted);
    font: inherit;
    font-size: 11px;
    cursor: pointer;

    &:hover {
      border-color: var(--rp-color-primary);
      color: var(--rp-color-primary);
    }
  }

  &__no-demo {
    color: var(--rp-color-text-muted);
    font-size: 11px;
  }
}
</style>
