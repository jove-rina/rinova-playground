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
    cssCodeSplit: false,
    minify: false,
    sourcemap: true,
    emptyOutDir: true,
  },
})
