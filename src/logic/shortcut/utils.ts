/**
 * @module shortcut/utils
 * @description 快捷键工具函数 — 域名规范化、URL 黑名单、修饰键位掩码转换、输入元素检测。
 * @dependencies env.ts（isMacOS）
 * @consumers shortcut/matcher.ts、shortcut/shortcut-command.ts
 * @see docs/features/global-shortcut.md
 */
import { isMacOS } from '@/env'

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[/:?#].*$/, '')
    .replace(/^www\./i, '')
    .toLowerCase()
}

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

    if (domain === '*') return true

    if (
      normalizedHostname === domain ||
      normalizedHostname.endsWith('.' + domain)
    )
      return true
  }
  return false
}

export const VALID_MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const
export type TShortcutModifier = (typeof VALID_MODIFIERS)[number]

export const MODIFIER_BIT: Record<TShortcutModifier, number> = {
  ctrl: 1,
  shift: 2,
  alt: 4,
  meta: 8,
}

export const toModifierMask = (keys: TShortcutModifier[]): number =>
  keys.reduce((mask, key) => mask | (MODIFIER_BIT[key] || 0), 0)

export function buildModifierKeys(e: KeyboardEvent): TShortcutModifier[] {
  const keys: TShortcutModifier[] = []
  if (e.ctrlKey) keys.push('ctrl')
  if (e.shiftKey) keys.push('shift')
  if (e.altKey) keys.push('alt')
  if (e.metaKey) keys.push('meta')
  return keys
}

export function formatModifierKeys(keys: string[]): string {
  if (!keys || keys.length === 0) return ''
  const isMac = isMacOS

  const MODIFIER_LABEL_MAP: Record<string, string> = isMac
    ? { ctrl: 'Ctrl', shift: 'Shift', alt: 'Opt', meta: 'Cmd' }
    : { ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt', meta: 'Win' }

  return keys.map((part) => MODIFIER_LABEL_MAP[part] || part).join(' + ')
}

/**
 * 检查键盘事件的 target 是否为输入类元素。
 *
 * 采用双路径检测（参考 Vimium C 的 findNewEditable + 原始 Vimium 的 event.target 检查）：
 * 1. document.designMode（文档级状态，提前判断）
 * 2. document.activeElement（优先，浏览器焦点状态）—— 焦点转移竞态下更新最快，
 *    点击输入框后立即按键时 focus 事件先于 keydown，activeElement 已更新
 * 3. composedPath（兜底，Shadow DOM 穿透）—— 当 activeElement 指向 Shadow Host
 *    而非 Shadow Root 内实际 input 时，composedPath 包含完整事件路径
 *
 * 仅用 composedPath：点击后立即按键，keydown 的 target 可能仍是旧元素 → 漏判
 * 仅用 activeElement：Shadow DOM 内 input 的 activeElement 可能指向 host → 漏判
 *
 * 支持 input/textarea/select/contenteditable/embed/object 等。
 * contenteditable 使用 element.isContentEditable（DOM 只读属性，自动处理继承链），
 * 而非 getAttribute('contenteditable')。
 * input 需排除不可编辑 type：button/checkbox/radio/file/hidden/image/submit/reset/color/range。
 */
export function isInInputElement(e: KeyboardEvent): boolean {
  // 文档级可编辑模式提前判断，避免在 composedPath 循环中重复检查
  if (document.designMode === 'on') return true

  // 优先：检查当前聚焦元素（Vimium C 的主要检测手段）
  const active = document.activeElement
  if (
    active instanceof Element &&
    active !== document.body &&
    isInputElementLike(active)
  ) {
    return true
  }

  // 兜底：通过事件传播路径检测（Shadow DOM 场景）
  const path = e.composedPath()
  for (const el of path) {
    if (!(el instanceof Element)) continue
    if (isInputElementLike(el)) return true
  }
  return false
}

/**
 * 判断单个元素是否为输入类元素。
 * 参考 Vimium C getEditableType_ 和原始 Vimium isSelectable/isEditable。
 */
function isInputElementLike(el: Element): boolean {
  if (el.tagName === 'IFRAME') return true

  // embed/object 是可聚焦的嵌入式内容（如 Flash/PDF 阅读器）
  const tag = el.tagName
  if (tag === 'EMBED' || tag === 'OBJECT') return true

  if (tag === 'INPUT') {
    // 排除不可编辑的 input type（参考 Vimium C uneditableInputs_）
    const type = (el as HTMLInputElement).type.toLowerCase()
    return !UNEDITABLE_INPUT_TYPES.has(type)
  }
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true

  // 使用 isContentEditable 而非 getAttribute，自动处理继承链
  // 当父元素设置了 contenteditable="true" 时，子元素的 getAttribute 返回 null，
  // 但 isContentEditable 仍为 true（参考 Vimium lib/dom_utils.js）
  if ((el as HTMLElement).isContentEditable) return true

  const role = el.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox')
    return true

  return false
}

/**
 * html5 input 中不接收文本输入的类型（参考 Vimium C uneditableInputs_）。
 * 浏览器将未知 type 视为 "text"，不在排除列表中。
 */
const UNEDITABLE_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])
