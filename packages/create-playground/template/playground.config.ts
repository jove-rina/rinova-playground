import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: '{{projectName}}',
  scenes: 'src/scenes',
  port: 5273,
  // 契约清单：扫组件 props，产出 .playground/{manifest.json,llms.txt,coverage.md}
  groups: { button: 'Button', card: 'Card' },
  editor: { preset: 'vscode' },
  components: ['src/components/**/*.vue'],
})
