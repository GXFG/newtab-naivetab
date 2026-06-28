import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync } from 'fs'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'

export default defineConfig({
  base: '/newtab-naivetab/',
  plugins: [
    vue(),
    VueI18n({
      include: resolve(__dirname, 'src/i18n/locales/**'),
      compositionOnly: true,
      fullInstall: true,
      strictMessage: false,
    }),
    {
      name: 'spa-404',
      writeBundle() {
        const outDir = resolve(__dirname, 'dist')
        copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
      },
    },
  ],
  root: resolve(__dirname),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@site': resolve(__dirname, 'src'),
    },
  },
})
