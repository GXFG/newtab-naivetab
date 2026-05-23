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

describe('CS_COMMANDS 派生正确性', () => {
  it('从 COMMAND_CATEGORIES 中所有 execEnv: "cs" 的命令派生', async () => {
    const { CS_COMMANDS, COMMAND_CATEGORIES } = await import(
      '@/logic/shortcut/shortcut-command'
    )

    const expectedCs = COMMAND_CATEGORIES.flatMap((cat) =>
      cat.commands.filter((c) => c.execEnv === 'cs').map((c) => c.command),
    )
    expect(CS_COMMANDS).toEqual(expect.arrayContaining(expectedCs))
    expect(CS_COMMANDS.length).toBe(expectedCs.length)
  })

  it('包含所有 scroll 系列 + copyPageUrl/copyPageTitle/reloadPage', async () => {
    const { CS_COMMANDS } = await import('@/logic/shortcut/shortcut-command')
    const requiredCommands = [
      'scrollUp',
      'scrollDown',
      'scrollLeft',
      'scrollRight',
      'copyPageUrl',
      'copyPageTitle',
      'reloadPage',
    ]
    for (const cmd of requiredCommands) {
      expect(CS_COMMANDS).toContain(cmd)
    }
  })

  it('三命令列表互不重叠', async () => {
    const { CS_COMMANDS, NEWTAB_COMMANDS, SW_COMMANDS } = await import(
      '@/logic/shortcut/shortcut-command'
    )
    const csSet = new Set(CS_COMMANDS)
    const newtabSet = new Set(NEWTAB_COMMANDS)
    const swSet = new Set(SW_COMMANDS)

    for (const cmd of CS_COMMANDS) {
      expect(newtabSet.has(cmd)).toBe(false)
      expect(swSet.has(cmd)).toBe(false)
    }
    for (const cmd of NEWTAB_COMMANDS) {
      expect(csSet.has(cmd)).toBe(false)
      expect(swSet.has(cmd)).toBe(false)
    }
    for (const cmd of SW_COMMANDS) {
      expect(csSet.has(cmd)).toBe(false)
      expect(newtabSet.has(cmd)).toBe(false)
    }
  })
})

describe('SW_COMMANDS 派生正确性', () => {
  it('SW + CS + NEWTAB 并集等于 COMMAND_CATEGORIES 全部命令', async () => {
    const { SW_COMMANDS, CS_COMMANDS, NEWTAB_COMMANDS, COMMAND_CATEGORIES } =
      await import('@/logic/shortcut/shortcut-command')

    const allFromCategories = new Set(
      COMMAND_CATEGORIES.flatMap((cat) => cat.commands.map((c) => c.command)),
    )
    const allFromLists = new Set([
      ...SW_COMMANDS,
      ...CS_COMMANDS,
      ...NEWTAB_COMMANDS,
    ])

    expect(allFromLists).toEqual(allFromCategories)
  })
})

describe('getCommandExecEnv 完整性', () => {
  it('遍历 COMMAND_CATEGORIES 所有命令，返回值与声明 execEnv 一致', async () => {
    const { getCommandExecEnv, COMMAND_CATEGORIES } = await import(
      '@/logic/shortcut/shortcut-command'
    )

    for (const category of COMMAND_CATEGORIES) {
      for (const cmd of category.commands) {
        const expectedEnv = cmd.execEnv || 'sw'
        const actualEnv = getCommandExecEnv(cmd.command)
        expect(actualEnv).toBe(expectedEnv)
      }
    }
  })
})

describe('REPEATABLE_SCROLL_COMMANDS', () => {
  it('是 Set 类型且包含 4 个滚动命令', async () => {
    const { REPEATABLE_SCROLL_COMMANDS } = await import(
      '@/logic/shortcut/shortcut-command'
    )

    expect(REPEATABLE_SCROLL_COMMANDS).toBeInstanceOf(Set)
    expect(REPEATABLE_SCROLL_COMMANDS.has('scrollUp')).toBe(true)
    expect(REPEATABLE_SCROLL_COMMANDS.has('scrollDown')).toBe(true)
    expect(REPEATABLE_SCROLL_COMMANDS.has('scrollLeft')).toBe(true)
    expect(REPEATABLE_SCROLL_COMMANDS.has('scrollRight')).toBe(true)
    expect(REPEATABLE_SCROLL_COMMANDS.size).toBe(4)
  })

  it('不包含单次触发滚动命令', async () => {
    const { REPEATABLE_SCROLL_COMMANDS } = await import(
      '@/logic/shortcut/shortcut-command'
    )
    expect(REPEATABLE_SCROLL_COMMANDS.has('scrollToTop')).toBe(false)
    expect(REPEATABLE_SCROLL_COMMANDS.has('scrollPageUp')).toBe(false)
  })
})
