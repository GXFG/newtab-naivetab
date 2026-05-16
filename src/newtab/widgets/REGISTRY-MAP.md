# 注册锚点索引

新增功能时需要修改的所有注册点汇总。**新增 Widget / 命令时先查阅此表**，确保不遗漏。

## Widget 注册（共 5 + 1 个文件）

| # | 文件 | 位置 | 标记 | 说明 |
|---|------|------|------|------|
| 1 | [widget-constants.ts](src/common/widget-constants.ts) | `WIDGET_CODE_LIST` 数组 | 无标记，直接追加 | Widget code 字符串 |
| 2 | [widget-constants.ts](src/common/widget-constants.ts) | `WIDGET_GROUPS` 分组 | 无标记，直接追加 | 决定组件库抽屉中的分类展示 |
| 3 | [widget-constants.ts](src/common/widget-constants.ts) | `WIDGET_SETTING_PANE_MAP`（可选） | 无标记 | 若与其他 Widget 共用 setting pane 则添加 |
| 4 | [icons.ts](src/logic/constants/icons.ts) | `ICONS` 对象 | 无标记，直接追加 | Widget 图标常量 |
| 5 | [icons.ts](src/logic/constants/icons.ts) | `WIDGET_ICON_META` | 无标记，直接追加 | 引用 `ICONS.xxx`，不可硬编码字符串 |
| 6 | [locales/zh-CN.json](src/locales/zh-CN.json) / [en-US.json](src/locales/en-US.json) | `setting` 对象 | 无标记 | Widget 名称多语言 |

> **`WidgetConfigByCode` 类型** 也在 `src/common/widget-constants.ts` 中，新增 Widget 时需追加一行 key-value，使用动态 `import()` 语法无需单独 import。

### 专属 Setting 面板（可选）

| # | 文件 | 位置 | 标记 | 说明 |
|---|------|------|------|------|
| 7 | [setting/registry.ts](src/setting/registry.ts) | `SETTING_GROUPS` | `@@@@ add widget setting registry` | 在对应分组 items 中追加 |
| 8 | [icons.ts](src/logic/constants/icons.ts) | `SETTING_ICON_META` | 无标记 | 设置面板图标 |

### 配置迁移（改 config 结构时）

| # | 文件 | 位置 | 标记 | 说明 |
|---|------|------|------|------|
| 9 | [config/update.ts](src/logic/config/update.ts) | 版本迁移分支 | `@@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构` | 升 version 后追加迁移逻辑 |

## 全局命令快捷键注册（共 4 个文件）

| # | 文件 | 位置 | 说明 |
|---|------|------|------|
| 1 | [shortcut-command.ts](src/logic/shortcut/shortcut-command.ts) | `COMMAND_CATEGORIES` | 命令分类（`execEnv` 属性标注执行环境） |
| 2 | [registry.ts](src/background/commands/registry.ts) | `COMMAND_HANDLERS` | SW 端命令实现 |
| 3 | [locales/zh-CN.json](src/locales/zh-CN.json) / [en-US.json](src/locales/en-US.json) | `commands` 对象 | 多语言 |

> 详见 `/add-command` 技能。

## 自动处理（无需修改）

| 文件 | 机制 |
|------|------|
| [config/defaults.ts](src/logic/config/defaults.ts) | `import.meta.glob` 自动收集 widget config |
| [config/state.ts](src/logic/config/state.ts) | 遍历 `WIDGET_CODE_LIST` 动态创建 storage |
| [registry.ts](src/newtab/widgets/registry.ts) | `import.meta.glob` 自动扫描 widget index.ts 元信息 |
| [Content.vue](src/newtab/Content.vue) | 遍历 `widgetsList` 动态渲染 |
| [DraftDrawer.vue](src/newtab/draft/DraftDrawer.vue) | 遍历 `widgetsList` 展示组件库 |

## Widget 文件结构规范

每个 Widget 在 `src/newtab/widgets/{widgetName}/` 目录下，文件结构按复杂度分三档：

| 结构 | 文件 | 适用场景 |
|------|------|---------|
| 标准（3 文件） | `config.ts` — 默认配置 + 类型定义<br>`index.ts` — 元信息导出（供 `import.meta.glob` 扫描）<br>`index.vue` — 组件主体 | 大多数 Widget：clockDigital、clockAnalog、date、calendar、yearProgress、memo |
| 含业务逻辑（+ logic.ts） | 额外增加 `logic.ts` — 复杂业务逻辑、watch 监听器、异步数据获取 | weather（天气 API 调用 + 配置监听）、news（新闻 API 调用）、keyboardBookmark（书签数据解析 + 键盘事件） |
| 含子组件（+ *.vue） | 额外增加子 Vue 组件 | weather（NowWeather / ForecastWeather）、keyboardBookmark（KeyboardKeycapWidget） |

**何时增加 `logic.ts`：** 当 `index.vue` 的 `<script>` 中出现以下情况时拆分：
- 需要 `watch` 监听配置变化并触发异步操作（如 API 调用）
- 存在超过 30 行的纯业务逻辑（数据转换、状态计算）
- 需要导出可复用的业务函数供其他文件调用

**何时增加子 Vue 组件：** 当 `index.vue` 的 `<template>` 中某一块 UI 可以独立复用或超过 100 行时拆分。子组件放在同一目录下，首字母大写命名（如 `NowWeather.vue`）。
