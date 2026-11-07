# 0005. 设置面板静态注册，不做异步组件分割

- 状态：已采纳
- 日期：2026-11-06
- 相关代码：`src/setting/registry.ts`

## 背景

设置面板有十几个 pane，每个都带一批字段组件。常规 Vue 项目会用 `defineAsyncComponent` 做路由级代码分割，避免首屏加载全部组件。

## 决策

所有 pane 组件在 `registry.ts` 顶部静态 import，用 `PANE_MAP: Record<settingPanes, Component>` 映射。不做异步加载。

## 被否的方案

**`defineAsyncComponent` + 动态 import。** 代码分割的收益来自"通过网络按需下载"，而扩展的所有文件都在本地磁盘上，加载一个本地 JS chunk 与解析已加载模块的耗时差可以忽略。在这里做分割只会换来闪烁的加载态和一层额外的失败可能（chunk 加载失败无法降级）。

## 后果

- 新增面板必须同时改三处：`SETTING_GROUPS`、`SETTING_ICON_META`、`PANE_MAP`。
- 三处的 key 类型都是 `settingPanes` 联合类型，漏一处 `vue-tsc` 会直接报错。这是刻意的设计——把"记得注册"从人的自律变成编译期错误。
- 新增面板的完整步骤见 `.claude/skills/add-setting-pane/SKILL.md`，本文不重复。
