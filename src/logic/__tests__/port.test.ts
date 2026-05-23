/**
 * port.test.ts — 测试 shortcut/port.ts 的长连接单例和断连重连逻辑
 *
 * 测试目标：
 * - getSharedPort 单例性
 * - MSG_INIT_COMPLETE 状态流转
 * - 断连触发 scheduleReconnect + 指数退避
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('getSharedPort 单例', () => {
  let getSharedPort: () => chrome.runtime.Port
  let mockPort: any
  let connectSpy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()

    mockPort = {
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn() },
    }

    connectSpy = vi.fn().mockReturnValue(mockPort)

    vi.doMock('@/types/messages', () => ({
      MSG_KEYDOWN: 'NAIVETAB_KEYDOWN',
      MSG_INIT_COMPLETE: 'NAIVETAB_INIT_COMPLETE',
      MSG_HELLO: 'NAIVETAB_HELLO',
      MSG_EXECUTE_COMMAND: 'NAIVETAB_EXECUTE_COMMAND',
      MSG_SWITCH_BOOKMARK_LAYER: 'NAIVETAB_SWITCH_BOOKMARK_LAYER',
      MSG_SWITCH_BOOKMARK_LAYER_UI: 'NAIVETAB_SWITCH_BOOKMARK_LAYER_UI',
    }))

    vi.stubGlobal('chrome', {
      runtime: {
        connect: connectSpy,
        lastError: null,
      },
    })

    const mod = await import('@/logic/shortcut/port')
    getSharedPort = mod.getSharedPort
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('首次调用创建 chrome.runtime.connect', () => {
    getSharedPort()
    expect(connectSpy).toHaveBeenCalledWith({ name: 'naivetab-shortcut' })
    expect(connectSpy).toHaveBeenCalledTimes(1)
  })

  it('第二次调用返回同一实例（不重复创建 connect）', () => {
    const port1 = getSharedPort()
    const port2 = getSharedPort()
    expect(port1).toBe(port2)
    expect(connectSpy).toHaveBeenCalledTimes(1)
  })

  it('返回的 port 与 chrome.runtime.connect 返回值相同', () => {
    const port = getSharedPort()
    expect(port).toBe(mockPort)
  })
})

describe('MSG_INIT_COMPLETE 状态流转', () => {
  let getSharedPort: () => chrome.runtime.Port
  let isSwReady: () => boolean
  let mockPort: any
  let messageCallback: (msg: { type: string }) => void

  beforeEach(async () => {
    vi.resetModules()

    mockPort = {
      onMessage: {
        addListener: vi.fn((cb) => {
          messageCallback = cb
        }),
      },
      onDisconnect: { addListener: vi.fn() },
    }

    vi.doMock('@/types/messages', () => ({
      MSG_KEYDOWN: 'NAIVETAB_KEYDOWN',
      MSG_INIT_COMPLETE: 'NAIVETAB_INIT_COMPLETE',
      MSG_HELLO: 'NAIVETAB_HELLO',
      MSG_EXECUTE_COMMAND: 'NAIVETAB_EXECUTE_COMMAND',
      MSG_SWITCH_BOOKMARK_LAYER: 'NAIVETAB_SWITCH_BOOKMARK_LAYER',
      MSG_SWITCH_BOOKMARK_LAYER_UI: 'NAIVETAB_SWITCH_BOOKMARK_LAYER_UI',
    }))

    vi.stubGlobal('chrome', {
      runtime: {
        connect: vi.fn().mockReturnValue(mockPort),
        lastError: null,
      },
    })

    const mod = await import('@/logic/shortcut/port')
    getSharedPort = mod.getSharedPort
    isSwReady = mod.isSwReady
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初始 isSwReady 为 false', () => {
    expect(isSwReady()).toBe(false)
  })

  it('收到 MSG_INIT_COMPLETE 消息后 isSwReady 为 true', () => {
    getSharedPort()
    expect(isSwReady()).toBe(false)
    messageCallback({ type: 'NAIVETAB_INIT_COMPLETE' })
    expect(isSwReady()).toBe(true)
  })
})

describe('断连重连', () => {
  let getSharedPort: () => chrome.runtime.Port
  let isSwReady: () => boolean
  let mockPort: any
  let disconnectCallback: () => void
  let connectStub: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()

    disconnectCallback = vi.fn()
    connectStub = vi.fn().mockImplementation(() => {
      mockPort = {
        onMessage: { addListener: vi.fn() },
        onDisconnect: {
          addListener: vi.fn((cb) => {
            disconnectCallback = cb
          }),
        },
      }
      return mockPort
    })

    vi.doMock('@/types/messages', () => ({
      MSG_KEYDOWN: 'NAIVETAB_KEYDOWN',
      MSG_INIT_COMPLETE: 'NAIVETAB_INIT_COMPLETE',
      MSG_HELLO: 'NAIVETAB_HELLO',
      MSG_EXECUTE_COMMAND: 'NAIVETAB_EXECUTE_COMMAND',
      MSG_SWITCH_BOOKMARK_LAYER: 'NAIVETAB_SWITCH_BOOKMARK_LAYER',
      MSG_SWITCH_BOOKMARK_LAYER_UI: 'NAIVETAB_SWITCH_BOOKMARK_LAYER_UI',
    }))

    vi.stubGlobal('chrome', {
      runtime: {
        connect: connectStub,
        lastError: null,
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('onDisconnect 触发后 isSwReady 变为 false', () => {
    const modPromise = import('@/logic/shortcut/port')
    return modPromise.then((mod) => {
      getSharedPort = mod.getSharedPort
      isSwReady = mod.isSwReady

      getSharedPort()
      // 模拟收到 INIT_COMPLETE
      const onMsgAdd = (mockPort.onMessage.addListener as any).mock.calls[0][0]
      onMsgAdd({ type: 'NAIVETAB_INIT_COMPLETE' })
      expect(isSwReady()).toBe(true)

      // 模拟断连
      disconnectCallback()
      expect(isSwReady()).toBe(false)
    })
  })

  it('断连后 port 被置为 null，下次 getSharedPort 创建新连接', async () => {
    const mod = await import('@/logic/shortcut/port')
    getSharedPort = mod.getSharedPort

    const port1 = getSharedPort()
    disconnectCallback()
    const port2 = getSharedPort()
    expect(port1).not.toBe(port2)
    expect(connectStub).toHaveBeenCalledTimes(2)
  })

  it('scheduleReconnect 指数退避: 100 → 200 → 400 → 1000 上限', async () => {
    const mod = await import('@/logic/shortcut/port')
    getSharedPort = mod.getSharedPort

    getSharedPort()

    // 第 1 次断连 → delay = 100 * 2 = 200（注意：初始 reconnectDelay = 100，先乘 2 再 setTimeout）
    disconnectCallback()
    expect(connectStub).toHaveBeenCalledTimes(1)

    // 推进 200ms
    await vi.advanceTimersByTimeAsync(200)
    expect(connectStub).toHaveBeenCalledTimes(2)

    // 第 2 次断连 → delay = 200 * 2 = 400
    disconnectCallback()
    await vi.advanceTimersByTimeAsync(400)
    expect(connectStub).toHaveBeenCalledTimes(3)

    // 第 3 次断连 → delay = 400 * 2 = 800
    disconnectCallback()
    await vi.advanceTimersByTimeAsync(800)
    expect(connectStub).toHaveBeenCalledTimes(4)

    // 第 4 次断连 → delay = 800 * 2 = 1600 → 被 MAX_RECONNECT_DELAY=1000 截断
    disconnectCallback()
    await vi.advanceTimersByTimeAsync(1000)
    expect(connectStub).toHaveBeenCalledTimes(5)
  })

  it('重连成功后 reconnectDelay 重置为 100', async () => {
    const mod = await import('@/logic/shortcut/port')
    getSharedPort = mod.getSharedPort

    getSharedPort()
    disconnectCallback()
    await vi.advanceTimersByTimeAsync(200)
    // 此时 reconnectDelay 已重置为 100（在 scheduleReconnect 的 setTimeout 回调中）
    // 再次断连 → delay = 100 * 2 = 200
    disconnectCallback()
    await vi.advanceTimersByTimeAsync(200)
    expect(connectStub).toHaveBeenCalledTimes(3)
  })

  it('连续多次断连只安排一次重连（reconnectTimer 守卫）', async () => {
    const mod = await import('@/logic/shortcut/port')
    getSharedPort = mod.getSharedPort

    getSharedPort()
    // 连续触发 3 次断连
    disconnectCallback()
    disconnectCallback()
    disconnectCallback()

    // 在定时器触发前，connect 只被调用了 1 次（首次创建时）
    expect(connectStub).toHaveBeenCalledTimes(1)

    // 推进定时器触发重连
    await vi.advanceTimersByTimeAsync(200)
    // 重连创建了新的 port，但新的 disconnect callback 还未触发
    // 所以 connect 被调用了 2 次
    expect(connectStub).toHaveBeenCalledTimes(2)
  })
})
