import { dirname, relative, resolve } from 'path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import vueI18n from '@intlify/vite-plugin-vue-i18n'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Markdown from 'vite-plugin-md'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import WindiCSS from 'vite-plugin-windicss'
// import visualizer from 'rollup-plugin-visualizer'
import windiConfig from './windi.config'
import { r, port, isDev } from './scripts/utils'

export const sharedConfig: UserConfig = {
  root: r('src'),
  resolve: {
    alias: {
      '@/': `${r('src')}/`,
      'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js',
    },
  },
  define: {
    __DEV__: isDev,
  },
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),

    vueI18n({
      include: resolve(__dirname, './src/locales/**'),
    }),

    Markdown(),

    AutoImport({
      imports: [
        'vue',
        { 'webextension-polyfill': [['*', 'browser']] },
        { dayjs: [['default', 'dayjs']] },
      ],
      dts: r('src/auto-imports.d.ts'),
    }),

    // https://github.com/antfu/unplugin-vue-components
    Components({
      dirs: [r('src/components')],
      // generate `components.d.ts` for ts support with Volar
      dts: r('src/components.d.ts'),
      deep: true,
      resolvers: [
        // auto import icons
        IconsResolver({
          componentPrefix: '',
        }),
        NaiveUiResolver(),
      ],
    }),

    // https://github.com/antfu/unplugin-icons
    Icons(),

    // rewrite assets to use relative path
    {
      name: 'assets-rewrite',
      enforce: 'post',
      apply: 'build',
      transformIndexHtml(html, { path }) {
        return html.replace(/"\/assets\//g, `"${relative(dirname(path), '/assets')}/`)
      },
    },

    // visualizer(),
  ],
  optimizeDeps: {
    include: [
      'vue',
      '@vueuse/core',
      'webextension-polyfill',
    ],
    exclude: [
      'vue-demi',
    ],
  },
}

export default defineConfig(({ command }) => ({
  ...sharedConfig,
  base: command === 'serve' ? `http://localhost:${port}/` : '/dist/',
  server: {
    port,
    hmr: {
      host: 'localhost',
    },
  },
  build: {
    outDir: r('extension/dist'),
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    // minify: 'terser',
    // terserOptions: {
    //   mangle: false, // https://developer.chrome.com/docs/webstore/program_policies/#:~:text=Code%20Readability%20Requirements
    // },
    rollupOptions: {
      input: {
        // background: r('src/background/index.html'),
        newtab: r('src/newtab/index.html'),
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    ...sharedConfig.plugins!,

    // https://github.com/antfu/vite-plugin-windicss
    WindiCSS({
      config: windiConfig,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
}))
