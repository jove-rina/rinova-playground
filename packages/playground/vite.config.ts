import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rolldownOptions: {
      external: ['vue', 'virtual:playground/config', 'virtual:playground/scenes'],
      output: {
        assetFileNames: (assetInfo) => (assetInfo.name?.endsWith('.css') ? 'style.css' : 'assets/[name][extname]'),
      },
    },
    // lib 模式不支持为每个 chunk 单独引用 CSS，统一合成一个 style.css 供使用方一次引入
    cssCodeSplit: false,
    minify: false,
    sourcemap: false,
    emptyOutDir: true,
  },
})
