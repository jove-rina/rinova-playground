import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Monaco 自己的 CSS 不进入我们的产物：
 * 它是浏览器端编辑器界面样式（≈380 KB），只在打开代码面板时才需要，
 * 单独发布成 dist/editor.css，由懒加载 chunk 里那句 `import '@rinova/playground/editor.css'` 引入。
 * 如果留在 bundle 里，lib 模式只能把它合并进 style.css，等于每个使用方首屏都要付这份体积。
 */
const stripMonacoCss = (): Plugin => {
  const EMPTY_ID = '\0rinova:empty-monaco-css'
  return {
    name: 'rinova:strip-monaco-css',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.endsWith('.css')) return null
      if (!importer || !importer.includes('monaco-editor')) return null
      return EMPTY_ID
    },
    load(id) {
      return id === EMPTY_ID ? 'export default ""' : null
    },
  }
}

export default defineConfig({
  plugins: [vue(), stripMonacoCss()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rolldownOptions: {
      // editor.css 是我们自己发布的分包样式，要留给使用方的打包器按需加载
      external: [
        'vue',
        'virtual:playground/config',
        'virtual:playground/scenes',
        'virtual:playground/editor-css',
        '@rinova/playground/editor.css',
      ],
      output: {
        assetFileNames: (assetInfo) => (assetInfo.name?.endsWith('.css') ? 'style.css' : 'assets/[name][extname]'),
      },
    },
    // lib 模式按 chunk 拆 CSS 时没有任何 JS 引用拆出来的文件，只能合成一个 style.css
    cssCodeSplit: false,
    minify: false,
    sourcemap: false,
    emptyOutDir: true,
  },
})
