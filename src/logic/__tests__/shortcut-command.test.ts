import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * shortcut-command.test.ts — 测试 shortcut-command.ts 中的 getCommandExecEnv 函数
 *
 * getCommandExecEnv 遍历 COMMAND_CATEGORIES 查找命令的执行环境，
 * 默认返回 'sw'（Service Worker）。
 */

vi.mock('@/logic/config/state', () => ({
  localConfig: {
    keyboardCommand: {
      isEnabled: true,
      noModifierMode: false,
      modifiers: ['shift', 'alt'],
      keymap: {},
    },
  },
}))

vi.mock('@/env', () => ({
  isMacOS: false,
}))

describe('getCommandExecEnv', () => {
  let getCommandExecEnv: typeof import('@/logic/shortcut/shortcut-command')['getCommandExecEnv']

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/logic/shortcut/shortcut-command')
    getCommandExecEnv = mod.getCommandExecEnv
  })

  it('returns "sw" for default tab navigation commands', () => {
    expect(getCommandExecEnv('prevTab')).toBe('sw')
    expect(getCommandExecEnv('nextTab')).toBe('sw')
    expect(getCommandExecEnv('closeTab')).toBe('sw')
  })

  it('returns "cs" for content script commands', () => {
    expect(getCommandExecEnv('copyPageUrl')).toBe('cs')
    expect(getCommandExecEnv('copyPageTitle')).toBe('cs')
    expect(getCommandExecEnv('scrollToTop')).toBe('cs')
    expect(getCommandExecEnv('scrollToBottom')).toBe('cs')
  })

  it('returns "newtab" for newtab-specific commands', () => {
    expect(getCommandExecEnv('toggleFocusMode')).toBe('newtab')
    expect(getCommandExecEnv('toggleDragMode')).toBe('newtab')
    expect(getCommandExecEnv('toggleSettingDrawer')).toBe('newtab')
  })

  it('returns "sw" for commands without explicit execEnv', () => {
    expect(getCommandExecEnv('reloadAllTabsAllWindows')).toBe('sw')
    expect(getCommandExecEnv('prevTab')).toBe('sw')
  })

  it('returns "sw" for unknown commands (default fallback)', () => {
    expect(getCommandExecEnv('nonexistentCommand' as any)).toBe('sw')
  })
})

describe('KEYBOARD_COMMAND_CONFIG', () => {
  it('has default keymap entries', async () => {
    const { KEYBOARD_COMMAND_CONFIG } = await import('@/logic/config/defaults')
    expect(KEYBOARD_COMMAND_CONFIG.keymap.KeyA.command).toBe('prevTab')
    expect(KEYBOARD_COMMAND_CONFIG.keymap.KeyD.command).toBe('nextTab')
    expect(KEYBOARD_COMMAND_CONFIG.keymap.KeyX.command).toBe('closeTab')
  })

  it('has default modifiers', async () => {
    const { KEYBOARD_COMMAND_CONFIG } = await import('@/logic/config/defaults')
    expect(KEYBOARD_COMMAND_CONFIG.modifiers).toEqual(['shift', 'alt'])
  })
})
