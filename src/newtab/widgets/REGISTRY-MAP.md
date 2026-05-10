# 注册锚点索引

新增功能时需要修改的所有注册点汇总。**新增 Widget / 命令时先查阅此表**，确保不遗漏。

## Widget 注册（共 6 个文件）

| # | 文件 | 位置 | 标记 | 说明 |
|---|------|------|------|------|
| 1 | [codes.ts](src/newtab/widgets/codes.ts) | `WIDGET_CODE_LIST` 数组 | 无标记，直接追加 | Widget code 字符串 |
| 2 | [codes.ts](src/newtab/widgets/codes.ts) | `WIDGET_GROUPS` 分组 | 无标记，直接追加 | 决定组件库抽屉中的分类展示 |
| 3 | [codes.ts](src/newtab/widgets/codes.ts) | `WIDGET_SETTING_PANE_MAP`（可选） | 无标记 | 若与其他 Widget 共用 setting pane 则添加 |
| 4 | [icons.ts](src/logic/icons.ts) | `ICONS` 对象 | 无标记，直接追加 | Widget 图标常量 |
| 5 | [icons.ts](src/logic/icons.ts) | `WIDGET_ICON_META` | 无标记，直接追加 | 引用 `ICONS.xxx`，不可硬编码字符串 |
| 6 | [locales/zh-CN.json](src/locales/zh-CN.json) / [en-US.json](src/locales/en-US.json) | `setting` 对象 | 无标记 | Widget 名称多语言 |

> **已消除**：`registry.ts` 的 `WidgetConfigByCode` 类型改用动态 `import()` 语法，无需单独 import 语句，但仍需追加一行 key-value。

### 专属 Setting 面板（可选）

| # | 文件 | 位置 | 标记 | 说明 |
|---|------|------|------|------|
| 7 | [setting/registry.ts](src/setting/registry.ts) | `SETTING_GROUPS` | `@@@@ add widget setting registry` | 在对应分组 items 中追加 |
| 8 | [icons.ts](src/logic/icons.ts) | `SETTING_ICON_META` | 无标记 | 设置面板图标 |

### 配置迁移（改 config 结构时）

| # | 文件 | 位置 | 标记 | 说明 |
|---|------|------|------|------|
| 9 | [config/update.ts](src/logic/config/update.ts) | 版本迁移分支 | `@@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构` | 升 version 后追加迁移逻辑 |

## 全局命令快捷键注册（共 4 个文件）

| # | 文件 | 位置 | 说明 |
|---|------|------|------|
| 1 | [shortcut-command.ts](src/logic/globalShortcut/shortcut-command.ts) | `COMMAND_CATEGORIES` + `COMMAND_EXEC_ENV` | 命令分类 + 执行环境 |
| 2 | [command-registry.ts](src/background/command-registry.ts) | `COMMAND_REGISTRY` | SW 端命令实现 |
| 3 | [locales/zh-CN.json](src/locales/zh-CN.json) / [en-US.json](src/locales/en-US.json) | `commands` 对象 | 多语言 |
| 4 | [shortcut-utils.ts](src/logic/globalShortcut/shortcut-utils.ts) | `NO_MODIFIER_COMMANDS`（可选） | 无修饰键模式白名单 |

> 详见 `/add-command` 技能。

## 自动处理（无需修改）

| 文件 | 机制 |
|------|------|
| [config/defaults.ts](src/logic/config/defaults.ts) | `import.meta.glob` 自动收集 widget config |
| [store.ts](src/logic/store.ts) | 遍历 `WIDGET_CODE_LIST` 动态创建 storage |
| [registry.ts](src/newtab/widgets/registry.ts) | `import.meta.glob` 自动扫描 widget index.ts 元信息 |
| [Content.vue](src/newtab/Content.vue) | 遍历 `widgetsList` 动态渲染 |
| [DraftDrawer.vue](src/newtab/draft/DraftDrawer.vue) | 遍历 `widgetsList` 展示组件库 |
