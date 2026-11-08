# 0001. 高频按键走 Port 长连接，CS 保留 sendMessage 兜底，不做心跳保活

- 状态：已采纳
- 日期：2026-11-06
- 相关代码：`src/logic/shortcut/port.ts`、`src/background/messaging/port-manager.ts`

## 背景

按键是高频事件，`chrome.runtime.sendMessage` 每次调用都会触发 SW 唤醒。SW 冷启动本身要几十到两百毫秒，落在按键路径上就是可感知的卡顿。

Chrome 116 之前，一个开放的 Port 可以阻止 SW 休眠；116+ 之后这个行为被移除——**Port 活着不再算作 SW 的活跃信号**。

## 决策

主力路径用 Port（`name='naivetab-shortcut'`）。CS 在 Port 不可用时降级为 `sendMessage` 唤醒 SW。NewTab 只有 Port 一条路径，不做降级。

## 被否的方案

- **全部走 sendMessage**：延迟不可接受，等于每次按键都可能撞上冷启动。
- **心跳保活 SW**（`chrome.alarms` 定时唤醒）：会永久保持 SW 活跃，增加常驻内存；Chrome 官方也不推荐。三层兜底已经足够，不需要用资源换确定性。
- **NewTab 也做 sendMessage 降级**：NewTab 无法在 SW 未就绪时执行任何命令，降级只看得到更长的等待。它的正确处理是弹 toast 告知「扩展正在初始化」，而不是加一条更慢的路径。

## 后果

- Port 断连到重连之间存在窗口期，必须靠指数退避（100ms → 1000ms）和 CS 侧 sendMessage 兜底覆盖。
- 页面从 BFCache 恢复时 JS 环境保留但 Port 已断，必须监听 `pageshow` 且 `event.persisted === true` 时主动重连。漏了这条，用户后退回来快捷键就静默失效。
- **不要重新提议心跳保活**。这是权衡后的取舍，不是遗漏。
