import { log } from '@/logic/util'

const DB_NAME = 'NaiveTabDatabase'
const DB_VERSION = 2

let isInitialized = false
let DB: IDBDatabase | null = null

const databaseInit = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    /**
     * 数据仓库升级事件（第一次新建库时也会触发）
     */
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      log('IndexDB upgrade success', event)
      DB = (event.target as IDBOpenDBRequest).result
      if (!DB.objectStoreNames.contains('localBackgroundImages')) {
        // 存储本地背景图文件数据，包含浅色、深色外观两张图片
        DB.createObjectStore('localBackgroundImages', { keyPath: 'appearanceCode' })
      }
      if (!DB.objectStoreNames.contains('currBackgroundImages')) {
        // 存储当前背景图数据，包含浅色、深色外观两张图片
        DB.createObjectStore('currBackgroundImages', { keyPath: 'appearanceCode' })
      }
      // 使用索引：索引的意义在于，可以让你搜索任意字段，也就是说从任意字段拿到数据记录。如果不建立索引，默认只能搜索主键（即从主键取值）。
      // dbTable.createIndex('indexName', 'name', { unique: false })
    }

    request.onsuccess = (event: Event) => {
      // log('IndexDB open success', event)
      DB = (event.target as IDBOpenDBRequest).result
      isInitialized = true
      resolve(true)
    }

    request.onerror = (event) => {
      log('IndexDB open error', event)
      resolve(false)
    }
  })
}

export const databaseStore = async (storeName: DatabaseStore, type: DatabaseHandleType, payload: DatabaseLocalBackgroundImages | string | number): Promise<DatabaseLocalBackgroundImages | null> => {
  if (!isInitialized) {
    await databaseInit()
  }

  return new Promise((resolve, reject) => {
    if (!DB) {
      throw new Error('Database is not initialized')
    }

    const store = DB.transaction([storeName], 'readwrite').objectStore(storeName)
    let request: IDBRequest<any> | null = null
    if (type === 'add') {
      request = store.add(payload)
    } else if (type === 'put') {
      // 更新，第一次使用add，后续修改使用put
      request = store.put(payload)
    } else if (type === 'get') {
      request = store.get(payload as number | string)
    } else if (type === 'delete') {
      request = store.delete(payload as number | string)
    }

    if (!request) {
      throw new Error('db request is null')
    }

    request.onsuccess = (event: Event) => {
      // log(`IndexDB ${type} success`, event.target.result)
      resolve((event.target as IDBRequest).result)
    }

    request.onerror = (event: Event) => {
      log(`IndexDB ${type} error`, event)
      reject(event.target)
    }
  })
}
