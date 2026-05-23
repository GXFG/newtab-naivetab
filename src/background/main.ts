/**
 * @module main
 * @description Background Service Worker 入口。胶水层，专注启动编排 + listener 注册。
 * @dependencies config/init-guard（启动守卫）、messaging/port-manager（Port 连接管理）、commands/registry（命令分发）
 * @consumers 无（被 Chrome SW 启动时加载）
 * @pitfalls
 *   - waitInitialized() 是 async 但不阻塞后续 listener 注册（onConnect/onMessage 在同步模块加载阶段就注册完成）
 *   - reinjectContentScripts 不能 await waitInitialized()，否则 SW 模块加载阶段的 Port 连接会丢失 pendingMessages 处理
 *   - CS 内部有 window.__naivetabGlobalShortcutInit 守卫，防重复初始化
 *   - 各模块以独立 listener 形式注册，main.ts 不持有业务逻辑
 * @see docs/architecture/background-modules.md
 */

import { waitInitialized } from './config/init-guard'
import {
  setupPortManager,
  portMap,
  reinjectContentScripts,
} from './messaging/port-manager'
import { initLayerToast } from './messaging/toast'
import { execSwCommand } from './commands/registry'
import { registerRecentTab } from './commands/handlers'
import { registerSWErrorHandler } from '@/logic/utils/errorHandler'

// ── Service Worker 错误处理（最先注册，捕获后续所有异常）───────────────────
registerSWErrorHandler('service-worker')

// ── Service Worker 启动时初始化缓存 ────────────────────────────────────────
// 使用 waitInitialized 确保两个配置都加载完成，后续 onConnect 可据此守卫
waitInitialized()

// ── 注入 Port 映射到 toast 模块 ────────────────────────────────────────────
initLayerToast(portMap)

// ── 注册 Port 连接管理与消息处理 listener ──────────────────────────────────
setupPortManager(execSwCommand)

// ── 最近标签页追踪 ──────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (activeInfo.tabId) {
    registerRecentTab(activeInfo.tabId)
  }
})

// ── 重新注入 Content Script ───────────────────────────────────────────────
//
// 静态 manifest content_scripts 仅在页面加载时注入，以下场景中已有页面的
// CS 环境会被 Chrome 移除且不会自动恢复：
// - 扩展重载 / 更新：旧页面的 isolated world 被强制销毁
// - 首次安装：安装前已打开的页面无 CS
// - 浏览器重启：session restore 恢复的页面不是新加载
// - 扩展禁用后重新启用：等价于扩展重载
//
// CS 内部有 window.__naivetabGlobalShortcutInit 守卫，防重复初始化。
// 快捷键启用/禁用由 CS 内部 isEnabled 状态控制，不需要注销 CS。
//
// 为什么 reinjectContentScripts 没有 await waitInitialized()？
//
// SW 启动时所有 listener（onConnect、onMessage）在同步模块加载阶段就已注册完成，
// 远快于任何 CS 连接请求。即使 reinject 注入的 CS 在 waitInitialized() 完成前
// 建立了 Port 连接，也会走 pendingMessages 路径被正确处理。
//
// 执行时序：
//   t=0ms    waitInitialized() → 启动 async 任务（不阻塞后续代码）
//   t=0ms    reinjectContentScripts() → 启动 async 任务（不阻塞）
//   t<1ms    onConnect / onMessage listener 注册完成 ✓
//   t=50ms   waitInitialized() resolve → isInitialized = true
//   t=100ms  reinjectContentScripts 完成注入
//
// 如果改为 await waitInitialized().then(() => reinjectContentScripts())，
// 只是让注入延后 ~50ms，但 SW 模块加载阶段已经可以响应 Port 连接了，
// 所以并发执行语义更清晰：SW 启动后"同时"完成两件事。

reinjectContentScripts()
