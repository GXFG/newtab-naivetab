import eslint from '@eslint/js'
import globals from 'globals'
import { defineConfig } from 'eslint/config'
import eslintPluginVue from 'eslint-plugin-vue'
import typescriptEslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig(
  {
    ignores: [
      'node_modules',
      'extension',
      'site',
      'assets',
      'public',
      'lib',
      'test',
      '**/__tests__/**',
      'src/auto-imports.d.ts',
      'src/components.d.ts',
    ],
  },

  // 推荐配置
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],

  /**
   * 配置全局变量
   */
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        wx: true,
      },
    },
  },

  /**
   * 通用规则
   */
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: {
      'no-console': 'off',
      'linebreak-style': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty-function': 'off',
      'no-useless-assignment': 'off',
      'max-len': 'off',
      'no-plusplus': 'off',
      'no-continue': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'no-underscore-dangle': 'off',
      'object-curly-newline': 'off',
      'arrow-body-style': 'off',
      'prefer-destructuring': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/no-required-prop-with-default': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },

  /**
   * vue 规则
   */
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: typescriptEslint.parser, // typescript项目需要配置
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true, // 允许在.vue 文件中使用 JSX
        },
      },
    },
    rules: {
      'vue/no-mutating-props': [
        'error',
        {
          shallowOnly: true,
        },
      ],
    },
  },

  /**
   * prettier 配置，会合并根目录下的prettier.config.js 文件
   * @see https://prettier.io/docs/en/options
   */
  // eslint-plugin-prettier 将 Prettier 规则作为 ESLint 规则运行
  // eslint-config-prettier 禁用与 Prettier 冲突的 ESLint 规则
  prettierConfig,
  prettierRecommended,
)
