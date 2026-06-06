<script setup lang="ts">
/**
 * NTTree — NaiveTab 树形组件
 *
 * 基于 Reka UI TreeRoot + TreeItem 原语封装。
 * 对标 Naive UI NTree API，支持层级数据渲染、搜索过滤、节点点击、
 * 递归展开/折叠、自定义节点图标。
 *
 * Reka flattenItems 结构：{ _id, value: 原始数据, bind, level, hasChildren, ... }
 * TreeItem slot 暴露：{ isExpanded, isSelected, isIndeterminate, handleToggle, handleSelect }
 *
 * @example
 * <NTTree
 *   :data="items"
 *   key-field="key"
 *   label-field="label"
 *   expand-on-click
 *   @node-click="handleClick"
 * >
 *   <template #prefix="{ option }">
 *     <Icon :icon="option.isFolder ? folderIcon : fileIcon" />
 *   </template>
 * </NTTree>
 */
import { TreeRoot, TreeItem } from 'reka-ui'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { ICONS } from '@/logic/constants/icons'

interface TreeOption {
  key: string
  label: string
  children?: TreeOption[]
  isFolder?: boolean
  /** 匹配标记（内部使用） */
  _matches?: boolean
  /** 子节点中是否有匹配项（内部使用） */
  _hasMatch?: boolean
  [key: string]: any
}

/** Reka flattenItems 输出的拍平节点（部分字段） */
interface FlatItem {
  _id: string
  value: TreeOption
  bind: Record<string, any>
  level: number
  hasChildren: boolean
}

const props = withDefaults(
  defineProps<{
    /** 树形数据 */
    data?: TreeOption[]
    /** 搜索过滤文本 */
    pattern?: string
    /** 是否显示不相关节点（false 时仅显示匹配节点及其祖先） */
    showIrrelevantNodes?: boolean
    /** 节点 key 字段名 */
    keyField?: string
    /** 节点 label 字段名 */
    labelField?: string
    /** 是否 block-line 模式（hover 整行高亮） */
    blockLine?: boolean
    /** 是否 block-node 模式（整行可点击） */
    blockNode?: boolean
    /** 是否显示连接线 */
    showLine?: boolean
    /** 点击节点时是否触发展开/折叠 */
    expandOnClick?: boolean
    /** 默认展开的节点 keys（传入 Reka TreeRoot defaultExpanded） */
    defaultExpandedKeys?: string[]
    /** 自定义节点属性（如 onClick） */
    nodeProps?: (info: { option: TreeOption }) => Record<string, any>
  }>(),
  {
    data: () => [],
    pattern: '',
    showIrrelevantNodes: true,
    keyField: 'key',
    labelField: 'label',
    blockLine: false,
    blockNode: false,
    showLine: false,
    expandOnClick: false,
    defaultExpandedKeys: () => [],
    nodeProps: undefined,
  },
)

const emit = defineEmits<{
  /** 节点点击事件（传递原始数据） */
  (e: 'node-click', option: TreeOption): void
}>()

// ============================================================
// get-key / get-children（Reka TreeRoot 数据适配）
// ============================================================

const getKey = (item: TreeOption): string => item[props.keyField] as string
const getChildren = (item: TreeOption): TreeOption[] | undefined => {
  const children = item.children
  return children && children.length > 0 ? children : undefined
}

// ============================================================
// 模式过滤
// ============================================================

function filterTree(items: TreeOption[], lowerPattern: string): TreeOption[] {
  const result: TreeOption[] = []
  for (const item of items) {
    const label = String(item[props.labelField] || '').toLowerCase()
    const selfMatches = label.includes(lowerPattern)

    let filteredChildren: TreeOption[] = []
    if (item.children) {
      filteredChildren = filterTree(item.children, lowerPattern)
    }

    const hasMatchingChildren = filteredChildren.length > 0

    if (selfMatches || hasMatchingChildren) {
      result.push({
        ...item,
        children:
          filteredChildren.length > 0 ? filteredChildren : item.children,
        _matches: selfMatches,
        _hasMatch: hasMatchingChildren,
      })
    }
  }
  return result
}

const filteredData = computed(() => {
  if (!props.pattern?.trim()) return props.data
  const lower = props.pattern.trim().toLowerCase()

  if (props.showIrrelevantNodes) {
    function markMatches(items: TreeOption[]): TreeOption[] {
      return items.map((item) => {
        const label = String(item[props.labelField] || '').toLowerCase()
        const children = item.children
          ? markMatches(item.children)
          : item.children
        return { ...item, children, _matches: label.includes(lower) }
      })
    }
    return markMatches(props.data)
  }

  return filterTree(props.data, lower)
})

// ============================================================
// 自定义节点属性
// ============================================================
function getNodeProps(option: TreeOption): Record<string, any> {
  if (!props.nodeProps) return {}
  return props.nodeProps({ option })
}

// ============================================================
// 节点内容点击处理
// ============================================================
function handleNodeContentClick(flatItem: FlatItem, event: MouseEvent) {
  const option = flatItem.value

  // 触发 node-props 中定义的 onClick
  const customProps = getNodeProps(option)
  if (customProps.onClick) {
    customProps.onClick(event)
  }

  emit('node-click', option)
}
</script>

<template>
  <TreeRoot
    v-slot="{ flattenItems }"
    :items="filteredData"
    :get-key="getKey"
    :get-children="getChildren"
    :default-expanded="defaultExpandedKeys"
    class="reka-tree"
    :class="{
      'reka-tree--block-line': blockLine,
      'reka-tree--block-node': blockNode,
      'reka-tree--show-line': showLine,
      'reka-tree--expand-on-click': expandOnClick,
    }"
  >
    <template
      v-for="item in flattenItems"
      :key="item._id"
    >
      <TreeItem
        v-slot="{ isExpanded, handleToggle }"
        v-bind="item.bind"
        class="reka-tree__item"
        :class="{
          'reka-tree__item--folder': item.hasChildren,
          'reka-tree__item--matched': item.value._matches,
          'reka-tree__item--has-match': item.value._hasMatch,
        }"
      >
        <div
          class="reka-tree__node"
          @click="handleNodeContentClick(item as FlatItem, $event)"
        >
          <!-- 展开/折叠箭头 -->
          <button
            v-if="item.hasChildren"
            type="button"
            class="reka-tree__toggle"
            :aria-label="isExpanded ? '折叠' : '展开'"
            @click.stop="handleToggle"
          >
            <Icon
              :icon="ICONS.chevronRight"
              class="reka-tree__chevron"
            />
          </button>

          <!-- 占位（叶子节点对齐） -->
          <span
            v-else
            class="reka-tree__toggle-placeholder"
          />

          <!-- 节点图标（prefix 插槽，传递原始数据） -->
          <span class="reka-tree__prefix">
            <slot
              name="prefix"
              :option="item.value"
              :is-expanded="isExpanded"
            />
          </span>

          <!-- 节点标签 -->
          <span class="reka-tree__label">
            <slot
              name="label"
              :option="item.value"
              :is-expanded="isExpanded"
            >
              {{ item.value[labelField] }}
            </slot>
          </span>
        </div>
      </TreeItem>
    </template>
  </TreeRoot>
</template>
