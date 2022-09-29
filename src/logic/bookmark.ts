import { useStorageLocal } from '@/composables/useStorageLocal'
import { isChrome } from '@/env'
import { KEYBOARD_KEY_LIST, KEYBOARD_SPLIT_RANGE_MAP, defaultConfig, globalState, localConfig, addVisibilityTask, getAllCommandsConfig, padUrlHttps, log } from '@/logic'

const keyboardSplitList = computed(() => {
  let splitList: any = KEYBOARD_SPLIT_RANGE_MAP.letter
  if (localConfig.bookmark.isSymbolEnabled && localConfig.bookmark.isNumberEnabled) {
    splitList = KEYBOARD_SPLIT_RANGE_MAP.letterSymbolNumber
  } else if (localConfig.bookmark.isSymbolEnabled) {
    splitList = KEYBOARD_SPLIT_RANGE_MAP.letterSymbol
  } else if (localConfig.bookmark.isNumberEnabled) {
    splitList = KEYBOARD_SPLIT_RANGE_MAP.letterNumber
  }
  return splitList
})

export const getKeyboardList = (keyboardSplitList: any[], originList: any[]) => {
  const rowList: any[] = []
  for (const range of keyboardSplitList) {
    if (range.length === 1) {
      rowList.push(originList.slice(range[0]))
    } else {
      if (Array.isArray(range[0])) {
        // 处理特殊按键的拼接，如：数字行 + BS [[0, 10], [12, 13]]
        let tempList: any = []
        for (const rangeItem of range) {
          tempList = [...tempList, ...originList.slice(rangeItem[0], rangeItem[1])]
        }
        rowList.push(tempList)
      } else {
        rowList.push(originList.slice(range[0], range[1]))
      }
    }
  }
  return rowList
}

export const keyboardRowKeyList = computed(() => getKeyboardList(keyboardSplitList.value, KEYBOARD_KEY_LIST))

export const keyboardCurrentModelAllKeyList = computed(() => keyboardRowKeyList.value.flat(Infinity))

export const getFaviconFromUrl = (url: string) => {
  if (isChrome) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`
  }
  return `${url}/favicon.ico`
}

export const getDefaultBookmarkNameFromUrl = (url: string) => {
  if (!url) {
    return ''
  }
  const padUrl = padUrlHttps(url)
  const domain = padUrl.split('/')[2]
  if (!domain) {
    return ''
  }
  let name = ''
  if (domain.includes(':')) {
    // 端口地址
    name = `:${domain.split(':')[1]}`
  } else {
    const tempSplitList = domain.split('.')
    name = tempSplitList.includes('www') ? tempSplitList[1] : tempSplitList[0] // 设置默认name
  }
  return name
}

export const getBookmarkConfigName = (key: string) => {
  if (!localConfig.bookmark.keymap[key]) {
    return ''
  }
  return localConfig.bookmark.keymap[key].name || getDefaultBookmarkNameFromUrl(localConfig.bookmark.keymap[key].url)
}

export const getBookmarkConfigUrl = (key: string) => {
  if (!localConfig.bookmark.keymap[key]) {
    return ''
  }
  const url = localConfig.bookmark.keymap[key].url
  return padUrlHttps(url)
}

export const resetBookmarkPending = () => {
  localStorage.setItem('data-bookmark-pending', JSON.stringify({
    isPending: false,
  }))
}

addVisibilityTask('bookmark', (hidden) => {
  if (hidden) {
    return
  }
  // page切换前台时刷新快捷键配置信息
  if (globalState.isSettingDrawerVisible) {
    getAllCommandsConfig()
  }
  const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
    isPending: false,
  })
  // page切换前台时刷新通过pupop新增的书签
  if (!bookmarkPendingData.value.isPending) {
    return
  }
  log('Update bookmark from popup')
  localConfig.bookmark = useStorageLocal('c-bookmark', defaultConfig.bookmark) as any
  resetBookmarkPending()
})
