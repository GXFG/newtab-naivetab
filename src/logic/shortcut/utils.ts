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

export function isInInputElement(): boolean {
  const active = document.activeElement
  if (!active) return false

  if (active.tagName === 'IFRAME') return true

  const tag = active.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (
    active.getAttribute('contenteditable') === 'true' ||
    active.getAttribute('contenteditable') === ''
  )
    return true

  const role = active.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox')
    return true

  if (document.designMode === 'on') return true

  return false
}
