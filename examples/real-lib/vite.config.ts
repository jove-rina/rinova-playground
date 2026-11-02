import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { playground } from '@rinova/playground-vite'

export default defineConfig({
  plugins: [vue(), tailwindcss(), playground()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
