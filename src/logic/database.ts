import { log } from '@/logic'

const DB_NAME = 'NaiveTabDatabase'
const DB_VERSION = 1

let isInitialized = false
let DB: any = null

const databaseInit = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    /**
     * 数据仓库升级事件（第一次新建库时也会触发）
     */
    request.onupgradeneeded = (event: any) => {
      log('IndexDB upgrade success', event)
      DB = event.target.result
      DB.createObjectStore('localBackgroundImages', { keyPath: 'appearanceCode' })
      // dbTable.createIndex('indexName', 'name', { unique: false }) // 使用索引：索引的意义在于，可以让你搜索任意字段，也就是说从任意字段拿到数据记录。如果不建立索引，默认只能搜索主键（即从主键取值）。
    }

    request.onsuccess = (event: any) => {
      // log('IndexDB open success', event)
      DB = event.target.result
      isInitialized = true
      resolve(true)
    }

    request.onerror = (event) => {
      log('IndexDB open error', event)
      resolve(false)
    }
  })
}

export const databaseStore = async(storeName: string, type: DatabaseHandleType, payload: any): Promise<any> => {
  if (!isInitialized) {
    await databaseInit()
  }
  return new Promise((resolve, reject) => {
    const store = DB.transaction([storeName], 'readwrite').objectStore(storeName)
    let request: any = null
    if (type === 'add') {
      request = store.add(payload)
    } else if (type === 'put') {
      request = store.put(payload)
    } else if (type === 'get') {
      request = store.get(payload)
    } else if (type === 'delete') {
      request = store.delete(payload)
    }

    request.onsuccess = (event: any) => {
      // log(`IndexDB ${type} success`, event.target.result)
      resolve(event.target.result)
    }

    request.onerror = (event: any) => {
      log(`IndexDB ${type} error`, event)
      reject(event.target)
    }
  })
}
