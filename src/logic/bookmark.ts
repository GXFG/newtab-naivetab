import { useDebounceFn } from '@vueuse/core'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { KEYBOARD_KEY_LIST, MERGE_BOOKMARK_DELAY, localConfig, addVisibilityTask, log } from '@/logic'

// Handle new bookmarks to be processed from popup modal
export const handleBookmarkPending = () => {
  const bookmarkPendingData = useStorageLocal('data-bookmark-pending', {
    isPending: false,
    keymap: {},
  })
  if (!bookmarkPendingData.value.isPending) {
    return
  }
  log('Update bookmark from popup')
  for (const key of Object.keys(bookmarkPendingData.value.keymap)) {
    const item = bookmarkPendingData.value.keymap[key]
    localConfig.bookmark.keymap[key] = {
      url: item.url,
      name: item.name,
    }
  }
  bookmarkPendingData.value.isPending = false
  bookmarkPendingData.value.keymap = {}
}

// page切换前台时刷新通过pupop新增的书签
addVisibilityTask('bookmark', (hidden) => {
  if (hidden) {
    return
  }
  handleBookmarkPending()
})

export const localBookmarkList = useStorageLocal('data-bookmark', [] as BookmarkItem[])

const keyboardSplitList = computed(() => {
  let splitList: any = [[13, 23], [25, 34], [36, 43]]
  if (localConfig.bookmark.isSymbolEnabled && localConfig.bookmark.isNumberEnabled) {
    splitList = [[0, 13], [13, 25], [25, 36], [36]]
  } else if (localConfig.bookmark.isSymbolEnabled) {
    splitList = [[13, 25], [25, 36], [36]]
  } else if (localConfig.bookmark.isNumberEnabled) {
    splitList = [[[0, 10], [12, 13]], [13, 23], [25, 34], [36, 43]]
  }
  return splitList
})

const getKeyboardList = (originList: any[]) => {
  const rowList: any[] = []
  for (const range of keyboardSplitList.value) {
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

export const keyboardRowList = computed(() => getKeyboardList(localBookmarkList.value))

export const keyboardSettingRowList = computed(() => getKeyboardList(KEYBOARD_KEY_LIST))

export const keyboardCurrentModelAllKeyList = computed(() => {
  const allKey = [] as string[]
  for (const row of keyboardSettingRowList.value) {
    for (const key of row) {
      allKey.push(key)
    }
  }
  return allKey
})

export const getDefaultBookmarkName = (url: string) => {
  if (!url) {
    return ''
  }
  const padUrl = url.includes('//') ? url : `https://${url}`
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

const isInitialized = useStorageLocal('data-bookmark-initialized', false)

const mergeBookmarkSetting = useDebounceFn(async() => {
  log('Bookmark merge setting')
  for (const key of KEYBOARD_KEY_LIST) {
    const index = KEYBOARD_KEY_LIST.indexOf(key)
    const item = localConfig.bookmark.keymap[key]
    if (item) {
      localBookmarkList.value[index] = {
        key,
        url: item.url.includes('//') ? item.url : `https://${item.url}`,
        name: item.name || getDefaultBookmarkName(item.url),
      }
    } else {
      // 初始化无设置数据的按键
      localBookmarkList.value[index] = {
        key,
        url: '',
        name: '',
      }
    }
  }
}, MERGE_BOOKMARK_DELAY)

watch(
  () => localConfig.bookmark.keymap,
  () => {
    mergeBookmarkSetting()
  },
  { deep: true },
)

export const initBookmarkListData = () => {
  if (isInitialized.value) {
    return
  }
  log('Bookmark initLocalList')
  localBookmarkList.value = []
  KEYBOARD_KEY_LIST.forEach((key: string) => {
    localBookmarkList.value.push({
      key,
      url: '',
      name: '',
    })
  })
  isInitialized.value = true
  mergeBookmarkSetting()
}
