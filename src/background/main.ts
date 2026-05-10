/**
 * Background Service Worker 入口
 *
 * Service Worker 不使用 ES module import，
 * 所有依赖通过构建打包后的 dist 文件以 CommonJS 方式引入。
 *
 * 模块职责：
 * - main.ts：Port 连接管理、消息队列、sendMessage 兜底
 * - config-cache.ts：配置缓存加载与 onChanged 自动更新
 * - init-guard.ts：启动编排，等待双配置加载完成后放行快捷键处理
 * - command-registry.ts：SW 命令注册表（SW 命令的实现 + Record 映射分发）
 * - commands.ts：40+ tab 操作命令的具体实现
 */
import {
  type TCommandEntry,
  type TSwCommandName,
  getCommandExecEnv,
} from '@/logic/globalShortcut/shortcut-command'
import { log, padUrlHttps } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'
import { registerRecentTab } from './commands'
import {
  getCachedKeyboardBookmarkConfig,
  getCachedKeyboardCommandConfig,
  getCachedSystemKeymap,
} from './config-cache'
import { waitInitialized, getIsInitialized } from './init-guard'
import {
  MSG_KEYDOWN,
  MSG_INIT_COMPLETE,
  MSG_HELLO,
  MSG_EXECUTE_COMMAND,
  type CsToSwMessage,
  type SwToCsMessage,
} from '@/types/messages'
import { execSwCommand } from './command-registry'

// ── 调试日志 ──────────────────────────────────────────────────────────────
const debug = (...args: any[]) => {
  console.log('[NaiveTab-sw]', ...args)
}

// ── Content Script 注册 ─────────────────────────────────────────────────
// Content Script 采用静态 manifest 声明（manifest.ts content_scripts 字段），
// 浏览器在页面加载时自动注入，不依赖 SW 启动时机。
// 相比动态注册的优势：
// - 注入时机更早：不依赖 SW 启动，浏览器直接注入
// - 覆盖更全：<all_urls> 包含 about:blank、file:// 等
// - 代码更简单：无需 registerContentScripts
//
// CS 内部有 window.__naivetabGlobalShortcutInit 守卫，防重复初始化。
// 快捷键启用/禁用由 CS 内部 isEnabled 状态控制，不需要注销 CS。

// ── Service Worker 启动时初始化缓存 ────────────────────────────────────────
// 使用 waitInitialized 确保两个配置都加载完成，后续 onConnect 可据此守卫
waitInitialized()

// ── 最近标签页追踪 ──────────────────────────────────────────────────────
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (activeInfo.tabId) {
    registerRecentTab(activeInfo.tabId)
  }
})

/**
 * 向已打开的标签页重新注入 Content Script。
 *
 * 静态 manifest content_scripts 仅在页面加载时注入，以下场景中已有页面的
 * CS 环境会被 Chrome 移除且不会自动恢复：
 * - 扩展重载 / 更新：旧页面的 isolated world 被强制销毁
 * - 首次安装：安装前已打开的页面无 CS
 * - 浏览器重启：session restore 恢复的页面不是新加载
 * - 扩展禁用后重新启用：等价于扩展重载
 *
 * 注入策略：
 * 1. chrome.tabs.query({}) 获取所有 tab（不限 URL 协议）
 * 2. 过滤无 URL 的 tab（少数 tab 如 PDF 预览可能无 URL）
 * 3. 串行调用 chrome.scripting.executeScript() 逐个注入
 * 4. 注入失败（受限页面 chrome:// 等、tab 已关闭）静默忽略
 *
 * CS 内部的 window.__naivetabGlobalShortcutInit 守卫确保不会重复执行初始化：
 * - 静态注入已生效的页面：守卫拦截，跳过
 * - 已被移除的页面：守卫为空，正常注入
 * - 新加载的页面：由 manifest 静态注入处理，不受此函数影响
 *
 * 为什么 reinjectContentScripts 没有 await waitInitialized()？
 *
 * SW 启动时所有 listener（onConnect、onMessage）在同步模块加载阶段就已注册完成，
 * 远快于任何 CS 连接请求。即使 reinject 注入的 CS 在 waitInitialized() 完成前
 * 建立了 Port 连接，也会走 pendingMessages 路径被正确处理（见 Port 连接管理部分）。
 *
 * 执行时序：
 *   t=0ms    waitInitialized() → 启动 async 任务（不阻塞后续代码）
 *   t=0ms    reinjectContentScripts() → 启动 async 任务（不阻塞）
 *   t<1ms    onConnect / onMessage listener 注册完成 ✓
 *   t=50ms   waitInitialized() resolve → isInitialized = true
 *   t=100ms  reinjectContentScripts 完成注入
 *
 * 如果改为 await waitInitialized().then(() => reinjectContentScripts())，
 * 只是让注入延后 ~50ms，但 SW 模块加载阶段已经可以响应 Port 连接了，
 * 所以并发执行语义更清晰：SW 启动后"同时"完成两件事。
 */
