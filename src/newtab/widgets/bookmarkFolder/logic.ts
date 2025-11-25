import { getBrowserBookmark } from '@/logic/bookmark'
import { localConfig } from '@/logic/store'

export const state = reactive({
  systemBookmarks: [] as BookmarkNode[],
  selectedFolderTitles: [] as string[],
  isGetBookmarkLoading: false,
  isNoPermission: false,
})

export const refreshSelectedFolderTitles = () => {
  state.selectedFolderTitles = JSON.parse(JSON.stringify(localConfig.bookmarkFolder.selectedFolderTitles)) || []
}

export const initData = async () => {
  if (state.isGetBookmarkLoading) {
    return
  }
  state.isGetBookmarkLoading = true
  try {
    const base = await getBrowserBookmark()
    state.systemBookmarks = base
    refreshSelectedFolderTitles()
    state.isNoPermission = false
  } catch (e) {
    console.error(e)
    state.isNoPermission = true
  }
  state.isGetBookmarkLoading = false
}
