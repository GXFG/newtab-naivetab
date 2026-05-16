import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

/**
 * permission.test.ts — 测试权限管理模块
 *
 * 覆盖: requestPermissionAsync、requestPermission、sendNotification
 */

beforeEach(() => {
  // Ensure notifications mock exists (vi.restoreAllMocks may reset it)
  if (!chrome.notifications) {
    (chrome as any).notifications = {
      create: vi.fn(),
      clear: vi.fn(),
    }
  }
})

describe('requestPermissionAsync', () => {
  let requestPermissionAsync: typeof import('@/logic/utils/permission')['requestPermissionAsync']

  beforeEach(async () => {
    vi.resetModules()
    ;(chrome.permissions.request as Mock).mockImplementation((_perms, cb) => {
      cb(true)
    })
    const mod = await import('@/logic/utils/permission')
    requestPermissionAsync = mod.requestPermissionAsync
  })

  it('requests the specified permission without blocking', async () => {
    await requestPermissionAsync('notifications')
    expect(chrome.permissions.request).toHaveBeenCalledWith(
      { permissions: ['notifications'] },
      expect.any(Function),
    )
  })

  it('silently catches rejection', async () => {
    ;(chrome.permissions.request as Mock).mockImplementation(() => {
      throw new Error('Permission API unavailable')
    })
    vi.resetModules()
    const mod = await import('@/logic/utils/permission')
    const fn = mod.requestPermissionAsync
    // Should not throw — errors are caught internally
    expect(() => fn('notifications')).not.toThrow()
  })
})

describe('requestPermission', () => {
  let requestPermission: typeof import('@/logic/utils/permission')['requestPermission']

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/logic/utils/permission')
    requestPermission = mod.requestPermission
  })

  it('requests the specified permission', async () => {
    ;(chrome.permissions.request as Mock).mockImplementation((_perms, cb) => {
      cb(true)
    })
    const result = await requestPermission('bookmarks')
    expect(result).toBe(true)
    expect(chrome.permissions.request).toHaveBeenCalledWith(
      { permissions: ['bookmarks'] },
      expect.any(Function),
    )
  })

  it('rejects if chrome.permissions.request throws', async () => {
    ;(chrome.permissions.request as Mock).mockImplementation(() => {
      throw new Error('Permission API unavailable')
    })
    await expect(requestPermission('bookmarks')).rejects.toThrow('Permission API unavailable')
  })
})

describe('sendNotification', () => {
  let sendNotification: typeof import('@/logic/utils/permission')['sendNotification']

  beforeEach(async () => {
    vi.resetModules()
    // Re-create notifications mock after reset
    ;(chrome as any).notifications = {
      create: vi.fn(),
      clear: vi.fn(),
    }
    const mod = await import('@/logic/utils/permission')
    sendNotification = mod.sendNotification
  })

  it('calls chrome.notifications.create with default icon', () => {
    sendNotification({ title: 'Test Title', body: 'Test Body' })
    expect(chrome.notifications.create).toHaveBeenCalledWith({
      type: 'basic',
      iconUrl: expect.stringContaining('icon-128x128.png'),
      title: 'Test Title',
      message: 'Test Body',
    })
  })

  it('uses custom icon when provided', () => {
    sendNotification({ title: 'Alert', icon: '/custom/icon.png' })
    expect(chrome.notifications.create).toHaveBeenCalledWith({
      type: 'basic',
      iconUrl: expect.stringContaining('custom/icon.png'),
      title: 'Alert',
      message: '',
    })
  })

  it('defaults body to empty string', () => {
    sendNotification({ title: 'NoBody' })
    expect(chrome.notifications.create).toHaveBeenCalledWith({
      type: 'basic',
      iconUrl: expect.any(String),
      title: 'NoBody',
      message: '',
    })
  })
})
