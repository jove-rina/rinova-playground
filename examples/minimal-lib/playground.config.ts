import { defineConfig } from '@rinova/playground'

export default defineConfig({
  title: 'Minimal Lib',
  scenes: 'src/scenes',
  port: 5273,
  components: ['src/lib/**/*.vue'],
  // 非组件文件：函数 / hooks / 常量的契约（进 API 页签 + manifest）
  modules: ['src/lib/**/*.ts'],
  // 供场景读取的公开常量（会明文进产物，不要放 token）
  globals: { apiBase: '/api', appName: 'Minimal Lib' },
  // 插件只写路径：配置会 JSON 序列化进虚拟模块，函数传不过去
  plugins: ['./src/playground/plugins.ts'],
  groups: {
    intro: '介绍',
    button: 'Button',
    card: 'Card',
    input: 'Input',
    table: 'Table',
    form: 'Form',
    utils: '工具与函数',
    plugins: '插件',
    internal: 'Internal',
  },
  editor: { preset: 'cursor' },
})
