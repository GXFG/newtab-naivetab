import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * sync-merge.test.ts — 测试 sync/core.ts 中的 mergeConfigWithVersionAwareness
 *
 * 版本感知的配置合并策略：根据版本号决定以哪一方为模板进行 mergeState。
 */

// 使用 vi.doMock + vi.resetModules 避免 mock 污染
const mockLog = vi.fn()
const mockCompareVersion = vi.fn()
const mockMergeState = vi.fn()

vi.doMock('@/logic/util', () => ({
  log: mockLog,
  compareLeftVersionLessThanRightVersions: mockCompareVersion,
  downloadJsonByTagA: vi.fn(),
  sleep: vi.fn(),
}))

vi.doMock('@/logic/config/merge', () => ({
  mergeState: mockMergeState,
}))

let mergeConfigWithVersionAwareness: (
  localData: Record<string, any>,
  remoteData: Record<string, any>,
  localVersion: string,
  remoteVersion: string,
) => Record<string, any>

beforeEach(async () => {
  vi.resetModules()
  mockLog.mockClear()
  mockCompareVersion.mockClear()
  mockMergeState.mockClear()

  const mod = await import('@/logic/sync/core')
  mergeConfigWithVersionAwareness = mod.mergeConfigWithVersionAwareness
})

describe('mergeConfigWithVersionAwareness', () => {
  const localData = { enabled: true, fontSize: 14 }
  const remoteData = { enabled: false, fontSize: 16 }

  describe('Scenario 1: same version → use remote', () => {
    it('returns remoteData when versions are equal', () => {
      const result = mergeConfigWithVersionAwareness(
        localData,
        remoteData,
        '2.3.0',
        '2.3.0',
      )

      expect(result).toBe(remoteData)
      expect(mockCompareVersion).not.toHaveBeenCalled()
      expect(mockMergeState).not.toHaveBeenCalled()
    })
  })

  describe('Scenario 2: local version newer → local as template', () => {
    it('calls mergeState with localData as template when local is newer', () => {
      mockCompareVersion.mockReturnValue(true) // remote < local → local is newer

      mergeConfigWithVersionAwareness(
        localData,
        remoteData,
        '2.3.0',
        '2.2.5',
      )

      expect(mockCompareVersion).toHaveBeenCalledWith('2.2.5', '2.3.0')
      expect(mockMergeState).toHaveBeenCalledWith(localData, remoteData)
    })
  })

  describe('Scenario 3: remote version newer → remote as template', () => {
    it('calls mergeState with remoteData as template when remote is newer', () => {
      mockCompareVersion.mockReturnValue(false) // remote >= local → remote is newer

      mergeConfigWithVersionAwareness(
        localData,
        remoteData,
        '2.2.5',
        '2.3.0',
      )

      expect(mockCompareVersion).toHaveBeenCalledWith('2.3.0', '2.2.5')
      expect(mockMergeState).toHaveBeenCalledWith(remoteData, localData)
    })
  })

  describe('Scenario 4: missing version → treated as 0.0.0 (oldest)', () => {
    it('local newer when remote has no version', () => {
      mockCompareVersion.mockReturnValue(true)

      mergeConfigWithVersionAwareness(
        localData,
        remoteData,
        '2.3.0',
        '0.0.0',
      )

      expect(mockMergeState).toHaveBeenCalledWith(localData, remoteData)
    })

    it('remote newer when local has no version', () => {
      mockCompareVersion.mockReturnValue(false)

      mergeConfigWithVersionAwareness(
        localData,
        remoteData,
        '0.0.0',
        '2.3.0',
      )

      expect(mockMergeState).toHaveBeenCalledWith(remoteData, localData)
    })

    it('both missing version → use remote (versions equal)', () => {
      const result = mergeConfigWithVersionAwareness(
        localData,
        remoteData,
        '',
        '',
      )

      expect(result).toBe(remoteData)
      expect(mockCompareVersion).not.toHaveBeenCalled()
    })
  })

  describe('mergeState merge direction verification', () => {
    it('local as template preserves local new fields', () => {
      // 模拟 mergeState 行为：只保留 template 中定义的字段
      mockMergeState.mockImplementation((template, source) => {
        const result: Record<string, unknown> = {}
        for (const key of Object.keys(template)) {
          if (key in source) result[key] = (source as any)[key]
          else result[key] = (template as any)[key]
        }
        return result
      })

      const local = { enabled: true, newFeature: true, fontSize: 14 }
      const remote = { enabled: false, fontSize: 16 }

      mockCompareVersion.mockReturnValue(true)
      const result = mergeConfigWithVersionAwareness(local, remote, '2.3.0', '2.2.5')

      expect(result).toHaveProperty('enabled', false)
      expect(result).toHaveProperty('newFeature', true)
      expect(result).toHaveProperty('fontSize', 16)
    })

    it('remote as template preserves remote new fields', () => {
      mockMergeState.mockImplementation((template, source) => {
        const result: Record<string, unknown> = {}
        for (const key of Object.keys(template)) {
          if (key in source) result[key] = (source as any)[key]
          else result[key] = (template as any)[key]
        }
        return result
      })

      const local = { enabled: true, fontSize: 14 }
      const remote = { enabled: false, newFeature: true, fontSize: 16 }

      mockCompareVersion.mockReturnValue(false)
      const result = mergeConfigWithVersionAwareness(local, remote, '2.2.5', '2.3.0')

      expect(result).toHaveProperty('enabled', true)
      expect(result).toHaveProperty('newFeature', true)
      expect(result).toHaveProperty('fontSize', 14)
    })
  })
})
