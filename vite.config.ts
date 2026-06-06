/// <reference types="vitest" />

import { resolve } from 'node:path'
import { defineConfig, type UserConfig, type PluginOption } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Markdown from 'unplugin-vue-markdown/vite'
import postcssPresetEnv from 'postcss-preset-env'
import { visualizer } from 'rollup-plugin-visualizer'
import { isDev, port, r, BROWSER_DIR } from './scripts/utils'
import packageJson from './package.json'

export const sharedConfig: UserConfig = {
  root: r('src'),
  cacheDir: r('node_modules/.vite'),
  resolve: {
    alias: {
      '@/': `${r('src')}/`,
    },
  },
  define: {
    __DEV__: isDev,
    __APP_NAME__: JSON.stringify(packageJson.name),
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  css: {
    postcss: {
      plugins: [
        postcssPresetEnv({ stage: 3, features: { 'nesting-rules': true } }),
      ],
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
          prefix: '',
        }),
      ],
    }),
    Icons(), // https://github.com/antfu/unplugin-icons

    /**
     * Firefox 构建时需要注入 favicon link，否则标签页上没有图标
     * Chrome 构建时不注入，避免与 manifest.json 中的 icons 冲突导致Edge不展示图标的问题
     */
    {
      name: 'firefox-favicon-inject',
      transformIndexHtml(html) {
        if (process.env.BROWSER === 'firefox') {
          return html.replace(
            '</head>',
            '  <link rel="icon" href="/assets/img/icon/icon.svg" />\n</head>',
          )
        }
        return html
      },
    },

    // 打包分析工具，通过 pnpm analyze 触发
    ...(process.env.ANALYZE ? [visualizer()] : []),
  ],
  optimizeDeps: {
    include: [
      'vue',
      '@vueuse/core',
      'webextension-polyfill',
      'reka-ui',
      'vue-i18n',
    ],
    exclude: ['vue-demi'],
  },
}

export default defineConfig(({ command }) => ({
  ...sharedConfig,
  plugins: sharedConfig.plugins,
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
    outDir: r(`${BROWSER_DIR}/dist`),
    emptyOutDir: false, // 保留未由 Vite 处理的静态资源
    sourcemap: isDev ? 'inline' : false,
    minify: process.env.NO_MINIFY ? false : 'esbuild',
    chunkSizeWarningLimit: 1000,
    // https://developer.chrome.com/docs/webstore/program_policies/#:~:text=Code%20Readability%20Requirements
    // terserOptions: {
    //   mangle: false,
    // },
    rollupOptions: {
      input: {
        newtab: r('src/newtab/index.html'),
        popup: r('src/popup/index.html'),
        options: r('src/options/index.html'),
      },
      output: {
        manualChunks(id) {
          // 浏览器扩展从本地磁盘加载，无网络请求开销，chunk 不宜过多
          if (id.includes('node_modules')) {
            if (id.includes('lunar-typescript')) {
              return 'vendor-lunar'
            }
            // 其余第三方依赖统一归入一个 vendor chunk
            return 'vendor-libs'
          }

          // 业务代码统一归入 main chunk，避免碎片化
          if (
            ['src/components', 'src/logic', 'src/lib', '~icon'].some((pkg) =>
              id.includes(pkg),
            )
          ) {
            return 'main'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../test/setup.ts'],
    coverage: {
      reportsDirectory: '../coverage',
    },
  },
}))
