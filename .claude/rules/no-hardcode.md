# 禁止硬编码

- **图标：** 必须通过 `src/logic/constants/icons.ts` 的 `ICONS` 常量引用，禁止硬编码字符串。新增 setting 面板必须在 `SETTING_ICON_META` 中注册。
  - **模板里也不许写死图标名**（如 `<Icon icon="mdi:shuffle" />`），一律 `:icon="ICONS.xxx"`；缺失常量就往 `ICONS` 里加。
  - **新增/更换图标后必须执行 `pnpm gen:icons`** 并提交 `src/logic/constants/icon-set.json`。图标走 `@iconify/vue/offline`，没生成数据不会报错、只会渲染空白。生成脚本以 `ICONS` / `COMMAND_ICONS` 为唯一输入（不扫描源码），数据源是单个 `@iconify/json` 全量包（新增图标集不必改依赖），在「格式非法 / 缺数据包 / 前缀不存在 / 图标名不存在」时以非 0 退出且不写产物。`icon-set.test.ts` 守四件事：产物与常量表双向一致、没有未被引用的常量、除 `icons.ts` 外没有图标名字面量、每个图标都能渲染出内容。详见 [icons.md](../../docs/architecture/icons.md)。
- **文本：** 用户可见提示必须使用 i18n，禁止硬编码任何语言文本。`zh-CN.json` 和 `en-US.json` 必须同步更新。
  - **包括** dialog 的 `title`/`content`/`positiveText`/`negativeText`、`showToast`、`$notification`、placeholder、按钮文案等所有面向用户的文本。
  - **变量替换模式：** 使用 `__key__` 占位符 + `.replace()` 方式传入动态值（如 `.replace('__folder__', folderTitle)`）。
    - Vue 模板中的正确写法：`$t('key.xxx').replace('__n__', value)`
    - Vue 模板中的**错误写法**（vue-i18n 默认语法，项目不使用）：`$t('key.xxx', { n: value })`
    - JavaScript/TypeScript 中的正确写法：`window.$t('key.xxx').replace('__count__', String(count))`
  - 写代码时先想文案的 i18n key，再写实现。不要因为"变量替换复杂"或"只是 dialog 文案"就跳过 i18n。
