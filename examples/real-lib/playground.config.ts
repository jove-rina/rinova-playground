import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'shadcn-vue · 真实组件库',
  scenes: 'src/scenes',
  port: 5281,
  components: ['src/components/ui/**/*.vue'],
})
