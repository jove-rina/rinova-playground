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
      external: ['vue', 'virtual:playground/config', 'virtual:playground/scenes', 'virtual:playground/api'],
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