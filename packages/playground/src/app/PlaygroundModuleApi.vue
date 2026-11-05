<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Copy } from '@lucide/vue'
import CodeBlock from '../code/CodeBlock.vue'
import { copyText } from '../code/clipboard'
import { toast } from '../components/toast'
import type { ModuleApi } from '../module-api'
import type { SceneDescriptor } from '../types'

/**
 * 非组件模块的 API 视图：函数 / 常量 / 类型。
 * 外观与组件 API 表（PlaygroundApiTable）共用 styles/api.less —— 同一套表头、列、空值胶囊与交互。
 */
const props = defineProps<{ module: ModuleApi; scenes?: SceneDescriptor[] }>()
const emit = defineEmits<{ jump: [scene: string] }>()

type TabId = 'functions' | 'constants' | 'types'
const tab = ref<TabId>('functions')

const tabs = computed(() =>
  [
    { id: 'functions' as TabId, label: 'Functions', count: props.module.functions.length },
    { id: 'constants' as TabId, label: 'Constants', count: props.module.constants.length },
    { id: 'types' as TabId, label: 'Types', count: props.module.types.length },
  ].filter((item) => item.count > 0)
)

/** 与组件 API 表一致：只列有内容的页签，当前页签失效时回落到第一个 */
const activeTab = computed<TabId>(() =>
  tabs.value.some((item) => item.id === tab.value) ? tab.value : (tabs.value[0]?.id ?? 'functions')
)

const total = computed(() => props.module.functions.length + props.module.constants.length)
const missing = computed(() => props.module.uncovered.length)

const typeNames = computed(() => props.module.types.map((item) => item.name))
/** 类型字符串里引用到的具名类型（`FormatMoneyOptions` → 可跳转） */
const linkedType = (text: string): string =>
  typeNames.value.find((name) => new RegExp(`\\b${name}\\b`).test(text)) ?? ''

const rootEl = ref<HTMLElement | null>(null)
const focusedType = ref('')

