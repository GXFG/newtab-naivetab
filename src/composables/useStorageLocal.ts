// import { useLocalStorage } from '@vueuse/core'
// export const useStorageLocal = useLocalStorage

import type { Ref, UnwrapRef } from 'vue'

export const useStorageLocal: <T>(key: string, defaultValue: T) => Ref<UnwrapRef<T>> = (key, defaultValue) => {
  const localItem = localStorage.getItem(key)
  let value = defaultValue
  if (localItem) {
    value = JSON.parse(localItem)
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
      }, 800)
    },
    {
      deep: true,
    },
  )
  return target
}
