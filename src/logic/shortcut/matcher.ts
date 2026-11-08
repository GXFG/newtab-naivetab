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

  // hostname 为空即跳过黑名单：扩展自身页面（chrome-extension://，hostname 为 ''）
  // 和 about:blank 都没有可比对的域名。黑名单的语义是"在这些域名下禁用"，
  // 不是"除白名单外全禁用"——用户在自己的新标签页上按快捷键，理应始终有效。
  //
  // 不要为了"让黑名单更严格"改成按 location.href 匹配：只要某条规则足够宽
  // （例如带上 chrome-extension），就会连带命中扩展页，新标签页快捷键集体失效，
  // 而且极难排查。这不是 bug，是有意留的短路。
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