const openType = async (name: string): Promise<void> => {
  tab.value = 'types'
  focusedType.value = name
  await nextTick()
  rootEl.value?.querySelector(`[data-type="${CSS.escape(name)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

const copyType = async (text: string): Promise<void> => {
  if (!text) return
  const ok = await copyText(text)
  toast(ok ? `已复制 ${text}` : '复制失败')
}

/** 场景 id → 标题（表里的「场景」列用标题更可读） */
const sceneTitle = (id: string): string =>
  props.scenes?.find((scene) => scene.id === id)?.title ?? id.split('/').pop() ?? id
</script>

<template>
  <section ref="rootEl" class="pw-api">
    <header class="pw-api__head">
      <div class="pw-api__title">
        <span class="pw-api__name">{{ module.name }}</span>
        <span class="pw-api__meta">
          {{ total }} 个导出
          <template v-if="missing"> · <span class="pw-api__warn">{{ missing }} 个无场景</span></template>
          <span class="pw-api__rel">{{ module.rel }}</span>
        </span>
      </div>
      <div class="pw-api__tabs">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          class="pw-api__tab"
          :class="{ 'is-active': activeTab === item.id }"
          @click="tab = item.id"
        >
          {{ item.label }}
          <span class="pw-api__count">{{ item.count }}</span>
        </button>
      </div>
    </header>

    <div class="pw-api__body">
      <table v-if="activeTab === 'functions'" class="pw-api__table is-functions">
        <thead>
          <tr>
            <th class="pw-api__col-name">名称</th>
            <th>参数</th>
            <th class="pw-api__col-type">返回</th>
            <th>说明</th>
            <th class="pw-api__col-demo">场景</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fn in module.functions" :key="fn.name" :data-api="fn.name">
            <td class="pw-api__name-cell">
              <div class="pw-api__name-line">
                <code>{{ fn.name }}</code>
                <span class="pw-api__required">{{ fn.kind === 'hook' ? 'HOOK' : 'FUNCTION' }}</span>
              </div>
              <div class="pw-api__signature">{{ fn.signature }}</div>
            </td>
            <td class="pw-api__params">
              <div v-for="param in fn.params" :key="param.name" class="pw-api__param">
                <code>{{ param.name }}</code>
                <span class="pw-api__param-type">{{ param.type }}{{ param.optional && !param.default ? '?' : '' }}</span>
                <span v-if="param.default" class="pw-api__param-default">= {{ param.default }}</span>
                <div v-if="param.description" class="pw-api__param-desc">{{ param.description }}</div>
              </div>
              <span v-if="!fn.params.length" class="pw-api__empty">无参数</span>
            </td>
            <td>
              <button
                v-if="linkedType(fn.returns)"
                type="button"
                class="pw-api__type is-link"
                :title="`查看 ${linkedType(fn.returns)} 定义`"
                @click="openType(linkedType(fn.returns))"
              >
                {{ fn.returns }}
              </button>
              <button
                v-else-if="fn.returns"
                type="button"
                class="pw-api__type"
                :title="`复制 ${fn.returns}`"
                @click="copyType(fn.returns)"
              >
                {{ fn.returns }}
              </button>
              <span v-else class="pw-api__empty">—</span>
            </td>
            <td class="pw-api__desc">
              <template v-if="fn.description">{{ fn.description }}</template>
              <span v-else class="pw-api__empty" title="补 JSDoc 就会显示在这里">缺说明</span>
            </td>
            <td class="pw-api__demo-cell">
              <div class="pw-api__demo">
                <button
                  v-for="scene in fn.coveredBy ?? []"
                  :key="scene"
                  type="button"
                  class="pw-api__demo-link"
                  @click="emit('jump', scene)"
                >
                  {{ sceneTitle(scene) }}
                </button>
                <span v-if="!(fn.coveredBy ?? []).length" class="pw-api__empty">无</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else-if="activeTab === 'constants'" class="pw-api__table">
        <thead>
          <tr>
            <th class="pw-api__col-name">名称</th>
            <th class="pw-api__col-type">类型</th>
            <th class="pw-api__col-default">值</th>
            <th>说明</th>
            <th class="pw-api__col-demo">场景</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in module.constants" :key="item.name" :data-api="item.name">
            <td class="pw-api__name-cell">
              <div class="pw-api__name-line">
                <code>{{ item.name }}</code>
              </div>
            </td>
            <td>
              <button
                v-if="linkedType(item.type)"
                type="button"
                class="pw-api__type is-link"
                :title="`查看 ${linkedType(item.type)} 定义`"
                @click="openType(linkedType(item.type))"
              >
                {{ item.type }}
              </button>
              <button
                v-else-if="item.type"
                type="button"
                class="pw-api__type"
                :title="`复制 ${item.type}`"
                @click="copyType(item.type)"
              >
                {{ item.type }}
              </button>
              <span v-else class="pw-api__empty">—</span>
            </td>
            <td class="pw-api__default" :title="item.value">
              <span v-if="item.value">{{ item.value }}</span>
              <span v-else class="pw-api__empty">—</span>
            </td>
            <td class="pw-api__desc">
              <template v-if="item.description">{{ item.description }}</template>
              <span v-else class="pw-api__empty" title="补 JSDoc 就会显示在这里">缺说明</span>
            </td>
            <td class="pw-api__demo-cell">
              <div class="pw-api__demo">
                <button
                  v-for="scene in item.coveredBy ?? []"
                  :key="scene"
                  type="button"
                  class="pw-api__demo-link"
                  @click="emit('jump', scene)"
                >
                  {{ sceneTitle(scene) }}
                </button>
                <span v-if="!(item.coveredBy ?? []).length" class="pw-api__empty">无</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="pw-api__types">
        <article
          v-for="item in module.types"
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