const reinjectContentScripts = async () => {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (!tab.id) continue
    if (!tab.url) continue
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['dist/contentScripts/index.global.js'],
      })
    } catch {
      // 受限页面（chrome://settings、chrome://downloads 等）不可注入，静默忽略
    }
  }
  debug('Reinject completed, tabs scanned:', tabs.length)
}

// 配置加载完成后，重新注入 CS 到已打开的标签页
reinjectContentScripts()

// ── Port 长连接：CS/newtab → SW 统一处理快捷键 ────────────────────────────
//
// 消息接收双路径：
// 1. Port 路径（主力）：CS 通过 connect('naivetab-shortcut') 建立长连接，按键通过 port.postMessage 发送
// 2. sendMessage 路径（兜底）：Port 不可用时 CS 降级为 chrome.runtime.sendMessage，会唤醒休眠的 SW
//
// 为什么需要双路径？
// Chrome MV3 的 SW 在 30s 空闲后会被终止，Port 也随之断开。
// Port 断连到重连之间有 100-1000ms 窗口期（指数退避），
// 此期间按键通过 sendMessage 兜底，避免用户感到"按键丢失"。

/**
 * tabId → Port 映射。每个 tabId 只保留一个 Port 引用。
 * 安全性：Content Script 注入时 allFrames: false（默认），仅注入顶层 frame，
 * 同一 tab 不会产生多个 Port 连接，因此一个 tabId 存一个 Port 是安全的。
 *
 * 冷启动容错机制：
 * SW 冷启动时配置尚未加载（waitInitialized），此期间 CS/newtab 发来的 keydown
 * 消息暂存到 pendingMessages 队列中。配置加载完成后：
 *   1. 批量处理积压消息（processKeydown）
 *   2. 显式 removeListener 暂存 handler，addListener 正常 handler
 *   3. 回传 INIT_COMPLETE 通知 CS/newtab
 */
const portMap = new Map<number, chrome.runtime.Port>()

/**
 * 初始化期间暂存的按键消息队列。
 * SW 冷启动时配置未加载完成，此期间 CS/newtab 发来的 keydown 暂存，
 * waitInitialized 完成后批量处理，避免冷启动窗口期按键被丢弃。
 */
interface PendingKeydown {
  key: string
  source: 'bookmark' | 'command'
}

const pendingMessages = new Map<number, PendingKeydown[]>()

/**
 * 处理单个按键消息（统一入口，供 onMessage 和积压队列共用）
 */
const processKeydown = (
  key: string,
  source: 'bookmark' | 'command',
  tabId: number,
) => {
  if (source === 'bookmark') {
    handleBookmarkShortcutKeydown(key, tabId)
  } else if (source === 'command') {
    handleCommandShortcutKeydown(key, tabId)
  } else {
    log('Unknown source in keydown message:', { key, source })
  }
}

/**
 * 处理书签快捷键按键事件
 */
const handleBookmarkShortcutKeydown = (key: string, _tabId: number) => {
  const config = getCachedKeyboardBookmarkConfig()
  if (!config.isGlobalShortcutEnabled) return

  // source=1 时使用 chrome.storage.local 中的 systemKeymap
  // source=2 时使用持久化配置中的 keymap
  const keymap =
    config.source === 1 ? getCachedSystemKeymap() : (config.keymap ?? {})
  const entry = keymap[key]
  if (!entry?.url) return

  const url = padUrlHttps(entry.url)
  debug('Bookmark shortcut: opening', url)
  chrome.tabs.create({ url })
}

/**
 * 处理命令快捷键按键事件
 */
const handleCommandShortcutKeydown = (key: string, tabId: number) => {
  const config = getCachedKeyboardCommandConfig()
  if (!config.isEnabled) return
  if (!config.keymap) return

  const entry = config.keymap[key] as TCommandEntry | undefined
  if (!entry?.command) return

  const execIn = getCommandExecEnv(entry.command)
  debug('Command shortcut:', entry.command, 'execIn:', execIn, 'tabId:', tabId)

  // newtab 命令由 newtab 页面本地执行，SW 无需处理
  // 若请求来自普通网页的 CS，也静默忽略（CS 没有 localConfig，无法执行）
  if (execIn === 'newtab') return

  if (execIn === 'sw') {
    execSwCommand(entry.command as TSwCommandName, tabId)
  } else {
    const port = portMap.get(tabId)
    if (port) {
      try {
        port.postMessage({
          type: MSG_EXECUTE_COMMAND,
          command: entry.command,
        })
      } catch (e) {
        log('Post command to CS error', e)
      }
    }
  }
}

