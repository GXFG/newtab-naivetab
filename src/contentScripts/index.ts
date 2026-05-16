// NaiveTab global shortcut Content Script
//
// Port 长连接架构 + sendMessage 兜底：
// - 优先使用 Port：CS 采集按键 -> 修饰键匹配 -> Port.postMessage 发送到 SW（最低延迟）
// - Port 不可用时降级 sendMessage：chrome.runtime.sendMessage 唤醒休眠的 SW（~50-200ms）
// - 书签快捷键额外有本地 keymap fallback：零延迟直接打开 URL
// - SW 查 keymap -> chrome.tabs.create 打开 URL / 路由到 CS 执行 DOM 命令
//
// 注入范围：<all_urls>（静态 manifest content_scripts 声明，浏览器自动注入）
// 注入时机：document_start（DOM 构建前即可拦截按键）
//
// 配置同步：
// - chrome.storage.onChanged 监听配置变化，更新本地修饰键和启用状态
// - 首次加载直接从 chrome.storage.sync 读取初始配置（~5-20ms）
// - Port 不可用时降级为 chrome.runtime.sendMessage（唤醒休眠的 SW）
//
// 模块拆分：
// - index.ts：初始化入口、配置加载/监听、Port 连接、按键分发、命令执行器
// - scroll.ts：滚动容器查找、缓存失效、平滑滚动
// - toast.ts：轻量提示组件
//
// 为什么 index.ts 不进一步拆分？
// Content Script 的唯一职责是"在网页中响应键盘快捷键"。所有逻辑围绕单一闭包：
// keymap、port、swReady 等变量被多个函数共享，拆分会引入不必要的接口层和状态传递。
// 同类扩展的 CS 入口都是单文件：Vimium C frontend.ts ~2000+ 行，
// uBlock Origin contentscript.js 同样不拆分。
//
// 生命周期：
// - 无 onUnmounted 清理，页面导航/关闭时整个 JS 环境自动销毁
// - Port 断开后指数退避重连（100ms 起步，上限 1000ms）
// - 检测到 "Extension context invalidated" 时停止重连，不可恢复
//
import { matchShortcut } from '@/logic/shortcut/matcher'
import { toModifierMask, type TShortcutModifier } from '@/logic/shortcut/utils'
import { parseStoredData } from '@/logic/config/compress'
import { SYSTEM_KEYMAP_STORAGE_KEY } from '@/logic/keyboard/keyboard-constants'
import { padUrlHttps } from '@/logic/utils/common'
import {
  REPEATABLE_SCROLL_COMMANDS,
  type TCommandEntry,
} from '@/logic/shortcut/shortcut-command'
import { showToast, t } from './toast'
import {
  getValidatedScrollContainer,
  fastSmoothScrollTo,
  startContinuousScroll,
  stopContinuousScroll,
  fastSmoothScrollToX,
} from './scroll'
import {
  MSG_KEYDOWN,
  MSG_INIT_COMPLETE,
  MSG_HELLO,
  MSG_EXECUTE_COMMAND,
  MSG_SWITCH_BOOKMARK_LAYER,
  type SwToCsMessage,
} from '@/types/messages'

// -- 调试日志 --
const debug = (...args: any[]) => {
  if (
    __DEV__ ||
    (typeof window !== 'undefined' && (window as any).__naivetabDebug)
  ) {
    console.log('[NaiveTab-cs]', ...args)
  }
}

