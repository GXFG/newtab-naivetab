<template>
  <NModal :show="props.show" style="width: 700px" preset="card" :title="$t('setting.bookmark')" :mask-closable="true" @update:show="onCloseModal()">
    <div class="modal__content">
      <NTree
        block-line
        :data="state.bookmarks"
        key-field="id"
        label-field="title"
        :selectable="false"
        :default-expanded-keys="state.defaultExpandedKeys"
        :node-props="state.nodeProps"
      />
    </div>
  </NModal>
</template>
<script setup lang="ts">
import type { TreeOption } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { getDomainIcon } from '@/logic'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['close', 'select'])

const state = reactive({
  bookmarks: [] as any,
  defaultExpandedKeys: ['1'], // 默认展开书签栏
  nodeProps: ({ option }: { option: TreeOption }) => {
    return {
      onClick() {
        if (Object.prototype.hasOwnProperty.call(option, 'children')) {
          return
        }
        emit('select', option)
        emit('close')
      },
    }
  },
})

const onCloseModal = () => {
  emit('close')
}

const onGetBookmark = () => {
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
  const res = [] as any
  for (const item of root) {
    const isFolder = Object.prototype.hasOwnProperty.call(item, 'children')
    const curr: any = {
      ...item,
      prefix: () => h('img', { style: 'width: 14px; height: 14px', src: getDomainIcon(item.url) }), // ico
    }
    if (isFolder) {
      curr.children = formatBookmark(item.children)
      curr.prefix = () => h('div', { style: 'margin-top: 3px;font-size: 16px;' }, h(Icon, { icon: 'ion:folder-outline' })) // folder
    }
    res.push(curr)
  }
  return res
}

const onInitBookmarks = async() => {
  const res: any = await onGetBookmark()
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

<style scoped>
.modal__content {
  height: 60vh;
}
</style>
