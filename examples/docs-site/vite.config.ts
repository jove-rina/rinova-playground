import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { playground } from '@rinova/playground-vite'

export default defineConfig({
  plugins: [vue(), playground()],
})
