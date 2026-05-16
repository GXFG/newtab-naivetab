<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { TreeOption } from 'naive-ui'
import { h, reactive, type PropType } from 'vue'
import { SECOND_MODAL_WIDTH } from '@/logic/constants/app'
import { getBrowserBookmark, getFaviconFromUrl } from '@/logic/bookmark/api'
import { ICONS } from '@/logic/constants/icons'
import { useDrawerStack } from '@/composables/useDrawerStack'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  width: {
    type: String,
    default: `${SECOND_MODAL_WIDTH}`,
  },
  selectType: {
    type: String as PropType<'bookmark' | 'folder'>,
    default: 'bookmark',
  },
})

const emit = defineEmits(['update:show', 'select'])

const onClose = () => {
  emit('update:show', false)
}

const state = reactive({
  treePattern: '',
  bookmarks: [] as TreeOption[],
  defaultExpandedKeys: ['1'], // 默认展开书签栏
  nodeProps: ({ option }: { option: TreeOption }) => {
    return {
      onClick() {
        const isFolder = option.isFolder as boolean | undefined
        if (isFolder && props.selectType === 'bookmark') return
        if (!isFolder && props.selectType === 'folder') return
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

/**
 * 构建 Naive UI TreeOption 数据
 * selectType='folder' 时过滤掉所有书签节点，只保留文件夹
 */
const buildTreeOptions = (
  root: BookmarkNode[],
  parentPath = '',
  selectType: 'bookmark' | 'folder' = 'bookmark',
): TreeOption[] => {
  const res: TreeOption[] = []
  for (const item of root) {
    const isFolder = !item.url && Array.isArray(item.children)
    if (selectType === 'folder' && !isFolder) continue
    const fullPath = parentPath ? `${parentPath}/${item.title}` : item.title
    const curr: TreeOption = {
      key: item.id,
      label: item.title,
      isFolder,
      path: fullPath,
      // 保留原始数据供 emit('select') 传递完整信息
      url: item.url,
      id: item.id,
      title: item.title,
    }
    if (isFolder) {
      const filteredChildren = buildTreeOptions(
        item.children as BookmarkNode[],
        fullPath,
        selectType,
      )
      if (filteredChildren.length) {
        curr.children = filteredChildren
      }
      curr.prefix = () =>
        h(
          'div',
          { style: 'margin-top: 3px;font-size: 16px;' },
          h(Icon, { icon: ICONS.folderOutline }),
        )
    } else {
      curr.prefix = () =>
        h('img', {
          style: 'width: 14px; height: 14px',
          src: getFaviconFromUrl(item.url || ''),
        })
    }
    res.push(curr)
  }
  return res
}

const onInitBookmarks = async () => {
  const root = await getBrowserBookmark()
  state.bookmarks = buildTreeOptions(root, '', props.selectType)
}

watch(
  () => props.show,
  (value: boolean) => {
    if (value) {
      onInitBookmarks()
    }
  },
)

// ESC 逐层关闭支持
useDrawerStack('browser-bookmark-picker', toRef(props, 'show'), onClose)
</script>

<template>
  <NDrawer
    class="browser__bookmark-picker"
    :show="props.show"
    :width="props.width"
    show-mask="transparent"
    @update:show="handleUpdateShow"
  >
    <NDrawerContent
      :title="$t('generalSetting.browserBookmark')"
      closable
      :header-style="{ padding: '11px', fontSize: '14px' }"
      :body-style="{ padding: '10px 20px' }"
    >
      <n-input v-model:value="state.treePattern" />
      <NTree
        :data="state.bookmarks"
        :pattern="state.treePattern"
        :show-irrelevant-nodes="false"
        key-field="key"
        label-field="label"
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
.browser__bookmark-picker {
  .n-tree .n-tree-node-content .n-tree-node-content__text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }
}
</style>
