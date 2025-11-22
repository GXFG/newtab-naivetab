<script setup lang="ts">
import type { TreeOption } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { SECOND_MODAL_WIDTH } from '@/logic/constants/index'
import { getBrowserBookmark, getFaviconFromUrl } from '@/logic/bookmark'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  width: {
    type: String,
    default: `${SECOND_MODAL_WIDTH}`,
  },
})

const emit = defineEmits(['update:show', 'select'])

const onClose = () => {
  emit('update:show', false)
}

const state = reactive({
  treePattern: '',
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

const formatBookmark = (root: ChromeBookmarkItem[]) => {
  const res = [] as ChromeBookmarkItem[]
  for (const item of root) {
    const isFolder = Object.prototype.hasOwnProperty.call(item, 'children')
    const curr = {
      ...item,
      prefix: () => h('img', { style: 'width: 14px; height: 14px', src: getFaviconFromUrl(item.url || '') }), // favicon
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
  let root = await getBrowserBookmark()
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
    :width="props.width"
    show-mask="transparent"
    @update:show="handleUpdateShow"
  >
    <NDrawerContent
      :title="$t('popup.browserBookmark')"
      closable
    >
      <n-input v-model:value="state.treePattern" />
      <NTree
        :data="state.bookmarks"
        :pattern="state.treePattern"
        :show-irrelevant-nodes="false"
        key-field="id"
        label-field="title"
        :selectable="false"
        :keyboard="false"
        block-line
        block-node
        show-line
        expand-on-click
        :default-expanded-keys="state.defaultExpandedKeys"
        :node-props="state.nodeProps"
        style="margin-top: 5px"
      />
    </NDrawerContent>
  </NDrawer>
</template>

<style>
.n-drawer-body-content-wrapper {
  padding: 10px 20px !important;
}

.n-tree .n-tree-node-content .n-tree-node-content__text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}
</style>
