# 0006. 快捷键共享匹配引擎，执行路径按数据源分开

- 状态：已采纳
- 日期：2026-11-07
- 相关代码：`src/logic/shortcut/matcher.ts`、`src/contentScripts/index.ts`、`src/logic/shortcut/shortcut-executor.ts`

## 背景

书签快捷键和命令快捷键共用 `matchShortcut()` 的匹配逻辑与 Port 通道，两边的 keydown 处理代码看起来相似，容易被当成"应该合并的重复代码"。

差异的根源只有一条：**keymap 的 value 类型不同**。书签的 value 是 URL，命令的 value 是 `TCommandName`，后者必须经 `getCommandExecEnv()` 路由到 SW / CS / newtab 才能执行。

## 决策

匹配引擎共用，执行路径分开：

| | 书签 | 命令 |
|---|---|---|
| keymap 来源 | 同步配置 + 浏览器书签树异步构建（`systemKeymap`） | 仅同步配置 |
| CS 端兜底 | Port 不可用时 `sendMessage` 唤醒 SW | 同 |
| 冷却机制 | 层切换期间 `isBuildingLayerKeymap` | 无 |

## 被否的方案

- **统一成动作描述符**（`{ type: 'url' | 'command', payload }`）交给 SW 统一执行：书签也要等一次 SW 往返，而书签是最高频的操作（点开一个网页），多一次往返就是可感知的延迟。
- **给命令也建 `systemKeymap`**：命令没有异步数据源。命令 keymap 始终由用户手动绑定、直接写 sync 配置，不存在"构建中途读到旧数据"的窗口。
- **给命令也加层切换冷却**：冷却存在的唯一理由是层切换要异步解析书签树（见 [ADR 0004](0004-sw-builds-layer-keymap.md)）。命令 keymap 是同步赋值，没有中间态可防。

## 后果

- 两边 keydown 代码的相似是**表面相似**，不要为了消重合成一个函数（见 [ADR 0007](0007-no-shared-shortcut-handler.md)）。
- 命令依赖 SW 存活：SW 不可用时命令必然失效，这是接受的代价。
- **CS 无法自己打开标签页**：Chrome 不向内容脚本暴露 Tabs API，`chrome.tabs` 在 CS 里是 `undefined`。因此 CS 端的书签只能靠 `sendMessage` 唤醒 SW 来执行，"本地零延迟兜底"在这个平台上不存在。2026-11 曾有一版 `chrome.tabs.create` 兜底，因为必然抛 TypeError 被移除；不要再加回来。
- 若将来要用 `window.open` 换回零延迟打开，必须先删掉同一分支里的 `sendMessage`，否则一次按键会打开两个标签页。
- 本条也修正了 [ADR 0002](0002-cs-parses-config-locally.md) 的一处论据：那里说 CS 独立持有 keymap 是"零延迟打开"的前提，该前提不成立。但 0002 的结论仍然有效——CS 仍需本地 keymap 在 `noModifierMode` 下判断按键是否真有绑定（`contentScripts/index.ts` 的 `hasBookmarkBinding`），否则会吞掉页面原生按键。
