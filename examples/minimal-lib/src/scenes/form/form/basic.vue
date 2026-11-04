<script lang="ts">
import { defineSceneMeta } from '@rinova/playground'

export const sceneMeta = defineSceneMeta({
  title: '基础用法',
  order: 1,
  section: 'overview',
  description: '三个字段 + 校验 + 提交；右侧输出能同时看到值、错误和提交结果。',
})
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSceneArgs, useSceneOutput } from '@rinova/playground'
import { MyButton, MyCard, MyInput } from '../../../lib'

const args = useSceneArgs(
  { size: 'md' as 'sm' | 'md', submitText: '提交', disableSubmit: false },
  { options: { size: ['sm', 'md'] }, labels: { size: '输入框尺寸', submitText: '按钮文案', disableSubmit: '禁用提交' } }
)

const form = ref({ name: '', email: '', remark: '' })
const submitted = ref<Record<string, string> | null>(null)

const errors = computed(() => {
  const list: string[] = []
  if (!form.value.name.trim()) list.push('姓名不能为空')
  if (!form.value.email.includes('@')) list.push('邮箱格式不对')
  return list
})

const valid = computed(() => errors.value.length === 0)

const submit = (): void => {
  if (!valid.value) return
  submitted.value = { ...form.value, at: new Date().toLocaleTimeString() }
}

const reset = (): void => {
  form.value = { name: '', email: '', remark: '' }
  submitted.value = null
}

useSceneOutput(() => ({
  values: form.value,
  errors: errors.value,
  submitted: submitted.value,
}))
</script>

<template>
  <MyCard title="新建联系人" description="必填：姓名、邮箱" padding="md">
    <div class="form">
      <label class="field">
        <span class="label">姓名</span>
        <MyInput v-model="form.name" :size="args.size" placeholder="张三" clearable />
      </label>
      <label class="field">
        <span class="label">邮箱</span>
        <MyInput v-model="form.email" :size="args.size" placeholder="name@example.com" clearable />
      </label>
      <label class="field">
        <span class="label">备注</span>
        <MyInput v-model="form.remark" :size="args.size" placeholder="选填" />
      </label>
      <p v-if="errors.length" class="errors">{{ errors.join('，') }}</p>
      <p v-else-if="submitted" class="ok">已提交：{{ submitted.name }} / {{ submitted.email }}</p>
    </div>

    <template #footer>
      <div class="actions">
        <span class="hint">{{ form.name.length + form.email.length + form.remark.length }} 字</span>
        <MyButton size="sm" variant="ghost" @click="reset">重置</MyButton>
        <MyButton size="sm" :disabled="!valid || args.disableSubmit" @click="submit">
          {{ args.submitText }}
        </MyButton>
      </div>
    </template>
  </MyCard>
</template>

<style scoped lang="less">
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  flex: 0 0 48px;
  color: #667085;
  font-size: 12px;
}

.errors {
  margin: 0;
  color: #d92d20;
  font-size: 12px;
}

.ok {
  margin: 0;
  color: #067647;
  font-size: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint {
  margin-right: auto;
  color: #98a2b3;
  font-size: 11.5px;
}
</style>
