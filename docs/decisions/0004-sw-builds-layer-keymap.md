# 0004. 书签层 keymap 由 SW 原子构建，UI 端只发请求

- 状态：已采纳
- 日期：2026-11-06
- 相关代码：`src/background/commands/layer-keymap-builder.ts`、`src/background/config/cache.ts`

## 背景

层切换命令的 `execEnv = 'sw'`，可以在任意页面执行，此时 newtab 页面可能根本不存在。层切换要同时更新两份数据：`keymap`（当前层的按键映射）和 `activeLayer`（当前层标识）。

## 决策

SW 负责构建：读取书签树 → 生成 keymap → `chrome.storage.local.set({ keymap, activeLayer })` 一次原子写入。UI 端（newtab / popup）只通过 `runtime.sendMessage` 请求 SW 执行，自己不写 storage。

## 被否的方案

**UI 端构建后自己写 storage。** 否决原因是写入过程存在中间态：

- 先写 keymap 再写 activeLayer：存在一个瞬间，新层级的键位配的是旧的层标识，此时按键会落到错误的层，甚至打开用户没预期的书签。
- 先写 activeLayer 再写 keymap：同样有一段时间按键映射是上一层的，表现为"切了层但键位没变"。

这两类中间态都只在几十毫秒内出现，人工测试几乎撞不到，但用户连续快按时会撞到。

## 后果

- 必须守住一条：**所有退出路径都要调用 `buildLayerKeymapComplete()`**。漏一条，`isBuildingLayerKeymap` 永久为 `true`，书签快捷键被永久拦截，用户侧表现为"整个书签键盘失灵"，且刷新页面不会恢复。
- 覆盖的退出路径包括：正常完成、层未配置、书签权限未授予、storage 配额超限、异常抛出。新增分支时必须补上清除动作。
- ~~**当前没有测试覆盖这条约束**（2026-11 核查：`layer-keymap-builder.ts` 无对应测试文件）。这意味着它是纯靠人工守的红线，改动该文件时请逐条核对退出路径，并优先补一个「异常后标志位被清除」的用例。~~
  **2026-11-07 已补**：`src/background/commands/__tests__/layer-keymap-builder.test.ts` 共 7 个用例，覆盖层未配置、配置未加载、层索引越界、解析抛错、空文件夹、成功路径六种情形，并反向断言"成功路径不得清标志位"。该模块语句、分支、函数、行均 100%。做过变异验证：注掉提前返回里的 `buildLayerKeymapComplete()`，正好 2 条用例失败。
