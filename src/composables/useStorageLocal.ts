/*
 * https://github.com/antfu/vitesse-webext/issues/49
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { storage } from 'webextension-polyfill'
import type { StorageLikeAsync } from '@vueuse/core'
import {
  useLocalStorage,
  useStorageAsync,
  MaybeRef,
  StorageAsyncOptions,
  RemovableRef,
} from '@vueuse/core'

const storageLocal: StorageLikeAsync = {
  removeItem(key: string) {
    return storage.local.remove(key)
  },

  setItem(key: string, value: string) {
    return storage.local.set({ [key]: value })
  },

  async getItem(key: string) {
    return (await storage.local.get(key))[key]
  },
}

// Todo 每次载入页面均会触发watch，暂时关闭
// export const useStorageLocal = <T>(
//   key: string,
//   initialValue: MaybeRef<T>,
//   options?: StorageAsyncOptions<T>,
// ): RemovableRef<T> => useStorageAsync(key, initialValue, storageLocal, options)

export const useStorageLocal = useLocalStorage
