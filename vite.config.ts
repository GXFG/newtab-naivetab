/// <reference types="vitest" />

import { resolve } from 'node:path'
import { defineConfig, type UserConfig, type PluginOption } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import UnoCSS from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Markdown from 'unplugin-vue-markdown/vite'
import postcssPresetEnv from 'postcss-preset-env'
import { visualizer } from 'rollup-plugin-visualizer'
import { isDev, port, r } from './scripts/utils'
import packageJson from './package.json'

export const sharedConfig: UserConfig = {
  root: r('src'),
  resolve: {
    alias: {
      '~/': `${r('src')}/`,
      '@/': `${r('src')}/`,
      'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js',
    },
  },
  define: {
    __DEV__: isDev,
    __NAME__: JSON.stringify(packageJson.name),
  },
  css: {
    postcss: {
      plugins: [postcssPresetEnv()],
    },
  },
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    VueI18nPlugin({
      include: resolve(__dirname, './src/locales/**'),
    }),
    Markdown({}),
    AutoImport({
      imports: ['vue', { 'webextension-polyfill': [['*', 'browser']] }, { dayjs: [['default', 'dayjs']] }],
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
          prefix: '',
        }),
        NaiveUiResolver(),
      ],
    }),
    UnoCSS(), // https://github.com/unocss/unocss
    Icons(), // https://github.com/antfu/unplugin-icons

    // html内引用的资源直接存储在/extension/assets, 无需转换
    // rewrite assets to use relative path
    // {
    //   name: 'assets-rewrite',
    //   enforce: 'post',
    //   apply: 'build',
    //   transformIndexHtml(html, { path }) {
    //     return html.replace(/"\/assets\//g, `"${relative(dirname(path), '/assets')}/`)
    //   },
    // },
  ],
  optimizeDeps: {
    include: ['vue', '@vueuse/core', 'webextension-polyfill'],
    exclude: ['vue-demi'],
  },
}

export default defineConfig(({ command }) => ({
  ...sharedConfig,
  plugins: sharedConfig.plugins?.concat(visualizer() as PluginOption),
  base: command === 'serve' ? `http://localhost:${port}/` : '/dist/',
  server: {
    port,
    hmr: {
      host: 'localhost',
    },
  },
  build: {
    target: 'esnext',
    watch: isDev ? {} : undefined,
    outDir: r('extension/dist'),
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    // https://developer.chrome.com/docs/webstore/program_policies/#:~:text=Code%20Readability%20Requirements
    // terserOptions: {
    //   mangle: false,
    // },
    rollupOptions: {
      input: {
        newtab: r('src/newtab/index.html'),
        popup: r('src/popup/index.html'),
      },
      output: {
        manualChunks(id) {
          // vendor 分包规则
          if (id.includes('node_modules')) {
            if (id.includes('naive-ui')) {
              return 'vendor-naive-ui'
            }
            if (id.includes('lunar-typescript')) {
              return 'vendor-lunar'
            }
            if (['vue', '@vueuse/core', 'lodash-es', 'cheerio', 'axios', 'dayjs', 'driver.js'].some((pkg) => id.includes(pkg))) {
              return 'vendor-libs'
            }
            return 'vendor-other'
          }

          if (id.includes('vite/modulepreload-polyfill')) {
            return 'vendor-libs'
          }

          if (['src/components', 'src/logic', 'src/lib', '~icon'].some((pkg) => id.includes(pkg))) {
            return 'main'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // minify: false, // 关闭压缩混淆（同时禁用 terser），debug时使用
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
}))
