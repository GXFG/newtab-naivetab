/**
 * Port 长连接管理模块
 *
 * CS/newtab ↔ SW 的 Port 连接生命周期管理：
 * 1. connect() → 存储 portMap[tabId] → 注册 onMessage
 * 2. 冷启动路径：注册暂存 listener → waitInitialized() → 切换 + INIT_COMPLETE
 * 3. 正常路径：立即 INIT_COMPLETE → 注册正常 listener（含 HELLO 握手）
 * 4. onDisconnect → 删除当前指向的 port（防快速导航误删新 Port）
 *
 * 消息接收双路径：
 * 1. Port 路径（主力）：CS 通过 connect('naivetab-shortcut') 建立长连接
 * 2. sendMessage 路径（兜底）：Port 不可用时 CS 降级为 chrome.runtime.sendMessage
 *
 * ⚠️ 消息来源差异（修改 handler 前必读）：
 * - 书签消息：只有 CS 发送（newtab 书签直接 openPage，不走 Port）
 * - 命令消息：CS 和 newtab 都会发送（newtab 的 SW 命令走 Port → SW）
 * - 结论：handler 中的检查条件如果只应在 CS 端生效（如 isGlobalShortcutEnabled），
 *   必须放在 CS 入口处，不能放在 SW handler 中，否则会误杀 newtab 消息。
 */

import { log, padUrlHttps } from '@/logic/utils/common'
import { gaProxy } from '@/logic/utils/gtag'
import {
  MSG_KEYDOWN,
  MSG_INIT_COMPLETE,
  MSG_HELLO,
  MSG_EXECUTE_COMMAND,
  MSG_SWITCH_BOOKMARK_LAYER_UI,
  type CsToSwMessage,
} from '@/types/messages'
import { waitInitialized, getIsInitialized } from '../config/init-guard'
import {
  getCachedKeyboardBookmarkConfig,
  getCachedKeyboardCommandConfig,
  getCachedSystemKeymap,
  isInLayerSwitchCooldown,
  markLayerKeymapBuilding,
  buildLayerKeymapComplete,
} from '../config/cache'
import { buildAndSaveLayerKeymap } from '../commands/layer-keymap-builder'
import { sendLayerSwitchToast } from '../messaging/toast'
import { BookmarkSource } from '@/common/widget-constants'
import type {
  TCommandEntry,
  TSwCommandName,
} from '@/logic/shortcut/shortcut-command'
import { getCommandExecEnv } from '@/logic/shortcut/shortcut-command'

/**
 * 冷启动期间暂存的按键消息队列。
 */
interface PendingKeydown {
  key: string
  source: 'bookmark' | 'command'
}

const pendingMessages = new Map<number, PendingKeydown[]>()

/**
 * tabId → Port 映射。每个 tabId 只保留一个 Port 引用。
 */
export const portMap = new Map<number, chrome.runtime.Port>()

/**
 * 处理 UI 发起的书签层切换请求。
 *
 * 与命令快捷键路径（registry.ts）复用同一套逻辑：
 * markLayerKeymapBuilding → buildAndSaveLayerKeymap → sendLayerSwitchToast
 * 确保原子写入（keymap + activeLayer 一次 set），避免两步写入的中间状态。
 */
const handleSwitchBookmarkLayerFromUI = async (layerIndex: number) => {
  log(`UI request to switch bookmark layer to ${layerIndex}`)
  try {
    markLayerKeymapBuilding()
    await buildAndSaveLayerKeymap(layerIndex)
    sendLayerSwitchToast(layerIndex)
  } finally {
    // 无论成功、异常还是提前返回，都必须清除标志位，
    // 防止 isBuildingLayerKeymap 永久为 true 拦截所有书签快捷键。
    buildLayerKeymapComplete()
  }
}

/**
 * 处理书签快捷键按键事件
 */
const handleBookmarkShortcutKeydown = (key: string, _tabId: number) => {
  const config = getCachedKeyboardBookmarkConfig()
  // isGlobalShortcutEnabled 由 CS 端自行检查后才发送消息，SW 只检查总开关 isEnabled
  if (config.isEnabled === false) return

  const keymap = isInLayerSwitchCooldown()
    ? {} // 切层冷却期内禁用书签快捷键，避免打开旧层书签
    : config.source === BookmarkSource.BROWSER
      ? getCachedSystemKeymap()
      : (config.keymap ?? {})
  const entry = keymap[key]
  if (!entry?.url) return

  const url = padUrlHttps(entry.url)
  gaProxy('click', ['openBookmark'], { key_code: key, source: 'shortcut' })
  chrome.tabs.create({ url })
}

