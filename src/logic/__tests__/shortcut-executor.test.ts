import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * shortcut-executor.test.ts — 测试 newtab 页面全局快捷键执行器
 *
 * Mock 策略：
 * - @/logic/task → 捕获 addKeydownTask/removeKeydownTask 调用
 * - @/logic/globalShortcut/shortcut-utils → 控制 matchShortcut / isSwReady / getSharedPort
 * - @/logic/store → 控制 localConfig / localState / globalState
 * - @/logic/moveable → toggleIsDragMode spy
 * - @/logic/globalShortcut/shortcut-command → getCommandExecEnv
 */

let mockAddKeydownTask: ReturnType<typeof vi.fn>
let mockRemoveKeydownTask: ReturnType<typeof vi.fn>
let mockMatchShortcut: ReturnType<typeof vi.fn>
let mockIsSwReady: ReturnType<typeof vi.fn>
let mockGetSharedPort: ReturnType<typeof vi.fn>
let mockToggleIsDragMode: ReturnType<typeof vi.fn>
let mockGetCommandExecEnv: ReturnType<typeof vi.fn>
let mockSwitchSettingDrawerVisible: ReturnType<typeof vi.fn>
let mockPort: { postMessage: ReturnType<typeof vi.fn>; onMessage: { addListener: ReturnType<typeof vi.fn> }; onDisconnect: { addListener: ReturnType<typeof vi.fn> } }
let mockMessage: { warning: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> }

const baseLocalConfig = (overrides?: {
  bookmarkModifiers?: readonly string[]
  commandModifiers?: readonly string[]
  commandKeymap?: Record<string, { command: string }>
  noModifierModeBookmark?: boolean
  noModifierModeCommand?: boolean
}) => ({
  keyboardBookmark: {
    isGlobalShortcutEnabled: true,
    globalShortcutModifiers: (overrides?.bookmarkModifiers ?? ['alt']) as readonly string[],
    shortcutInInputElement: false,
    urlBlacklist: [] as string[],
    noModifierMode: overrides?.noModifierModeBookmark ?? false,
  },
  keyboardCommand: {
    isEnabled: true,
    modifiers: (overrides?.commandModifiers ?? ['shift', 'alt']) as readonly string[],
    shortcutInInputElement: false,
    urlBlacklist: [] as string[],
    noModifierMode: overrides?.noModifierModeCommand ?? false,
    keymap: overrides?.commandKeymap ?? {
      KeyF: { command: 'toggleFocusMode' },
      KeyD: { command: 'toggleDragMode' },
      KeyS: { command: 'toggleSettingDrawer' },
      KeyR: { command: 'reloadPage' },
    },
  },
})

function setupMocks(options?: {
  isFocusMode?: boolean
  isSettingDrawerVisible?: boolean
  swReady?: boolean
  localConfig?: ReturnType<typeof baseLocalConfig>
}) {
  vi.resetModules()

  mockAddKeydownTask = vi.fn()
  mockRemoveKeydownTask = vi.fn()
  vi.doMock('@/logic/task', () => ({
    addKeydownTask: mockAddKeydownTask,
    removeKeydownTask: mockRemoveKeydownTask,
  }))

  mockMatchShortcut = vi.fn()
  mockIsSwReady = vi.fn().mockReturnValue(options?.swReady ?? true)
  mockPort = {
    postMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onDisconnect: { addListener: vi.fn() },
  }
  mockGetSharedPort = vi.fn().mockReturnValue(mockPort)
  vi.doMock('@/logic/globalShortcut/shortcut-utils', () => ({
    matchShortcut: mockMatchShortcut,
    isSwReady: mockIsSwReady,
    toModifierMask: (keys: readonly string[]) => keys.length,
    getSharedPort: mockGetSharedPort,
  }))

  mockSwitchSettingDrawerVisible = vi.fn()
  const localState = { value: { isFocusMode: options?.isFocusMode ?? false } }
  const globalState = { isSettingDrawerVisible: options?.isSettingDrawerVisible ?? false }
  vi.doMock('@/logic/store', () => ({
    localConfig: options?.localConfig ?? baseLocalConfig(),
    localState,
    globalState,
    switchSettingDrawerVisible: mockSwitchSettingDrawerVisible,
  }))

  mockToggleIsDragMode = vi.fn()
  vi.doMock('@/logic/moveable', () => ({
    toggleIsDragMode: mockToggleIsDragMode,
  }))

  mockGetCommandExecEnv = vi.fn().mockReturnValue('newtab')
  vi.doMock('@/logic/globalShortcut/shortcut-command', () => ({
    getCommandExecEnv: mockGetCommandExecEnv,
  }))

  mockMessage = { warning: vi.fn(), info: vi.fn(), success: vi.fn() }
  vi.stubGlobal('$message', mockMessage)
  vi.stubGlobal('$t', vi.fn((key: string) => key))
}

async function setupExecutor() {
  const executor = await import('@/logic/globalShortcut/shortcut-executor')
  executor.setupNewtabGlobalShortcut()
  return mockAddKeydownTask.mock.calls[0][1] as (e: KeyboardEvent) => boolean | void
}