// ── Port 连接管理 ──────────────────────────────────────────────────────────
//
// 连接生命周期：
// 1. connect() → onConnect → 存储 portMap[tabId] → 注册 onMessage
// 2. 冷启动路径：注册暂存 listener → waitInitialized() → removeListener 暂存 + addListener 正常 + INIT_COMPLETE
// 3. 正常路径：立即回传 INIT_COMPLETE → 注册正常 listener（含 HELLO 握手处理）
// 4. onDisconnect → 仅删除当前指向的 port（防快速导航误删新 Port）
//
// 双 listener 切换（冷启动场景）：
// - 第一个 listener（pendingHandler）：暂存消息到 pendingMessages
// - waitInitialized() 完成后：显式 removeListener 暂存 handler，addListener 正常 handler
// - 使用命名箭头函数便于 removeListener 精确匹配移除

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'naivetab-shortcut') return
  if (port.sender?.id !== chrome.runtime.id) return

  // BFCache / prerender 页面的 Port 不需要建立连接
  const lifecycle = (port.sender as any).documentLifecycle
  if (lifecycle && lifecycle !== 'active') {
    port.disconnect()
    return
  }

  const tabId = port.sender?.tab?.id
  if (!tabId) return

  portMap.set(tabId, port)
  debug('Port connected for tab', tabId, 'total:', portMap.size)

  // 初始化未完成时，暂存按键消息；配置加载完成后批量处理
  if (!getIsInitialized()) {
    if (!pendingMessages.has(tabId)) pendingMessages.set(tabId, [])

    // 暂存 listener（使用命名箭头函数，后续通过 removeListener 显式移除）
    const pendingHandler = (msg: CsToSwMessage) => {
      if (msg.type === MSG_KEYDOWN) {
        pendingMessages.get(tabId)!.push({ key: msg.key, source: msg.source })
      }
    }
    port.onMessage.addListener(pendingHandler)

    waitInitialized().then(() => {
      // 处理该 port 的积压消息
      const msgs = pendingMessages.get(tabId)
      if (msgs) {
        for (const { key, source } of msgs) processKeydown(key, source, tabId)
      }
      pendingMessages.delete(tabId)
      // 显式移除暂存 listener，替换为正常处理 listener
      port.onMessage.removeListener(pendingHandler)
      port.onMessage.addListener((msg: CsToSwMessage) => {
        if (msg.type === MSG_KEYDOWN) processKeydown(msg.key, msg.source, tabId)
      })
      try {
        port.postMessage({ type: MSG_INIT_COMPLETE })
      } catch {
        // port may be disconnected, ignore
      }
    })
  } else {
    try {
      port.postMessage({ type: MSG_INIT_COMPLETE })
    } catch {
      // port may be disconnected, ignore
    }
    port.onMessage.addListener((msg: CsToSwMessage) => {
      // 重连握手：CS 断线重连后发 HELLO 确认 SW 状态
      if (msg.type === MSG_HELLO) {
        if (getIsInitialized()) {
          try {
            port.postMessage({ type: MSG_INIT_COMPLETE })
          } catch {
            // port may be disconnected, ignore
          }
        }
        return
      }
      if (msg.type === MSG_KEYDOWN) processKeydown(msg.key, msg.source, tabId)
    })
  }

  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError
    // 只删除当前仍指向该 port 的条目，避免快速导航时误删新 Port
    const currentPort = portMap.get(tabId)
    if (currentPort === port) {
      portMap.delete(tabId)
    }
    debug('Port disconnected for tab', tabId, 'remaining:', portMap.size)
  })
})

// ── sendMessage 兜底：处理 CS 在 Port 不可用时发来的按键消息 ──────────────
//
// Chrome MV3 的 SW 在 30s 空闲后会被终止，Port 连接也随之断开。
// CS 在检测到 Port 不可用时会降级为 chrome.runtime.sendMessage。
// sendMessage 会唤醒 SW（如果休眠），此 handler 处理兜底消息。
//
// 为什么不用 Port 保活？
// Chrome 116+ 后开放 Port 不再阻止 SW 休眠（见 docs/architecture/messaging.md），
// 刻意保活会增加内存占用且不被 Chrome 推荐。
// 接受 SW 休眠的事实，优化"休眠 → 唤醒"路径才是正确策略。

chrome.runtime.onMessage.addListener((msg: CsToSwMessage, sender) => {
  if (msg.type === MSG_KEYDOWN && sender.tab?.id) {
    processKeydown(msg.key, msg.source, sender.tab.id)
  }
})

// ── 未捕获异常上报 ────────────────────────────────────────────────────────

addEventListener('unhandledrejection', async (event) => {
  gaProxy('error', ['unhandledrejection'], {
    reason: String(event.reason),
  })
})
