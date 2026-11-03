import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'shadcn-vue · 真实组件库',
  scenes: 'src/scenes',
  port: 5281,
  components: ['src/components/ui/**/*.vue'],
  groups: { action: '操作', display: '展示', form: '表单' },
  editor: { preset: 'cursor' },
})