describe('setupNewtabGlobalShortcut', () => {
  beforeEach(() => { setupMocks() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('registers keydown task with correct name', async () => {
    await setupExecutor()
    expect(mockAddKeydownTask).toHaveBeenCalledWith('globalShortcut', expect.any(Function))
  })

  it('registers port command listener', async () => {
    await setupExecutor()
    expect(mockGetSharedPort).toHaveBeenCalled()
    expect(mockPort.onMessage.addListener).toHaveBeenCalled()
  })
})

describe('cleanupNewtabGlobalShortcut', () => {
  beforeEach(() => { setupMocks() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('removes keydown task', async () => {
    const executor = await import('@/logic/globalShortcut/shortcut-executor')
    executor.cleanupNewtabGlobalShortcut()
    expect(mockRemoveKeydownTask).toHaveBeenCalledWith('globalShortcut')
  })
})

describe('globalShortcutTask — local commands', () => {
  let taskFn: (e: KeyboardEvent) => boolean | void

  beforeEach(async () => {
    setupMocks({ swReady: true })
    taskFn = await setupExecutor()
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('executes toggleFocusMode command and shows message', () => {
    mockMatchShortcut.mockReturnValueOnce(null).mockReturnValueOnce('KeyF')
    const e = new KeyboardEvent('keydown', { code: 'KeyF', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(true)
    expect(e.defaultPrevented).toBe(true)
    expect(mockMessage.info).toHaveBeenCalled()
  })

  it('executes toggleDragMode — hides setting drawer and toggles drag', () => {
    mockMatchShortcut.mockReturnValueOnce(null).mockReturnValueOnce('KeyD')
    const e = new KeyboardEvent('keydown', { code: 'KeyD', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(true)
    expect(e.defaultPrevented).toBe(true)
    expect(mockSwitchSettingDrawerVisible).toHaveBeenCalledWith(false)
    expect(mockToggleIsDragMode).toHaveBeenCalled()
  })

  it('executes toggleSettingDrawer — toggles visibility on', () => {
    setupMocks({ isSettingDrawerVisible: false, swReady: true })
  })

  it('returns true and prevents default for local commands', () => {
    mockMatchShortcut.mockReturnValueOnce(null).mockReturnValueOnce('KeyF')
    const e = new KeyboardEvent('keydown', { code: 'KeyF', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(true)
    expect(e.defaultPrevented).toBe(true)
    expect(e.cancelBubble).toBe(true)
  })
})

describe('globalShortcutTask — SW forwarding', () => {
  let taskFn: (e: KeyboardEvent) => boolean | void

  beforeEach(async () => {
    setupMocks({ swReady: true })
    taskFn = await setupExecutor()
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('forwards bookmark shortcut via Port when no command matches', () => {
    mockMatchShortcut.mockReturnValueOnce('KeyB').mockReturnValueOnce(null)
    const e = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(true)
    expect(e.defaultPrevented).toBe(true)
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'KeyB', source: 'bookmark' }),
    )
  })

  it('forwards command shortcut via Port when execEnv is not newtab', () => {
    mockGetCommandExecEnv.mockReturnValue('sw')
    mockMatchShortcut.mockReturnValueOnce(null).mockReturnValueOnce('KeyR')
    const e = new KeyboardEvent('keydown', { code: 'KeyR', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(true)
    expect(mockPort.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'KeyR', source: 'command' }),
    )
  })

  it('returns false when Port postMessage throws', () => {
    mockGetSharedPort.mockReturnValue({
      postMessage: vi.fn().mockImplementation(() => { throw new Error('Port disconnected') }),
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
    })
    mockMatchShortcut.mockReturnValueOnce(null).mockReturnValueOnce('KeyR')
    const e = new KeyboardEvent('keydown', { code: 'KeyR', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(false)
  })

  it('returns undefined when neither bookmark nor command matches', () => {
    mockMatchShortcut.mockReturnValueOnce(null).mockReturnValueOnce(null)
    const e = new KeyboardEvent('keydown', { code: 'KeyZ', cancelable: true })
    const result = taskFn(e)
    expect(result).toBeUndefined()
  })
})

describe('globalShortcutTask — command priority (modifier conflict)', () => {
  let taskFn: (e: KeyboardEvent) => boolean | void

  beforeEach(async () => {
    // Both have 2 modifiers → toModifierMask returns 2 → masks match → conflict
    // Use a command with execEnv !== 'newtab' so it reaches Port forwarding (not handled locally)
    setupMocks({
      swReady: true,
      localConfig: baseLocalConfig({
        bookmarkModifiers: ['shift', 'alt'],
        commandModifiers: ['shift', 'alt'],
        commandKeymap: { KeyX: { command: 'copyPageUrl' } }, // not a 'newtab' command
      }),
    })
    taskFn = await setupExecutor()
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('only sends command, skips bookmark on modifier conflict', () => {
    mockGetCommandExecEnv.mockReturnValue('sw') // forward to SW, not handled locally
    mockMatchShortcut.mockReturnValueOnce('KeyX').mockReturnValueOnce('KeyX')
    const e = new KeyboardEvent('keydown', { code: 'KeyX', cancelable: true })
    taskFn(e)

    const bookmarkCalls = mockPort.postMessage.mock.calls.filter(
      (c: any[]) => c[0].source === 'bookmark',
    )
    expect(bookmarkCalls.length).toBe(0)
    const commandCalls = mockPort.postMessage.mock.calls.filter(
      (c: any[]) => c[0].source === 'command',
    )
    expect(commandCalls.length).toBe(1)
  })
})

describe('globalShortcutTask — SW not ready', () => {
  let taskFn: (e: KeyboardEvent) => boolean | void

  beforeEach(async () => {
    setupMocks({ swReady: false })
    taskFn = await setupExecutor()
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('shows warning and returns false', () => {
    mockMatchShortcut.mockReturnValueOnce('KeyB').mockReturnValueOnce(null)
    const e = new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true })
    const result = taskFn(e)
    expect(result).toBe(false)
    expect(mockMessage.warning).toHaveBeenCalled()
  })
})
