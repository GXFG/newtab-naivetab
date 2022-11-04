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

  const target = ref(value)
  let timer: NodeJS.Timeout

  watch(
    () => target,
    (state) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const value = JSON.stringify(state.value)
        localStorage.setItem(key, value)
        // console.log(`@set ${key}`, value)
      }, 800)
    },
    {
      deep: true,
    },
  )
  return target
}
