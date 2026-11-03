import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'Minimal Lib',
  scenes: 'src/scenes',
  port: 5273,
  components: ['src/lib/**/*.vue'],
  groups: { button: 'Button', card: 'Card', internal: 'Internal' },
  editor: { preset: 'vscode' },
})
