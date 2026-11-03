<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '事件 press',
  order: 8,
  section: 'events',
  api: ['click', 'press'],
  description: 'click 是原生事件，press 是业务事件，带 variant 参数；点按钮看右侧出参。',
})
</script>
<script setup lang="ts">
import { ref } from 'vue'
import { MyButton, MyCard } from '../../../lib'
import { useSceneOutput } from '@rinova/playground'

const clicks = ref(0)
const last = ref<{ variant: string; at: string } | null>(null)

const onClick = (): void => {
  clicks.value += 1
}

const onPress = (variant: string): void => {
  last.value = { variant, at: new Date().toLocaleTimeString() }
}

useSceneOutput(() => ({ clicks: clicks.value, lastPress: last.value }))
</script>

<template>
  <MyCard title="事件" description="click 与 press 两个 emit">
    <div class="row">
      <MyButton @click="onClick" @press="onPress">主按钮</MyButton>
      <MyButton variant="ghost" @click="onClick" @press="onPress">次按钮</MyButton>
    </div>
    <p class="hint">click 次数：{{ clicks }}<span v-if="last">，最后一次 press：{{ last.variant }}</span></p>
  </MyCard>
</template>

<style scoped lang="less">
.row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.hint {
  margin: 0;
  color: #667085;
  font-size: 12px;
}
</style>
