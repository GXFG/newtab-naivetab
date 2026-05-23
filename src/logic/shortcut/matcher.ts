/**
 * @module shortcut/matcher
 * @description 快捷键匹配核心 — 位掩码比较，O(1) 修饰键集合匹配。
 *   支持 noModifierMode、输入框内过滤、URL 黑名单等高级匹配。
 * @dependencies keyboard/keyboard-constants.ts（ALLOWED_SET）、shortcut/utils.ts
 * @consumers shortcut/port.ts、contentScripts/index.ts、shortcut/shortcut-executor.ts
 * @see docs/features/global-shortcut.md
 */
import { ALLOWED_SET } from '@/logic/keyboard/keyboard-constants'
import { isUrlInBlacklist, isInInputElement, toModifierMask } from './utils'
import type { TShortcutModifier } from './utils'

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

  if (!shortcutInInputElement && isInInputElement(e)) return null

  if (
    hostname &&
    urlBlacklist &&
    urlBlacklist.length > 0 &&
    isUrlInBlacklist(hostname, urlBlacklist)
  )
    return null

  if (noModifierMode) {
    if (!ALLOWED_SET.has(e.code)) return null
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return null
    return e.code
  }

  if (!globalShortcutModifiers || globalShortcutModifiers.length === 0) {
    console.warn(
      '[NaiveTab] global shortcut enabled but modifiers is empty, shortcuts will not fire',
    )
    return null
  }

  const configMask = toModifierMask(globalShortcutModifiers)
  const eventMask =
    (e.ctrlKey ? 1 : 0) |
    (e.shiftKey ? 2 : 0) |
    (e.altKey ? 4 : 0) |
    (e.metaKey ? 8 : 0)
  if (eventMask !== configMask) return null

  if (!ALLOWED_SET.has(e.code)) return null

  return e.code
}
