<script setup lang="ts">
import type { TreeOption } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { SECOND_MODAL_WIDTH } from '@/logic/const'
import { getFaviconFromUrl } from '@/logic/bookmark'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:show', 'select'])

const onClose = () => {
  emit('update:show', false)
}

const state = reactive({
  bookmarks: [] as ChromeBookmarkItem[],
  defaultExpandedKeys: ['1'], // 默认展开书签栏
  nodeProps: ({ option }: { option: TreeOption }) => {
    return {
      onClick() {
        if (Object.prototype.hasOwnProperty.call(option, 'children')) {
          return
        }
        emit('select', option)
        onClose()
      },
    }
  },
})

const handleUpdateShow = (value: boolean) => {
  if (value) {
    return
  }
  onClose()
}

const onGetBookmark = (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((bookmarks) => {
        resolve(bookmarks)
      })
    } catch (e) {
      reject(e)
    }
  })
}

const formatBookmark = (root: ChromeBookmarkItem[]) => {
  const res = [] as ChromeBookmarkItem[]
  for (const item of root) {
    const isFolder = Object.prototype.hasOwnProperty.call(item, 'children')
    const curr = {
      ...item,
      prefix: () => h('img', { style: 'width: 14px; height: 14px', src: getFaviconFromUrl(item.url) }), // ico
    }
    if (isFolder) {
      curr.children = formatBookmark(item.children)
      curr.prefix = () => h('div', { style: 'margin-top: 3px;font-size: 16px;' }, h(Icon, { icon: 'ion:folder-outline' })) // folder
    }
    res.push(curr)
  }
  return res
}

const onInitBookmarks = async () => {
  const res = (await onGetBookmark()) as ChromeBookmarkItem[]
  let root = res[0].children
  root = formatBookmark(root)
  state.bookmarks = root
}

watch(
  () => props.show,
  (value: boolean) => {
    if (!value) {
      return
    }
    onInitBookmarks()
  },
)
</script>

<template>
  <NDrawer
    :show="props.show"
    :width="SECOND_MODAL_WIDTH"
    @update:show="handleUpdateShow"
  >
    <NDrawerContent
      :title="$t('setting.bookmark')"
      closable
    >
      <NTree
        block-line
        :data="state.bookmarks"
        key-field="id"
        label-field="title"
        :selectable="false"
        :default-expanded-keys="state.defaultExpandedKeys"
        :node-props="state.nodeProps"
      />
    </NDrawerContent>
  </NDrawer>
</template>

<style>
.n-tree .n-tree-node-content .n-tree-node-content__text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}
</style>