// -- 初始化入口 --
const initMain = () => {
  // 防止重复初始化（Service Worker 回收重建、扩展重载等边界场景）
  // Content Script 通过 manifest 静态声明，浏览器在页面加载时自动注入。
  // 在极少数情况下（如扩展热重载），同一页面可能被注入多次，
  // 此 guard 确保只执行一次初始化逻辑。
  if (window.__naivetabGlobalShortcutInit) {
    debug('Already initialized, skipping')
    return
  }
  window.__naivetabGlobalShortcutInit = true

  // -- 运行时状态 --
  let keymap: Record<string, TBookmarkEntry> = {}
  let isEnabled = false
  let globalShortcutModifiers: TShortcutModifier[] = []
  let shortcutInInputElement = false
  let urlBlacklist: string[] = []
  let bookmarkNoModifierMode = false
  let source = 2 // 数据源：1=浏览器书签，2=扩展内

  // -- 系统书签 keymap（source=1 时来自 chrome.storage.local）--
  let systemKeymap: Record<string, TBookmarkEntry> = {}

  // -- 命令快捷键运行时状态 --
  let commandKeymap: Record<string, TCommandEntry> = {}
  let commandIsEnabled = false
  let commandModifiers: TShortcutModifier[] = []
  let keyboardCommandInInputElement = false
  let commandUrlBlacklist: string[] = []
  let commandNoModifierMode = false

  /**
   * 更新本地配置缓存（书签快捷键）
   */
  const updateConfig = (cfg: {
    isEnabled?: boolean
    globalShortcutModifiers?: TShortcutModifier[]
    shortcutInInputElement?: boolean
    keymap?: Record<string, TBookmarkEntry>
    urlBlacklist?: string[]
    noModifierMode?: boolean
    source?: number
  }) => {
    if (cfg.isEnabled !== undefined) isEnabled = cfg.isEnabled
    if (cfg.globalShortcutModifiers !== undefined)
      globalShortcutModifiers = cfg.globalShortcutModifiers
    if (cfg.shortcutInInputElement !== undefined)
      shortcutInInputElement = cfg.shortcutInInputElement
    if (cfg.keymap !== undefined) keymap = cfg.keymap
    if (cfg.urlBlacklist !== undefined) urlBlacklist = cfg.urlBlacklist
    if (cfg.noModifierMode !== undefined)
      bookmarkNoModifierMode = cfg.noModifierMode
    if (cfg.source !== undefined) source = cfg.source
    debug('bookmark config updated', {
      isEnabled,
      globalShortcutModifiers,
      keymapCount: Object.keys(keymap).length,
    })
  }

  /**
   * 更新命令快捷键本地配置缓存
   */
  const updateCommandConfig = (cfg: {
    isEnabled?: boolean
    modifiers?: TShortcutModifier[]
    shortcutInInputElement?: boolean
    keymap?: Record<string, TCommandEntry>
    urlBlacklist?: string[]
    noModifierMode?: boolean
  }) => {
    if (cfg.isEnabled !== undefined) commandIsEnabled = cfg.isEnabled
    if (cfg.modifiers !== undefined) commandModifiers = cfg.modifiers
    if (cfg.shortcutInInputElement !== undefined)
      keyboardCommandInInputElement = cfg.shortcutInInputElement
    if (cfg.keymap !== undefined) commandKeymap = cfg.keymap
    if (cfg.urlBlacklist !== undefined) commandUrlBlacklist = cfg.urlBlacklist
    if (cfg.noModifierMode !== undefined)
      commandNoModifierMode = cfg.noModifierMode
    debug('command config updated', {
      isEnabled: commandIsEnabled,
      modifiers: commandModifiers,
      keymapCount: Object.keys(commandKeymap).length,
    })
  }

  /**
   * 直接从 chrome.storage.sync 读取初始配置（书签快捷键 + 命令快捷键）
   *
   * chrome.storage API 在 Content Script 中可用（manifest 已有 storage 权限），
   * 读取响应 ~5-20ms，无需唤醒 Service Worker。
   * 如果读取失败或配置为空，保持禁用状态直到 storage.onChanged 触发更新。
   */
  const loadConfig = async () => {
    // 加载书签快捷键配置
    try {
      const keyboardData = await chrome.storage.sync.get(
        'naive-tab-keyboardBookmark',
      )
      const raw = keyboardData['naive-tab-keyboardBookmark'] as
        | string
        | undefined
      if (raw) {
        const parsed = await parseStoredData(raw)
        updateConfig({
          isEnabled: parsed.data.isGlobalShortcutEnabled ?? false,
          globalShortcutModifiers: parsed.data.globalShortcutModifiers ?? [],
          shortcutInInputElement: parsed.data.shortcutInInputElement ?? false,
          keymap: parsed.data.keymap ?? {},
          urlBlacklist: parsed.data.urlBlacklist ?? [],
          noModifierMode: parsed.data.noModifierMode ?? false,
          source: parsed.data.source ?? 2,
        })
        debug('bookmark config loaded from storage', {
          isEnabled,
          globalShortcutModifiers,
          keymapCount: Object.keys(keymap).length,
        })
      } else {
        debug('No keyboard config in storage, keeping shortcuts disabled')
      }
    } catch (e) {
      debug('read/parse keyboard storage error', e)
    }

    // 加载系统书签 keymap（source=1，来自 chrome.storage.local）
    try {
      const localData = await chrome.storage.local.get(
        SYSTEM_KEYMAP_STORAGE_KEY,
      )
      if (localData[SYSTEM_KEYMAP_STORAGE_KEY]) {
        systemKeymap = localData[SYSTEM_KEYMAP_STORAGE_KEY] as Record<
          string,
          TBookmarkEntry
        >
        debug('system keymap loaded from storage.local', {
          keymapCount: Object.keys(systemKeymap).length,
        })
      }
    } catch (e) {
      debug('read/parse system keymap error', e)
    }

    // 加载命令快捷键配置
    try {
      const commandData = await chrome.storage.sync.get(
        'naive-tab-keyboardCommand',
      )
      const raw = commandData['naive-tab-keyboardCommand'] as string | undefined
      if (raw) {
        const parsed = await parseStoredData(raw)
        updateCommandConfig({
          isEnabled: parsed.data.isEnabled ?? false,
          modifiers: parsed.data.modifiers ?? [],
          shortcutInInputElement: parsed.data.shortcutInInputElement ?? false,
          keymap: parsed.data.keymap ?? {},
          urlBlacklist: parsed.data.urlBlacklist ?? [],
          noModifierMode: parsed.data.noModifierMode ?? false,
        })
        debug('command config loaded from storage', {
          isEnabled: commandIsEnabled,
          modifiers: commandModifiers,
          keymapCount: Object.keys(commandKeymap).length,
        })
      } else {
        debug(
          'No keyboardCommand config in storage, keeping command shortcuts disabled',
        )
      }
    } catch (e) {
      debug('read/parse keyboardCommand storage error', e)
    }
  }

  /**
   * 监听 chrome.storage.onChanged，自动同步配置更新（书签快捷键 + 命令快捷键）
   *
   * Content Script 直接监听 storage 变化，解析后更新本地 keymap 缓存。
   * parseStoredData 自动处理 gzip 压缩数据（>4000 字节时压缩）。
   * 监听器无需清理：页面导航/关闭时 JS 环境销毁，自动回收。
   *
   * CS 各自独立解析 gzip 配置是有意为之的设计：
   * gzip 解压极快（~1-3ms），且独立解析是 CS 本地 fallback 的前提。
   */
  chrome.storage.onChanged.addListener((changes, areaName) => {
    // 处理 sync 区域的配置变化
    if (areaName === 'sync') {
      // 书签快捷键配置变化
      const keyboardRaw = changes['naive-tab-keyboardBookmark']?.newValue as
        | string
        | undefined
      if (keyboardRaw) {
        parseStoredData(keyboardRaw)
          .then((parsed) => {
            updateConfig({
              isEnabled: parsed.data.isGlobalShortcutEnabled ?? false,
              globalShortcutModifiers:
                parsed.data.globalShortcutModifiers ?? [],
              shortcutInInputElement:
                parsed.data.shortcutInInputElement ?? false,
              keymap: parsed.data.keymap ?? {},
              urlBlacklist: parsed.data.urlBlacklist ?? [],
              noModifierMode: parsed.data.noModifierMode ?? false,
              source: parsed.data.source ?? 2,
            })
          })
          .catch((e) => {
            debug('parse keyboard storage error', e)
          })
      } else if (changes['naive-tab-keyboardBookmark']) {
        // 配置被删除，重置为默认状态
        updateConfig({
          isEnabled: false,
          globalShortcutModifiers: [],
          shortcutInInputElement: false,
          keymap: {},
          urlBlacklist: [],
          noModifierMode: false,
        })
        debug('bookmark config removed, reset to defaults')
      }

      // 命令快捷键配置变化
      const commandRaw = changes['naive-tab-keyboardCommand']?.newValue as
        | string
        | undefined
      if (commandRaw) {
        parseStoredData(commandRaw)
          .then((parsed) => {
            updateCommandConfig({
              isEnabled: parsed.data.isEnabled ?? false,
              modifiers: parsed.data.modifiers ?? [],
              shortcutInInputElement:
                parsed.data.shortcutInInputElement ?? false,
              keymap: parsed.data.keymap ?? {},
              urlBlacklist: parsed.data.urlBlacklist ?? [],
              noModifierMode: parsed.data.noModifierMode ?? false,
            })
          })
          .catch((e) => {
            debug('parse command storage error', e)
          })
      } else if (changes['naive-tab-keyboardCommand']) {
        // 配置被删除，重置为默认状态
        updateCommandConfig({
          isEnabled: false,
          modifiers: [],
          shortcutInInputElement: false,
          keymap: {},
          urlBlacklist: [],
          noModifierMode: false,
        })
        debug('command config removed, reset to defaults')
      }
    }

    // 处理 local 区域的 systemKeymap 变化（source=1）
    if (areaName === 'local') {
      const systemKeymapRaw = changes[SYSTEM_KEYMAP_STORAGE_KEY]?.newValue as
        | Record<string, TBookmarkEntry>
        | undefined
      if (systemKeymapRaw) {
        systemKeymap = systemKeymapRaw
        debug('system keymap updated from storage.local', {
          keymapCount: Object.keys(systemKeymap).length,
        })
      } else if (changes[SYSTEM_KEYMAP_STORAGE_KEY]) {
        systemKeymap = {}
        debug('system keymap removed from storage.local')
      }
    }
  })

  // -- Port 长连接 --
  /**
   * Port 连接到 SW，用于发送按键事件。
   *
   * 双向通信：
   * - CS → SW：发送按键事件（NAIVETAB_KEYDOWN）
   * - SW → CS：回传需要 DOM 执行的命令（NAIVETAB_EXECUTE_COMMAND）
   */
  let port: chrome.runtime.Port | null = null

  // -- SW 初始化状态 --
  let swReady = false

  // -- 重连延迟策略 --
  // 初始 100ms：chrome.runtime.connect() 是同步返回的，即使 SW 不在运行也会
  // 立即返回 Port 对象并触发后台唤醒。所以 delay 不需要"等 SW 启动"，而是用于
  // 防止 SW 启动后立即断开的重试循环（如配置加载失败主动 disconnect）。
  // 初始值越小，正常断连后的用户感知延迟越低。
  let reconnectDelay = 100
  // 上限 1000ms：足够避免异常场景下的频繁重试，同时不会让慢启动 SW 场景下
  // 的连接尝试偏离实际就绪时间超过 1 秒。不需要提高到 3-5 秒——connect() 本身
  // 会触发 SW 唤醒，更大的 delay 只是让用户多干等。
  const MAX_RECONNECT_DELAY = 1000

  /**
   * CS 端命令执行器
   * 仅处理 execIn='cs' 的命令，需要 DOM 操作
   *
   * 注意：scroll 系列命令不经过此执行器，由 handleKeydown 中的 tryLocalScroll 直接本地执行。
   * newtab 页面不支持滚动命令（无 CS 注入，shortcut-executor.ts 的 newtabCommandExecutors 中不包含 scroll）。
   */
  const commandExecutors: Record<string, () => void> = {
    scrollUp: () => startContinuousScroll('scrollUp'),
    scrollDown: () => startContinuousScroll('scrollDown'),
    scrollToTop: () => fastSmoothScrollTo(0),
    scrollToBottom: () => {
      const el = getValidatedScrollContainer('vertical')
      fastSmoothScrollTo(el.scrollHeight, el)
    },
    scrollPageUp: () => {
      const el = getValidatedScrollContainer('vertical')
      const distance =
        el === document.scrollingElement ? window.innerHeight : el.clientHeight
      fastSmoothScrollTo(el.scrollTop - distance, el)
    },
    scrollPageDown: () => {
      const el = getValidatedScrollContainer('vertical')
      const distance =
        el === document.scrollingElement ? window.innerHeight : el.clientHeight
      fastSmoothScrollTo(el.scrollTop + distance, el)
    },
    scrollLeft: () => startContinuousScroll('scrollLeft'),
    scrollRight: () => startContinuousScroll('scrollRight'),
    scrollToLeft: () => {
      const el = getValidatedScrollContainer('horizontal')
      fastSmoothScrollToX(0, el)
    },
    scrollToRight: () => {
      const el = getValidatedScrollContainer('horizontal')
      fastSmoothScrollToX(el.scrollWidth, el)
    },
    reloadPage: () => location.reload(),
    copyPageUrl: () => {
      navigator.clipboard
        .writeText(location.href)
        .then(() => {
          showToast.success(t('keyboardCommand.toast.copyPageUrl'))
        })
        .catch(() => {
          fallbackCopyText(location.href)
          showToast.success(t('keyboardCommand.toast.copyPageUrl'))
        })
    },
    copyPageTitle: () => {
      navigator.clipboard
        .writeText(document.title)
        .then(() => {
          showToast.success(t('keyboardCommand.toast.copyPageTitle'))
        })
        .catch(() => {
          fallbackCopyText(document.title)
          showToast.success(t('keyboardCommand.toast.copyPageTitle'))
        })
    },
  }

  /**
   * 降级复制方案：当 clipboard API 不可用时使用
   */
  const fallbackCopyText = (text: string) => {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    } catch {
      // 完全失败时静默忽略
    }
  }

  const connectPort = () => {
    try {
      // connect() 同步返回 Port，同时 Chrome 在后台唤醒 SW（如果休眠）。
      // 即使 SW 当前不在运行也不会抛异常，真正的断连通过 onDisconnect 感知。
      // catch 分支仅在扩展卸载、网络异常等极端场景下触发。
      port = chrome.runtime.connect({ name: 'naivetab-shortcut' })
      reconnectDelay = 100
      port.onMessage.addListener((msg: SwToCsMessage) => {
        if (msg.type === MSG_EXECUTE_COMMAND) {
          const executor = commandExecutors[msg.command]
          if (executor) {
            debug('executing CS command:', msg.command)
            executor()
          }
        } else if (msg.type === MSG_INIT_COMPLETE) {
          swReady = true
          debug('SW initialization complete')
        } else if (msg.type === MSG_SWITCH_BOOKMARK_LAYER) {
          showToast.info(
            t('keyboardCommand.toast.switchToLayer').replace(
              '__n__',
              msg.folderName,
            ),
          )
        }
      })
      // 首次连接和重连后主动发握手消息，确认 SW 就绪状态
      port.postMessage({ type: MSG_HELLO })
      port.onDisconnect.addListener(() => {
        const disconnectError = chrome.runtime.lastError
        port = null
        swReady = false
        // 扩展上下文失效（扩展重载/更新），不再重连
        if (
          disconnectError?.message?.includes('Extension context invalidated')
        ) {
          debug('Extension context invalidated on disconnect, stopping')
          return
        }
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
        debug(`Port disconnected, reconnect in ${reconnectDelay}ms`)
        setTimeout(connectPort, reconnectDelay)
      })
      debug('Port connected')
    } catch (e) {
      const err = e as Error
      // 扩展上下文已失效（扩展重载/更新），无法恢复，停止重连
      if (err?.message?.includes('Extension context invalidated')) {
        debug('Extension context invalidated, stopping port reconnect')
        return
      }
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
      debug(`Port connect failed, retrying in ${reconnectDelay}ms`, err)
      setTimeout(connectPort, reconnectDelay)
    }
  }

  /**
   * 键盘事件处理
   *
   * 匹配修饰键（或无修饰键模式下单键）后，通过 Port 将按键事件发送到 SW 统一处理。
   * SW 负责查 keymap 并分发执行（书签打开 URL / 命令路由到 SW 或 CS）。
   * 使用 capture phase (true) 确保在页面脚本之前捕获事件。
   *
   * 两套快捷键共享同一个 handler，根据匹配结果决定 source：
   * - 匹配书签快捷键 → source: 'bookmark'
   * - 匹配命令快捷键 → source: 'command'
   * - 两者修饰键相同或同时开启无修饰键模式 → 书签优先（老功能），只发送一条消息
   */
  const handleKeydown = (e: KeyboardEvent) => {
    /**
     * 尝试本地执行 scroll 命令。
     * scroll 是纯 DOM 操作，CS 本地直接执行即可，无需经 SW 中转。
     * e.repeat 为 true 时跳过 matchShortcut（被其首行拦截），直接从 keymap 读取。
     * 非 repeat 时通过 commandCode 传入匹配结果。
     */
    const tryLocalScroll = (code?: string): boolean => {
      const cmdCode = code ?? commandCode
      if (!cmdCode) return false
      const entry = commandKeymap?.[cmdCode]
      if (!entry?.command) return false
      if (
        !REPEATABLE_SCROLL_COMMANDS.has(
          entry.command as typeof REPEATABLE_SCROLL_COMMANDS extends Set<
            infer U
          >
            ? U
            : never,
        )
      )
        return false

      // 首次按下启动循环，repeat 递增加速——均由 startContinuousScroll 内部处理
      startContinuousScroll(entry.command)
      e.preventDefault()
      e.stopPropagation()
      return true
    }

    // scroll 命令的 e.repeat 放行：按住 J/K 持续滚动
    if (e.repeat) {
      if (!commandIsEnabled || !commandKeymap) return
      if (tryLocalScroll(e.code)) return
      // 非 scroll 命令的 repeat 静默忽略
      return
    }

    // about:blank 页面 hostname 为空字符串 ""，不会命中 urlBlacklist，快捷键正常工作
    const hostname = location.hostname

    // 使用 matchShortcut 复用匹配逻辑（内置输入元素 + urlBlacklist 检查）
    const bookmarkCode = matchShortcut(
      e,
      isEnabled,
      globalShortcutModifiers,
      shortcutInInputElement,
      urlBlacklist,
      hostname,
      bookmarkNoModifierMode,
    )
    const commandCode = matchShortcut(
      e,
      commandIsEnabled,
      commandModifiers,
      keyboardCommandInInputElement,
      commandUrlBlacklist,
      hostname,
      commandNoModifierMode,
    )

    // 无修饰键模式下 matchShortcut 对 ALLOWED_SET 中所有键都返回 code，
    // 但 keymap 中可能没有实际绑定。发送消息前先检查是否真正绑定了命令/书签，
    // 避免拦截页面原生的按键行为（如视频站点的方向键控制进度）。
    const hasCommandBinding =
      commandCode && commandKeymap?.[commandCode]?.command
    const activeBookmarkKeymap = source === 1 ? systemKeymap : keymap
    const hasBookmarkBinding =
      bookmarkCode && activeBookmarkKeymap[bookmarkCode]?.url

    // scroll 命令本地执行，不走 SW
    if (tryLocalScroll()) return

    if (!hasCommandBinding && !hasBookmarkBinding) return

    // 修饰键冲突互斥：当书签和命令使用相同修饰键或同时开启无修饰键模式时，
    // 只发送命令消息（命令优先）
    const bmMask = toModifierMask(globalShortcutModifiers)
    const cmdMask = toModifierMask(commandModifiers)
    const hasModifierConflict =
      hasBookmarkBinding &&
      hasCommandBinding &&
      // 原有：修饰键掩码相等
      ((bmMask === cmdMask &&
        !bookmarkNoModifierMode &&
        !commandNoModifierMode) ||
        // 无修饰键模式：两者同时开启时冲突
        (bookmarkNoModifierMode && commandNoModifierMode))

    // 通过 Port 发送按键事件到 SW，Port 不可用时降级为 sendMessage 兜底。
    //
    // sent 变量的关键作用：只有在至少一条消息成功发出时才拦截按键（preventDefault + stopPropagation）。
    // 避免 Port 断开窗口期内用户按键被吞却无任何响应——Port 断开时 sent 保持 false，
    // 事件继续传递给浏览器默认行为，用户不会感到"按键丢失"。
    //
    // 三层 fallback 机制（按优先级）：
    //   1. Port 正常连接 → port.postMessage（最低延迟）
    //   2. Port 不可用（SW 休眠/断连） → chrome.runtime.sendMessage（唤醒 SW，~50-200ms 延迟）
    //   3. 书签快捷键专属 fallback → 使用本地 keymap 直接打开 URL（零延迟，不依赖 SW）
    //
    // Chrome MV3 的 SW 在 30s 空闲后会被终止，Port 连接也随之断开。
    // sendMessage 能确保即使 SW 正在休眠也能被唤醒处理命令。
    let sent = false
    try {
      // 命令优先：冲突时只发送命令
      if (hasCommandBinding) {
        if (swReady && port) {
          port.postMessage({
            type: MSG_KEYDOWN,
            key: e.code,
            source: 'command',
          })
          sent = true
        } else {
          // Port 不可用：sendMessage 唤醒 SW，命令快捷键依赖 SW 执行
          try {
            chrome.runtime.sendMessage({
              type: MSG_KEYDOWN,
              key: e.code,
              source: 'command',
            })
            sent = true
          } catch {
            // SW 被卸载等极端场景，无法唤醒，不拦截按键
          }
        }
      }
      if (hasBookmarkBinding && !hasModifierConflict) {
        if (swReady && port) {
          port.postMessage({
            type: MSG_KEYDOWN,
            key: e.code,
            source: 'bookmark',
          })
          sent = true
        } else {
          // Port 不可用：先用 sendMessage 唤醒 SW，再用本地 keymap 兜底
          try {
            chrome.runtime.sendMessage({
              type: MSG_KEYDOWN,
              key: e.code,
              source: 'bookmark',
            })
          } catch {
            // sendMessage 也可能失败（SW 被卸载等极端场景）
          }
          sent = true
          // 同时用本地 keymap 直接处理，零延迟响应用户
          // source=1 时使用 systemKeymap，source=2 时使用持久化 keymap
          const activeKeymap = source === 1 ? systemKeymap : keymap
          const entry = activeKeymap[e.code]
          if (entry?.url) {
            e.preventDefault()
            e.stopPropagation()
            chrome.tabs.create({ url: padUrlHttps(entry.url) })
          }
        }
      }
      // 只有在至少一条消息成功发出时才拦截按键，
      // 避免 Port 断开窗口期内用户按键被吞却无任何响应
      if (sent) {
        e.preventDefault()
        e.stopPropagation()
      }
    } catch {
      // Port 异常时静默忽略，重连机制会自动恢复，不拦截按键
    }
  }

  // 初始化
  debug('init')
  loadConfig()
  connectPort()

  // 使用 capture phase 捕获事件，快捷键优先于页面逻辑响应
  document.addEventListener('keydown', handleKeydown, true)

  // keyup 时停止持续滚动
  // 不检查 commandIsEnabled：即使命令已禁用，stopContinuousScroll 也是幂等操作，
  // 且 keydown 时未启动的滚动 stop 也无副作用
  const handleKeyup = (e: KeyboardEvent) => {
    const entry = commandKeymap?.[e.code]
    if (
      entry &&
      REPEATABLE_SCROLL_COMMANDS.has(
        entry.command as typeof REPEATABLE_SCROLL_COMMANDS extends Set<infer U>
          ? U
          : never,
      )
    ) {
      stopContinuousScroll()
    }
  }
  document.addEventListener('keyup', handleKeyup, true)

  // BFCache 恢复后重建 Port 连接（导航返回时不重新加载 JS，Port 已断开）
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && !port) {
      debug('BFCache restore, reconnecting port')
      connectPort()
    }
  })
}

initMain()
