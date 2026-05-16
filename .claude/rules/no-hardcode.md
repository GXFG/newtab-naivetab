# 禁止硬编码

- **图标：** 必须通过 `src/logic/constants/icons.ts` 的 `ICONS` 常量引用，禁止硬编码字符串。新增 setting 面板必须在 `SETTING_ICON_META` 中注册。
- **文本：** 用户可见提示必须使用 i18n，禁止硬编码任何语言文本。`zh-CN.json` 和 `en-US.json` 必须同步更新。
  - **包括** dialog 的 `title`/`content`/`positiveText`/`negativeText`、`showToast`、`$notification`、placeholder、按钮文案等所有面向用户的文本。
  - **变量替换模式：** 使用 `__key__` 占位符 + `.replace()` 方式传入动态值（如 `.replace('__folder__', folderTitle)`）。
    - Vue 模板中的正确写法：`$t('key.xxx').replace('__n__', value)`
    - Vue 模板中的**错误写法**（vue-i18n 默认语法，项目不使用）：`$t('key.xxx', { n: value })`
    - JavaScript/TypeScript 中的正确写法：`window.$t('key.xxx').replace('__count__', String(count))`
  - 写代码时先想文案的 i18n key，再写实现。不要因为"变量替换复杂"或"只是 dialog 文案"就跳过 i18n。
