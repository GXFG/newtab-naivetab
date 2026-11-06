import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import {
  recoveredStorageKeys,
  useStorageLocal,
} from '@/composables/useStorageLocal'

/**
 * useStorageLocal — 配置持久化底座。
 *
 * 所有 localConfig / localState 都建在它上面，出错会直接影响启动，
 * 因此这里覆盖四类必须成立的行为：
 * 1. 初始化：读取已有值，并用默认值补齐缺失字段（浅合并）
 * 2. 变更：防抖 500ms 后才写 localStorage
 * 3. 存储内容损坏：不抛错，回退默认值并覆盖写回
 * 4. 损坏时登记到 recoveredStorageKeys，供同步层做「本机数据不可信」的处理
 */

const flushTimers = async (ms = 500) => {
  await nextTick()
  vi.advanceTimersByTime(ms)
  await nextTick()
}

describe('useStorageLocal', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('无存量时写入默认值', () => {
    const store = useStorageLocal('c-test', { a: 1 })

    expect(store.value).toEqual({ a: 1 })
    expect(JSON.parse(localStorage.getItem('c-test')!)).toEqual({ a: 1 })
  })

  it('读取存量值，并用默认值补齐新增字段', () => {
    // 旧版本写入的数据缺少新增字段 newField
    localStorage.setItem('c-test', JSON.stringify({ a: 2 }))

    const store = useStorageLocal('c-test', { a: 1, newField: 'default' })

    expect(store.value).toEqual({ a: 2, newField: 'default' })
  })

  it('变更后防抖 500ms 才落盘', async () => {
    const store = useStorageLocal('c-test', { a: 1 })

    store.value.a = 2
    await nextTick()
    expect(JSON.parse(localStorage.getItem('c-test')!).a).toBe(1)

    vi.advanceTimersByTime(500)
    expect(JSON.parse(localStorage.getItem('c-test')!).a).toBe(2)
  })

  it('连续变更只在最后一次之后写一次', async () => {
    const store = useStorageLocal('c-test', { a: 1 })
    // 初始化写入发生在建 spy 之前，这里只统计后续变更
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    store.value.a = 2
    vi.advanceTimersByTime(200)
    store.value.a = 3
    await flushTimers(500)

    expect(JSON.parse(localStorage.getItem('c-test')!).a).toBe(3)
    // 中间 200ms 的定时器被 clearTimeout，只写最后的结果
    expect(setItemSpy).toHaveBeenCalledTimes(1)
  })

  it('存储内容损坏时回退默认值而不是抛错', () => {
    localStorage.setItem('c-test', '{broken json')

    const store = useStorageLocal('c-test', { a: 1 })

    expect(store.value).toEqual({ a: 1 })
    // 写回默认值，避免下次启动继续读到损坏内容
    expect(JSON.parse(localStorage.getItem('c-test')!)).toEqual({ a: 1 })
  })

  it('损坏的键会登记到 recoveredStorageKeys（同步层据此重新拉取云端配置）', () => {
    localStorage.setItem('c-corrupt-demo', '{broken json')

    useStorageLocal('c-corrupt-demo', { a: 1 })

    expect(recoveredStorageKeys.has('c-corrupt-demo')).toBe(true)
    // 正常键不该被登记，否则会白白清空一次同步状态
    localStorage.setItem('c-healthy-demo', JSON.stringify({ a: 1 }))
    useStorageLocal('c-healthy-demo', { a: 1 })
    expect(recoveredStorageKeys.has('c-healthy-demo')).toBe(false)
  })
})
