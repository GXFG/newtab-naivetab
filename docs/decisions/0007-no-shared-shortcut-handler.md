# 0007. CS 与 newtab 的快捷键处理不抽通用函数

- 状态：已采纳
- 日期：2026-11-07
- 相关代码：`src/contentScripts/index.ts`、`src/logic/shortcut/shortcut-executor.ts`、`src/logic/shortcut/matcher.ts`

## 背景

两端都要"匹配 → 分发 → 执行"，代码形状相似。CS 端要处理 `swReady` 状态、Port 降级、scroll 命令本地执行、`ALLOWED_SET` 白名单；newtab 端要处理两个 task 的注册顺序、输入框焦点屏蔽、当前布局的键位白名单。

看到两段相似代码，抽一个 `handleShortcut(ctx)` 是很自然的想法。

## 决策

抽象层级停在 `matcher.ts`（纯函数：匹配出 code，不做任何执行）。执行编排各写各的，不合并。

## 被否的方案

**抽一个通用执行编排函数。** 它需要传入约 15 个参数：两个 `isEnabled`、两个 keymap、两个黑名单、`swReady`/Port 状态、降级策略、`hostname`、布局白名单、输入框配置……

参数列表本身就是两端差异的清单。抽完之后，调用方仍要为每个参数决定传什么——复杂度没有被消除，只是从代码里挪进了函数签名，可读性反而更差。更麻烦的是层级边界被参数打通：CS 不该知道 newtab 的布局白名单，newtab 也不该知道 CS 的 DOM 执行细节。

## 后果

- 匹配规则只在 `matcher.ts` 改一次，两端自动生效。这是唯一值得共享的层级。
- 发现某个差异时，先判断它是不是**偶然差异**：能不能用"谁持有这份数据"解释？能，就保留；不能，就消除差异本身，而不是加参数把它固化。
- 两端的 `tryDispatchCommand` / `tryDispatchBookmark` 保持各自实现，改动一侧时不要顺手"顺手对齐"另一侧。
