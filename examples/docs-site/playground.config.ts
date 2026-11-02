import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'rinova-playground 文档',
  scenes: 'src/scenes',
  port: 5280,
  components: ['src/components/**/*.vue'],
})
