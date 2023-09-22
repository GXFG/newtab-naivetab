module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: ['plugin:vue/vue3-recommended', 'airbnb-base', 'plugin:prettier/recommended'],
  plugins: ['@typescript-eslint', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    parser: '@typescript-eslint/parser',
  },
  settings: {
    'import/core-modules': ['@iconify/vue', '@vueuse/core'], // 核心模块，不需要进行路径解析
    'import/resolver': {
      alias: {
        map: [
          ['@', './src'],
          ['~', './src'],
        ],
        extensions: ['.ts', '.js', '.jsx', '.json', '.vue'],
      },
    },
  },
  rules: {
    'prettier/prettier': 'error',
    'linebreak-style': 'off',
    'no-console': 'off',
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
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'vue/multi-word-component-names': 'off',
  },
}
