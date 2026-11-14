/// <reference types="vitest" />

import { resolve } from 'node:path'
import { defineConfig, type UserConfig, type PluginOption } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Markdown from 'unplugin-vue-markdown/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { isDev, port, r, BROWSER_DIR } from './scripts/utils.ts'
import packageJson from './package.json' with { type: 'json' }

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
  // CSS 不再经过 postcss-preset-env：浏览器基线（Chrome 112+ / Firefox gecko 130+）
  // 已原生支持 CSS 嵌套，构建期降级反而按无人配置的默认 browserslist 盲目改写产物。
  // 若未来引入需要降级的特性，先在 manifest 里收紧基线，再选带明确 browserslist 的工具。
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),
    VueI18nPlugin({
      include: resolve(import.meta.dirname, './src/locales/**'),
    }),
    Markdown({}),
    AutoImport({
      imports: ['vue', { dayjs: [['default', 'dayjs']] }],
      dts: r('src/auto-imports.d.ts'),
    }),
    // https://github.com/antfu/unplugin-vue-components
    Components({
      dirs: [r('src/components')],
      // generate `components.d.ts` for ts support with Volar
      dts: r('src/components.d.ts'),
      deep: true,
    }),

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
    include: ['vue', '@vueuse/core', 'reka-ui', 'vue-i18n'],
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
    // 扩展从本地磁盘加载，不做分包（体积与请求数都不是关注点）。
    // 注意：Vite 8 底层是 rolldown，函数式 output.manualChunks 已不生效，
    chunkSizeWarningLimit: 3000,
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
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    // Vitest 5 起该默认值改为 true（每个测试前清空 mock 调用历史）。
    // setup.ts 的 vi.restoreAllMocks() 已做更强清理，这里显式写出以钉住语义：
    // 后续版本若再改默认值，测试行为不会静默漂移。
    clearMocks: true,
    setupFiles: ['../test/setup.ts'],
    coverage: {
      reportsDirectory: '../coverage',
      /**
       * 覆盖率门槛：只防倒退，不逼补历史。
       *
       * 基线（2026-11 实测，被统计 86 个文件）：
       *   全局      lines 74.8 / branches 63.8 / functions 76.4
       *   src/logic lines 74.9 / branches 65.4 / functions 77.6
       * 阈值取基线以下约 4 个百分点：能容忍正常波动，又能拦住「新增大块零测试代码」。
       *
       * 口径：只统计被测试触达的文件（未设 include），测试文件本身不计入。
       * 若后续需要「未被任何测试 import 的新文件也计入分母」，需设置
       * coverage.include，但那会把全部 .vue 计入（当前 0 覆盖），届时需重新定基线。
       */
      thresholds: {
        lines: 70,
        branches: 59,
        functions: 71,
        statements: 70,
        'logic/**/*.ts': {
          lines: 71,
          branches: 61,
          functions: 73,
          statements: 71,
        },
      },
    },
  },
}))