/**
 * 处理命令快捷键按键事件
 */
export const handleCommandShortcutKeydown = (
  key: string,
  tabId: number,
  execSwCommand: (command: TSwCommandName, tabId: number) => void,
) => {
  const config = getCachedKeyboardCommandConfig()
  // isGlobalShortcutEnabled 由 CS 端自行检查后才发送消息，SW 只检查总开关 isEnabled
  // newtab 端的命令消息也走 Port → SW，因此 SW 不能检查 isGlobalShortcutEnabled
  if (config.isEnabled === false) return
  if (!config.keymap) return

  const entry = config.keymap[key] as TCommandEntry | undefined
  if (!entry?.command) return

  const execIn = getCommandExecEnv(entry.command)
  log('Command shortcut:', entry.command, 'execIn:', execIn, 'tabId:', tabId)

  // newtab 命令由 newtab 页面本地执行，SW 无需处理/上报
  if (execIn === 'newtab') return

  // 命令实际由 SW/CS 执行时才上报
  gaProxy('press', ['command'], { key_code: key, command_code: entry.command })

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

/**
 * 处理单个按键消息（统一入口）
 */
const processKeydown = (
  key: string,
  source: 'bookmark' | 'command',
  tabId: number,
  execSwCommand: (command: TSwCommandName, tabId: number) => void,
) => {
  if (source === 'bookmark') {
    handleBookmarkShortcutKeydown(key, tabId)
  } else if (source === 'command') {
    handleCommandShortcutKeydown(key, tabId, execSwCommand)
  } else {
    log('Unknown source in keydown message:', { key, source })
  }
}

/**
 * 调试日志，仅开发环境输出。__DEV__ 由 Vite define 在构建时替换为布尔值。
 */
const debug = (...args: any[]) => {
  if (__DEV__) {
    console.log('[NaiveTab-sw]', ...args)
  }
}

/**
 * 向已打开的标签页重新注入 Content Script。
 *
 * 静态 manifest content_scripts 仅在页面加载时注入，以下场景中已有页面的
 * CS 环境会被 Chrome 移除且不会自动恢复：
 * - 扩展重载 / 更新、首次安装、浏览器重启、扩展禁用后重新启用
 */
export const reinjectContentScripts = async () => {
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
      // 受限页面（chrome://settings 等）不可注入，静默忽略
    }
  }
  debug('Reinject completed, tabs scanned:', tabs.length)
}

/**
 * 注册所有 Port 相关 listener（onConnect、onMessage 兜底、异常上报）。
 * @param execSwCommand 命令执行器（由 main.ts 传入，避免循环依赖）
 */
export const setupPortManager = (
  execSwCommand: (command: TSwCommandName, tabId: number) => void,
) => {
  // ── onConnect ───────────────────────────────────────────────────────────

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
        } else if (msg.type === MSG_SWITCH_BOOKMARK_LAYER_UI) {
          handleSwitchBookmarkLayerFromUI(msg.layerIndex)
        }
      }
      port.onMessage.addListener(pendingHandler)

      waitInitialized().then(() => {
        // 处理该 port 的积压消息
        const msgs = pendingMessages.get(tabId)
        if (msgs) {
          for (const { key, source } of msgs)
            processKeydown(key, source, tabId, execSwCommand)
        }
        pendingMessages.delete(tabId)
        // 显式移除暂存 listener，替换为正常处理 listener
        port.onMessage.removeListener(pendingHandler)
        port.onMessage.addListener((msg: CsToSwMessage) => {
          if (msg.type === MSG_KEYDOWN)
            processKeydown(msg.key, msg.source, tabId, execSwCommand)
          else if (msg.type === MSG_SWITCH_BOOKMARK_LAYER_UI)
            handleSwitchBookmarkLayerFromUI(msg.layerIndex)
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
        if (msg.type === MSG_KEYDOWN)
          processKeydown(msg.key, msg.source, tabId, execSwCommand)
        else if (msg.type === MSG_SWITCH_BOOKMARK_LAYER_UI)
          handleSwitchBookmarkLayerFromUI(msg.layerIndex)
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

  // ── sendMessage 兜底 ───────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg: CsToSwMessage, sender) => {
    if (sender.id !== chrome.runtime.id) return
    if (msg.type === MSG_KEYDOWN && sender.tab?.id) {
      processKeydown(msg.key, msg.source, sender.tab.id, execSwCommand)
    } else if (msg.type === MSG_SWITCH_BOOKMARK_LAYER_UI) {
      handleSwitchBookmarkLayerFromUI(msg.layerIndex)
    }
  })
}
