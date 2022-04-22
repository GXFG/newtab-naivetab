import { useDebounceFn } from '@vueuse/core'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { KEYBOARD_KEY_LIST, MERGE_BOOKMARK_DELAY, localConfig, sleep, log, getDefaultBookmarkName } from '@/logic'

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
        // 处理特殊按键的拼接，如：数字 + BS [[0, 10], [12, 13]]
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

export const keyboardSettingRowList = computed(() => getKeyboardList(KEYBOARD_KEY_LIST))

export const keyboardRowList = computed(() => getKeyboardList(localBookmarkList.value))

const isInitialized = useStorageLocal('data-bookmark-initialized', false)

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
}

const mergeBookmarkSetting = useDebounceFn(async() => {
  log('Bookmark merge setting')
  if (!isInitialized) {
    await sleep(300)
  }
  for (const key of KEYBOARD_KEY_LIST) {
    const index = KEYBOARD_KEY_LIST.indexOf(key)
    const item = localConfig.bookmark.keymap[key]
    if (!item) {
      // 初始化无设置数据的按键
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
}, MERGE_BOOKMARK_DELAY)

watch(
  () => localConfig.bookmark.keymap,
  () => {
    mergeBookmarkSetting()
  },
  { deep: true },
)
