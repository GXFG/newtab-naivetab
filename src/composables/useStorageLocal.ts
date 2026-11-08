// import { useLocalStorage } from '@vueuse/core'
// export const useStorageLocal = useLocalStorage

import type { Ref, UnwrapRef } from 'vue'

/**
 * 本次页面启动中「内容损坏、已回落默认值」的存储键（如 `c-general`）。
 *
 * 为什么要把这件事暴露出去：回落默认值只解决了白屏，却留下一个同步隐患 ——
 * `localState` 里该字段的 `syncId` 仍等于云端值，`loadRemoteConfig` 会判定「无更新」
 * 直接跳过，用户的真实配置留在云端没人取回；而本地这份默认值会在用户下次修改该
 * section 时被整段上传，把云端的真实配置覆盖掉。
 *
 * 消费方：`config/state.ts` 据此清空对应字段的 `syncId`，让同步层以云端为准回拉。
 */
export const recoveredStorageKeys = new Set<string>()

export const useStorageLocal = <T>(
  key: string,
  defaultValue: T,
): Ref<UnwrapRef<T>> => {
  const localItem = localStorage.getItem(key)
  let value = defaultValue
  if (localItem) {
    try {
      value = JSON.parse(localItem)
    } catch (e) {
      // 存储内容被写坏（手工编辑、写入中断）时不能让整个页面初始化失败：
      // localConfig 在模块顶层创建，这里抛出会直接白屏。退回默认值并覆盖写回。
      console.warn(
        `[useStorageLocal] invalid JSON for "${key}", fallback to default`,
        e,
      )
      // 记录受损键：同步层需要知道「本机这份数据不可信」，否则默认值会被当成
      // 用户真实配置继续传播（见 recoveredStorageKeys 注释）
      recoveredStorageKeys.add(key)
      try {
        localStorage.setItem(key, JSON.stringify(defaultValue))
      } catch (writeError) {
        // 配额写满时覆盖写回也会失败，后果只是「下次启动继续回落默认值」，
        // 不能让它再变成一次启动期异常（那才是白屏的来源）
        console.warn(`[useStorageLocal] failed to rewrite "${key}"`, writeError)
      }
    }
  } else {
    localStorage.setItem(key, JSON.stringify(defaultValue))
  }

  // 初始值修改时同步向localStorage自动新增（只能处理一层数据结构）
  const mergeValue = {
    ...defaultValue,
    ...value,
  }

  const target = ref(mergeValue)
  let timer: NodeJS.Timeout

  watch(
    () => target,
    (state) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const valueText = JSON.stringify(state.value)
        localStorage.setItem(key, valueText)
        // console.log(`@set ${key}`, value)
      }, 500)
    },
    {
      deep: true,
    },
  )
  return target as Ref<UnwrapRef<T>>
}
