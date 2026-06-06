<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { reactive, type PropType } from 'vue'
import { SECOND_MODAL_WIDTH } from '@/logic/constants/app'
import { getBrowserBookmark, getFaviconFromUrl } from '@/logic/bookmark/api'
import { ICONS } from '@/logic/constants/icons'
import NTDrawer from '@/components/ui/NTDrawer.vue'
import NTTree from '@/components/ui/NTTree.vue'
import { useDrawerStack } from '@/composables/useDrawerStack'

interface TreeOption {
  key: string
  label: string
  children?: TreeOption[]
  isFolder?: boolean
  url?: string
  id?: string
  title?: string
  path?: string
  [key: string]: any
}

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  width: {
    type: Number,
    default: SECOND_MODAL_WIDTH,
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
 * 构建树节点数据
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
  <NTDrawer
    class="browser__bookmark-picker"
    :open="props.show"
    :width="props.width"
    :title="$t('generalSetting.browserBookmark')"
    closable
    @update:open="handleUpdateShow"
  >
    <div class="bookmark-picker__body">
      <NTInput v-model:value="state.treePattern" />
      <NTTree
        :data="state.bookmarks"
        :pattern="state.treePattern"
        :show-irrelevant-nodes="false"
        key-field="key"
        label-field="label"
        block-line
        block-node
        show-line
        expand-on-click
        :default-expanded-keys="state.defaultExpandedKeys"
        :node-props="state.nodeProps"
        style="margin-top: 5px"
      >
        <!-- 节点图标：文件夹用 folder 图标，书签用 favicon -->
        <template #prefix="{ option }">
          <template v-if="option.isFolder">
            <Icon
              :icon="ICONS.folderOutline"
              style="margin-top: 3px; font-size: 16px"
            />
          </template>
          <template v-else>
            <img
              :src="getFaviconFromUrl(option.url || '')"
              style="width: 14px; height: 14px"
            />
          </template>
        </template>
      </NTTree>
    </div>
  </NTDrawer>
</template>

<style>
.browser__bookmark-picker {
  .reka-tree__label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;
  }
}
.bookmark-picker__body {
  padding: 10px 15px;
}
</style>
