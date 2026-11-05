import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'rinova-playground 文档',
  scenes: 'src/scenes',
  port: 5280,
  components: ['src/components/**/*.vue'],
  groups: { start: '开始', concepts: '概念', guide: '指南', reference: '参考' },
  editor: { preset: 'cursor' },
})
