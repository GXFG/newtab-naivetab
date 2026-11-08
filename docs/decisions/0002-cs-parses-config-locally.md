# 0002. 各上下文独立解析配置，不由 SW 解析后广播

- 状态：已采纳
- 日期：2026-11-06
- 相关代码：`src/logic/config/sync/`、`src/contentScripts/index.ts`、`src/background/config/cache.ts`

## 背景

配置以 gzip 压缩后存在 `chrome.storage`，`chrome.storage.onChanged` 会同时触发所有上下文。一个自然的问题是：让 SW 统一解析一次，再通过 Port 广播给各个 CS，是不是更省？

Vimium C 就是这么做的（`newSettingsToBroadcast_` 批量广播），所以这个方向很容易被当成"最佳实践"照搬。

## 决策

每个上下文（SW、每个 CS、NewTab）独立从 `chrome.storage` 读原始数据并各自解析。谁都不做广播。

## 被否的方案

**SW 解析 + Port 广播给 CS。** 理由逐条：

- gzip 解压极快：10KB 配置约 1–3ms，N 个 tab 合计 <30ms 总 CPU 时间，且分布在不同进程，用户无感知。
- 广播不是免费的：`JSON.stringify` → IPC → `JSON.parse` 的开销与 gzip 解压同一量级，不是"把活移走就省了"。
- 没有延迟优势：`onChanged` 对所有上下文同时触发，谁解析总延迟都一样。
- 增加耦合：SW 要遍历 portMap，CS 要处理新消息类型，单点故障面扩大。
- **丧失本地 fallback**：CS 独立持有 keymap 是书签快捷键零延迟打开的前提。集中到 SW 后，SW 休眠时 CS 无法响应。

## 后果

- 不要把这个方向当性能优化重提。它不是瓶颈。
- 如果确实想缩短"改设置 → 各 tab 生效"的感知延迟，瓶颈在 `useStorageLocal` 的 500ms 防抖，不在解析。
- CS 必须始终能独立构造 keymap，这是 0001 里那条"本地 fallback"的前提，两者是耦合的。
