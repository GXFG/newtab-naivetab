import eslint from '@eslint/js'
import globals from 'globals'
import { defineConfig } from 'eslint/config'
import eslintPluginVue from 'eslint-plugin-vue'
import typescriptEslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
// import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default defineConfig(
  {
    ignores: ['node_modules', 'extension', 'assets', 'public', 'lib', 'src/auto-imports.d.ts', 'src/components.d.ts'],
  },

  // 推荐配置
  eslint.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],

  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    jsx: true,
    braceStyle: '1tbs',
    arrowParens: 'always',
  }),

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
      'max-len': 'off',
      'no-plusplus': 'off',
      'no-continue': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'no-underscore-dangle': 'off',
      'object-curly-newline': 'off',
      'arrow-body-style': 'off',
      'prefer-destructuring': 'off',
      'import/prefer-default-export': 'off',
      'import/extensions': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/no-required-prop-with-default': 'off',
      '@stylistic/quote-props': 'off',
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
  // eslintPluginPrettierRecommended,
)
