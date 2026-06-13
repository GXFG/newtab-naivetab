<script setup lang="ts">
/**
 * @module SettingNav
 *
 * Setting 面板左侧导航列表，支持分组分隔线、滑动激活指示线。
 * 接收 tabPaneList 和 groupLabelMap，nav 选中时 emit select 事件。
 * 内部管理滑动指示器的位置计算与动画。
 */
import { Icon } from '@iconify/vue'
import NTScrollArea from '@/components/ui/NTScrollArea.vue'
import { globalState } from '@/logic/store/state'
import type { SettingMeta } from '@/setting/registry'

const props = defineProps<{
  tabPaneList: SettingMeta[]
  groupLabelMap: Map<settingPanes, string>
}>()

const emit = defineEmits<{
  select: [code: string]
}>()

// ── 展平列表：把分组标题作为独立元素插入 items 之间 ──
interface FlattenedEntry {
  type: 'divider' | 'item'
  key: string
  data?: SettingMeta
  label?: string
}

const flattenedList = computed<FlattenedEntry[]>(() => {
  const list: FlattenedEntry[] = []
  for (const item of props.tabPaneList) {
    const label = props.groupLabelMap.get(item.code)
    if (label) {
      list.push({
        type: 'divider',
        key: `divider-${item.code}`,
        label,
      })
    }
    list.push({
      type: 'item',
      key: item.code,
      data: item,
    })
  }
  return list
})

// ── 滑动指示器 ──
const navRef = ref<HTMLElement | null>(null)
const indicatorTop = ref(0)
const indicatorHeight = ref(0)
const transitionReady = ref(false)

/** 读取激活 nav-item 的位置，更新指示器坐标 */
function updateIndicator() {
  const nav = navRef.value
  if (!nav) return
  const activeEl = nav.querySelector(
    '.setting-nav__item--active',
  ) as HTMLElement | null
  if (!activeEl) {
    indicatorTop.value = 0
    indicatorHeight.value = 0
    return
  }
  // 指示器 position:absolute 参考系为 .setting-nav__list（内层），
  // 因此用 listRect 而非 navRect，避免外层 padding / NTScrollArea 层级干扰
  const list = nav.querySelector('.setting-nav__list')
  if (!list) return
  const listRect = list.getBoundingClientRect()
  const activeRect = activeEl.getBoundingClientRect()
  // 旧 ::before 为 height:50% + top:50% + translateY(-50%)（短条居中），此处等同
  const h = activeRect.height * 0.5
  indicatorTop.value =
    activeRect.top - listRect.top + (activeRect.height - h) * 0.5
  indicatorHeight.value = h
}

onMounted(() => {
  nextTick(() => {
    updateIndicator()
    // 首次定位后再启用过渡，避免 mount 时从 0 跳变
    transitionReady.value = true
    // 监听 nav 滚动，保持指示器与激活项对齐
    const viewport = navRef.value?.querySelector('.reka-scroll-area__viewport')
    if (viewport) {
      viewport.addEventListener('scroll', updateIndicator, { passive: true })
    }
  })
})

onBeforeUnmount(() => {
  const viewport = navRef.value?.querySelector('.reka-scroll-area__viewport')
  if (viewport) {
    viewport.removeEventListener('scroll', updateIndicator)
  }
})

// 切换 tab 时更新（DOM 更新后计算位置）
watch(
  () => globalState.currSettingTabCode,
  () => {
    nextTick(updateIndicator)
  },
)

const onClick = (code: string) => {
  emit('select', code)
}
</script>

