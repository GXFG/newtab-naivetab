import { useThrottleFn } from '@vueuse/core'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { KEYBOARD_KEY_LIST, MERGE_SETTING_DELAY, localState, sleep, log, getDefaultBookmarkName } from '@/logic'

const isInitialized = useStorageLocal('data-bookmark-initialized', false)

export const localBookmarkList = useStorageLocal('data-bookmark', [] as BookmarkItem[])

export const keyboardSettingRowList = computed(() => {
  let splitIndexList: any = [[13, 23], [25, 34], [36, 43]]
  if (localState.setting.bookmark.isSymbolEnabled && localState.setting.bookmark.isNumberEnabled) {
    splitIndexList = [[0, 13], [13, 25], [25, 36], [36]]
  } else if (localState.setting.bookmark.isSymbolEnabled) {
    splitIndexList = [[13, 25], [25, 36], [36]]
  } else if (localState.setting.bookmark.isNumberEnabled) {
    splitIndexList = [[[0, 10], [12, 13]], [13, 23], [25, 34], [36, 43]]
  }
  const rowList: any[] = []
  for (const range of splitIndexList) {
    if (range.length === 1) {
      rowList.push(KEYBOARD_KEY_LIST.slice(range[0]))
    } else {
      if (Array.isArray(range[0])) {
        // 处理特殊按键的拼接，如 [[0, 10], [12, 13]]
        let tempList: any = []
        for (const rangeItem of range) {
          tempList = [...tempList, ...KEYBOARD_KEY_LIST.slice(rangeItem[0], rangeItem[1])]
        }
        rowList.push(tempList)
      } else {
        rowList.push(KEYBOARD_KEY_LIST.slice(range[0], range[1]))
      }
    }
  }
  return rowList
})

export const keyboardRowList = computed(() => {
  let splitIndexList: any = [[13, 23], [25, 34], [36, 43]]
  if (localState.setting.bookmark.isSymbolEnabled && localState.setting.bookmark.isNumberEnabled) {
    splitIndexList = [[0, 13], [13, 25], [25, 36], [36]]
  } else if (localState.setting.bookmark.isSymbolEnabled) {
    splitIndexList = [[13, 25], [25, 36], [36]]
  } else if (localState.setting.bookmark.isNumberEnabled) {
    splitIndexList = [[[0, 10], [12, 13]], [13, 23], [25, 34], [36, 43]]
  }
  const rowList: any[] = []
  for (const range of splitIndexList) {
    if (range.length === 1) {
      rowList.push(localBookmarkList.value.slice(range[0]))
    } else {
      if (Array.isArray(range[0])) {
        // 处理特殊按键的拼接，如 [[0, 10], [12, 13]]
        let tempList: any = []
        for (const rangeItem of range) {
          tempList = [...tempList, ...localBookmarkList.value.slice(rangeItem[0], rangeItem[1])]
        }
        rowList.push(tempList)
      } else {
        rowList.push(localBookmarkList.value.slice(range[0], range[1]))
      }
    }
  }
  return rowList
})

export const initBookmarkListData = () => {
  log('initBookmarkListData')
  if (isInitialized.value) {
    return
  }
  localBookmarkList.value = []
  KEYBOARD_KEY_LIST.forEach((key: string) => {
    localBookmarkList.value.push({
      key,
      url: '',
      name: '',
    })
  })
  isInitialized.value = true
}

const mergeBookmarkSetting = useThrottleFn(async() => {
  log('Merge BookmarkSetting')
  if (!isInitialized) {
    await sleep(200)
  }
  for (const key of KEYBOARD_KEY_LIST) {
    const index = KEYBOARD_KEY_LIST.indexOf(key)
    const item = localState.setting.bookmark.keymap[key]
    // 初始化无数据的按键
    if (!item) {
      localBookmarkList.value[index] = {
        key,
        url: '',
        name: '',
      }
      continue
    }
    localBookmarkList.value[index] = {
      key,
      url: item.url.includes('//') ? item.url : `https://${item.url}`,
      name: item.name || getDefaultBookmarkName(item.url),
    }
  }
}, MERGE_SETTING_DELAY)

watch(
  () => localState.setting.bookmark.keymap,
  () => {
    mergeBookmarkSetting()
  },
  { deep: true },
)
