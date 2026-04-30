/**
 * 全局快捷键组合键工具函数
 *
 * 组合键格式: "{modifier}+...+{mainKeyCode}" (全小写)
 * 示例: "ctrl+shift+keyk", "alt+digit1", "meta+keya"
 *
 * 修饰键顺序: ctrl → shift → alt → meta
 * 默认必须至少包含一个修饰键；noModifierMode 开启后只需单个主键即可匹配。
 */

import { isMacOS } from '@/env'

/**
 * 清理并标准化域名：去掉协议、路径、端口、www 前缀，统一转小写。
 * 用于黑名单输入的规范化处理，保证匹配一致性。
 */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '') // 去掉协议前缀
    .replace(/[/:?#].*$/, '') // 去掉端口、路径、参数、锚点
    .replace(/^www\./i, '') // 去掉 www. 前缀
    .toLowerCase() // 域名不区分大小写
}

/**
 * 检查 URL 是否在黑名单中
 *
 * 支持三种格式：
 * - 完整域名：'google.com' — 匹配 google.com 及所有子域名
 * - 通配符模式：'*.google.com' — 匹配 google.com 及所有子域名（与上一种等价）
 * - 全量通配符：'*' — 匹配所有域名
 *
 * 内部对 pattern 自动做 normalize 处理，保证与输入端的清理逻辑一致。
 *
 * @param hostname 当前页面 hostname（如 'docs.google.com'）
 * @param blacklist 黑名单数组
 */
export function isUrlInBlacklist(
  hostname: string,
  blacklist: string[],
): boolean {
  if (!blacklist || blacklist.length === 0) return false

  const normalizedHostname = normalizeDomain(hostname)

  for (const pattern of blacklist) {
    if (!pattern) continue
    const domain = pattern.startsWith('*.')
      ? pattern.slice(2)
      : normalizeDomain(pattern)

    // '*' 匹配所有域名
    if (domain === '*') return true

    // 精确匹配或子域名匹配
    if (
      normalizedHostname === domain ||
      normalizedHostname.endsWith('.' + domain)
    )
      return true
  }
  return false
}

/**
 * 允许作为主键的 event.code 列表
 * 包含字母、数字、符号、数字小键盘、功能键、导航键
 */
export const ALLOWED_MAIN_KEYS = [
  // 字母
  'KeyA',
  'KeyB',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyI',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyM',
  'KeyN',
  'KeyO',
  'KeyP',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyT',
  'KeyU',
  'KeyV',
  'KeyW',
  'KeyX',
  'KeyY',
  'KeyZ',
  // 数字
  'Digit0',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  // 符号
  'Comma',
  'Period',
  'Slash',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Semicolon',
  'Quote',
  'Backquote',
  'Backslash',
  'IntlBackslash',
  // 数字小键盘
  'Numpad0',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'NumpadDecimal',
  'NumpadEnter',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  // 功能键
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  // 导航键
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
]

export const ALLOWED_SET = new Set(ALLOWED_MAIN_KEYS)

export const VALID_MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const
export type TShortcutModifier = (typeof VALID_MODIFIERS)[number]

/**
 * 修饰键位掩码映射
 * 用于快速判断修饰键集合是否匹配，O(1) 整数比较
 */
export const MODIFIER_BIT: Record<TShortcutModifier, number> = {
  ctrl: 1,
  shift: 2,
  alt: 4,
  meta: 8,
}

/**
 * 将修饰键数组转为位掩码整数
 * 例：['shift', 'alt'] → 2|4 = 6
 */
export const toModifierMask = (keys: TShortcutModifier[]): number =>
  keys.reduce((mask, key) => mask | (MODIFIER_BIT[key] || 0), 0)

/**
 * 从 KeyboardEvent 提取当前修饰键数组
 * 例: e.ctrlKey=true, e.shiftKey=true → ["ctrl", "shift"]
 * 没有修饰键时返回空数组
 *
 * 数组顺序固定为 ctrl → shift → alt → meta。
 * 主要用于 UI 展示（formatModifierKeys）和配置存储。
 * matchShortcut 内部将数组转为位掩码后比较，不依赖书写顺序。
 */
export function buildModifierKeys(e: KeyboardEvent): TShortcutModifier[] {
  const keys: TShortcutModifier[] = []
  if (e.ctrlKey) keys.push('ctrl')
  if (e.shiftKey) keys.push('shift')
  if (e.altKey) keys.push('alt')
  if (e.metaKey) keys.push('meta')
  return keys
}

/**
 * 将修饰键数组格式化为可读形式
 * ["ctrl", "shift"] → "Ctrl + Shift" (Windows) / "Ctrl + Opt" (Mac)
 * 单个元素也正常工作：["alt"] → "Opt" (Mac) / "Alt" (Windows)
 */
export function formatModifierKeys(keys: string[]): string {
  if (!keys || keys.length === 0) return ''
  const isMac = isMacOS

  const MODIFIER_LABEL_MAP: Record<string, string> = isMac
    ? { ctrl: 'Ctrl', shift: 'Shift', alt: 'Opt', meta: 'Cmd' }
    : { ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', meta: 'Win' }

  return keys.map((part) => MODIFIER_LABEL_MAP[part] || part).join(' + ')
}

/**
 * 检查当前活跃元素是否为输入元素
 *
 * 输入元素包括:
 * - INPUT、TEXTAREA、contenteditable 元素
 * - ARIA 角色为 textbox / searchbox / combobox 的元素
 * - iframe（焦点在 iframe 内时，无法判断内部是否输入，保守跳过）
 * - designMode 为 on 的文档（如 Notion、Google Docs 编辑器区域）
 *
 * 用于判断全局快捷键是否应该被过滤（避免干扰打字）
 */
export function isInInputElement(): boolean {
  const active = document.activeElement
  if (!active) return false

  // iframe：无法探测内部状态，保守跳过快捷键
  if (active.tagName === 'IFRAME') return true

  const tag = active.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (
    active.getAttribute('contenteditable') === 'true' ||
    active.getAttribute('contenteditable') === ''
  )
    return true

  // ARIA 输入角色
  const role = active.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox')
    return true

  // designMode：整个文档处于编辑模式（Notion、Google Docs 等）
  if (document.designMode === 'on') return true

  return false
}

/**
 * 全局快捷键匹配公共函数（纯匹配，无副作用）
 *
 * 封装核心匹配逻辑：输入元素检查 → 黑名单检查 → 修饰键/无修饰键匹配 → 主键检查
 * Content Script 和 newtab 页面复用此函数，避免逻辑重复
 *
 * 修饰键比较采用位掩码方式（ctrl=1, shift=2, alt=4, meta=8），
 * 一次整数相等判断即完成集合匹配，O(1) 且零分配。
 * 从根本上消除了 bug（字符串 'alt+shift' ≠ 'shift+alt'）。
 *
 * @param noModifierMode 无修饰键模式，开启后只需按单个主键即可匹配（有修饰键按下时不匹配）
 * @returns 匹配成功返回 event.code，失败返回 null
 */
export function matchShortcut(
  e: KeyboardEvent,
  isEnabled: boolean,
  globalShortcutModifiers: TShortcutModifier[],
  shortcutInInputElement: boolean,
  urlBlacklist?: string[],
  hostname?: string,
  noModifierMode?: boolean,
): string | null {
  if (e.repeat) return null
  if (!isEnabled) return null

  // 输入元素中：由 shortcutInInputElement 配置决定是否放行
  if (!shortcutInInputElement && isInInputElement()) return null

  // URL 黑名单
  if (
    hostname &&
    urlBlacklist &&
    urlBlacklist.length > 0 &&
    isUrlInBlacklist(hostname, urlBlacklist)
  )
    return null

  // 无修饰键模式：跳过修饰键检查，直接匹配主键
  if (noModifierMode) {
    if (!ALLOWED_SET.has(e.code)) return null
    // 有修饰键按下时不匹配，防止劫持 Ctrl+C 等系统快捷键
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return null
    return e.code
  }

  // 配置修饰键为空或未配置时不匹配
  if (!globalShortcutModifiers || globalShortcutModifiers.length === 0) {
    console.warn(
      '[NaiveTab] global shortcut enabled but modifiers is empty, shortcuts will not fire',
    )
    return null
  }

  // 位掩码比较：修饰键映射为 4-bit 整数，一次整数判断完成集合匹配，零分配
  const configMask = toModifierMask(globalShortcutModifiers)
  const eventMask =
    (e.ctrlKey ? 1 : 0) |
    (e.shiftKey ? 2 : 0) |
    (e.altKey ? 4 : 0) |
    (e.metaKey ? 8 : 0)
  if (eventMask !== configMask) return null

  /**
   * 【两套快捷键默认隔离原理】
   * 匹配逻辑为修饰键位掩码相等比较，两套系统默认修饰键不同，天然隔离：
   *   - 书签快捷键（keyboard widget）：modifiers = ["alt"]       → mask = 4
   *   - 全局命令快捷键：                  modifiers = ["shift", "alt"] → mask = 6
   *
   * 例：用户按 Alt+K 时，eventMask = 4
   *   - 书签： 4 === 4  → 匹配
   *   - 命令： 4 !== 6  → 不匹配
   * 因此同一主键不会在两套系统中同时触发。
   *
   * 冲突场景：
   * 1. 用户手动将两套系统的修饰键改为相同 → contentScripts/index.ts 的 hasModifierConflict 拦截（命令优先）
   * 2. 两者同时开启 noModifierMode → 同键同时匹配 → CS 侧 hasModifierConflict 拦截（命令优先）
   */

  // 检查主键是否在允许列表中
  if (!ALLOWED_SET.has(e.code)) return null

  return e.code
}

/**
 * 共享 Port 长连接（newtab 页面专用）
 *
 * 书签快捷键和命令快捷键共用同一个 Port（name='naivetab-shortcut'），
 * 避免两个独立 Port 连接到 SW 时，portMap 中同一个 tabId 的 entry 被覆盖。
 *
 * SW 端在 background/main.ts 的 onConnect 中接收。
 * 断开后指数退避自动重连。
 *
 * SW 就绪状态管理：
 * - 监听 INIT_COMPLETE 标记 swReady = true（SW 配置加载完成）
 * - Port 断开时重置 swReady = false
 * - 两个 handler 通过 isSwReady() 统一查询
 */

import { MSG_INIT_COMPLETE } from '@/types/messages'

let port: chrome.runtime.Port | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 100
const MAX_RECONNECT_DELAY = 1000

/** SW 初始化就绪状态，由 Port 消息监听统一管理 */
let swReady = false

const scheduleReconnect = () => {
  if (reconnectTimer) return
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectDelay = 100
    getSharedPort()
  }, reconnectDelay)
}

/**
 * 检查 SW 是否已完成初始化
 * 书签/命令快捷键共用此状态，SW 未就绪时应提示用户
 */
export const isSwReady = () => swReady

/**
 * 获取或创建共享 Port 连接
 */
export const getSharedPort = (): chrome.runtime.Port => {
  if (!port) {
    port = chrome.runtime.connect({ name: 'naivetab-shortcut' })
    reconnectDelay = 100
    port.onMessage.addListener((msg: { type: string }) => {
      if (msg.type === MSG_INIT_COMPLETE) {
        swReady = true
      }
    })
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError
      swReady = false
      port = null
      scheduleReconnect()
    })
  }
  return port
}