<template>
  <div
    ref="navRef"
    class="setting-nav"
  >
    <NTScrollArea>
      <div class="setting-nav__list">
        <!-- 滑动激活指示器 -->
        <div
          class="setting-nav__indicator"
          :class="{ 'setting-nav__indicator--no-transition': !transitionReady }"
          :style="{
            top: indicatorTop + 'px',
            height: indicatorHeight + 'px',
          }"
        />
        <template
          v-for="entry in flattenedList"
          :key="entry.key"
        >
          <!-- 分组分隔线（独立元素，不在 item 内，hover 不影响 item） -->
          <div
            v-if="entry.type === 'divider'"
            class="setting-nav__group-divider"
          >
            <span class="setting-nav__group-divider-text">{{
              $t(entry.label!)
            }}</span>
          </div>
          <div
            v-else
            class="setting-nav__item"
            :class="{
              'setting-nav__item--active':
                globalState.currSettingTabCode === entry.data!.code,
            }"
            @click="onClick(entry.data!.code)"
          >
            <div
              class="setting-nav__icon"
              :style="`font-size: ${entry.data!.iconSize}px`"
            >
              <Icon :icon="entry.data!.iconName" />
            </div>
            <span class="setting-nav__text">{{
              $t(entry.data!.labelKey || '')
            }}</span>
          </div>
        </template>
      </div>
    </NTScrollArea>
  </div>
</template>

<style scoped>
/* ============================================================
   SettingNav — 左侧导航栏
   ============================================================ */
.setting-nav {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-shrink: 0;
  position: relative;
  padding: var(--space-3) var(--space-2);
  background: var(--nt-setting-nav-bg);
  border-right: 1px solid var(--nt-gray-moderate);
  user-select: none;
}

/* ── 列表容器（指示器定位参考系）── */
.setting-nav__list {
  position: relative;
  min-width: max-content;
}

/* ── 滑动激活指示器 ── */
.setting-nav__indicator {
  position: absolute;
  left: 5px;
  top: 0;
  width: 3px;
  border-radius: 2px;
  background: var(--nt-primary-color);
  transition:
    top 200ms ease,
    height 200ms ease;
  pointer-events: none;
  z-index: 1;

  &.setting-nav__indicator--no-transition {
    transition: none !important;
  }
}

/* ── nav 条目 ── */
.setting-nav__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-1) 0;
  padding: var(--space-2) var(--space-3);
  position: relative;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background var(--transition-base),
    color var(--transition-fast);
  letter-spacing: 0.1px;

  /* hover 时微光边框（参考右键菜单 ctx-menu__item） */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid transparent;
    transition: border-color var(--transition-fast);
    pointer-events: none;
  }

  &:not(:disabled):hover {
    background: var(--nt-gray-minimal);
    box-shadow: 0 1px 4px var(--nt-gray-minimal);
  }

  &:not(:disabled):hover::before {
    border-color: var(--nt-gray-light);
  }

  &.setting-nav__item--active {
    background: color-mix(in srgb, var(--nt-primary-color) 14%, transparent);
    color: var(--nt-primary-color);

    .setting-nav__icon {
      opacity: 1;
      color: var(--nt-primary-color);
    }

    .setting-nav__text {
      color: var(--nt-primary-color);
      font-weight: 600;
    }
  }
}

/* nav 图标 */
.setting-nav__icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 22px;
  flex-shrink: 0;
  transition:
    color var(--transition-fast),
    opacity var(--transition-fast),
    transform 0.1s ease;
}

.setting-nav__item:hover .setting-nav__icon {
  color: var(--nt-text-color-main);
  transform: scale(1.08);
}

.setting-nav__text {
  font-size: var(--text-base);
  user-select: none;
  letter-spacing: 0.1px;
}

/* ── 分组分隔线（独立元素） ── */
.setting-nav__group-divider {
  position: relative;
  margin: 20px 0 8px;
  text-align: center;
  padding: 0 4px;

  .setting-nav__group-divider-text {
    display: inline-block;
    position: relative;
    z-index: 1;
    padding: 0 10px;
    font-size: 10px;
    font-weight: 500;
    color: var(--nt-text-tertiary);
    background: var(--nt-setting-nav-bg);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 8px;
    right: 8px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--nt-gray-heavy) 20%,
      var(--nt-gray-heavy) 80%,
      transparent
    );
    opacity: 1;
    z-index: 0;
  }
}
</style>
