<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import { gaProxy } from '@/logic/utils/gtag'
import {
  isDragMode,
  toggleDragMode,
  getTargetDataFromEvent,
  animateDeleteWidget,
} from '@/logic/moveable'
import { localConfig, localState } from '@/logic/config/state'
import { toggleFullscreen } from '@/logic/store/dom'
import { switchSettingDrawerVisible, globalState } from '@/logic/store/state'
import { downloadCurrentWallpaper } from '@/logic/image/service'
import { WIDGET_CODE_LIST, getWidgetSetting } from '@/common/widget-constants'

const state = reactive({
  isMenuVisible: false,
  posX: 0,
  posY: 0,
  currTargetCode: '' as EleTargetCode | '',
})

// ── 菜单项数据结构 ──
interface MenuItem {
  label?: string
  key: string
  icon?: string
  disabled?: boolean
  danger?: boolean
  type?: 'divider'
}

// ── 菜单列表冻结机制 ──
// 下载壁纸可见性：开启背景图且非拖拽模式时显示
const isDownloadVisible = computed(
  () => !isDragMode.value && localConfig.general.isBackgroundImageEnabled,
)

// 与 NDropdown 版本相同：用 ref + watch 避免点击后状态变化导致列表重算
const buildMenuList = (): MenuItem[] => {
  const isFocusMode = localState.value.isFocusMode
  const isHoverWidget = state.currTargetCode !== ''
  const targetLabel = isHoverWidget
    ? window.$t(`setting.${state.currTargetCode}`)
    : window.$t('setting.general')
  const list: MenuItem[] = [
    {
      label: targetLabel + window.$t('common.setting'),
      key: 'setting',
      icon: ICONS.settings,
      disabled: isDragMode.value,
    },
    {
      label: isDragMode.value
        ? window.$t('rightMenu.doneEdit')
        : window.$t('rightMenu.editLayout'),
      key: 'editLayout',
      icon: ICONS.dragDrop,
    },
    { type: 'divider', key: 'd1' },
    {
      label: `${isFocusMode ? window.$t('common.exit') : ''}${window.$t('rightMenu.focusMode')}`,
      key: 'focusMode',
      icon: ICONS.focus,
    },
  ]
  if (isFocusMode) {
    list.push({
      label: window.$t('rightMenu.editFocusMode'),
      key: 'editFocusMode',
      icon: 'mdi:tune',
      disabled: isDragMode.value,
    })
  }
  list.push({
    label: `${globalState.isFullScreen ? window.$t('common.exit') : ''}${window.$t('rightMenu.fullscreen')}`,
    key: 'fullscreen',
    icon: ICONS.fullscreen,
  })
  if (!isFocusMode) {
    if (isHoverWidget) {
      list.push({ type: 'divider', key: 'd2' })
      list.push({
        label: window.$t('rightMenu.deleteWidget'),
        key: 'deleteWidget',
        icon: ICONS.deleteBin,
        danger: true,
      })
    }
    // 买杯咖啡和关于图标统一放在底部 footer，不在此处追加
  }
  return list
}

const menuList = ref<MenuItem[]>(buildMenuList())

watch(
  () => state.isMenuVisible,
  (visible) => {
    if (visible) {
      menuList.value = buildMenuList()
    }
  },
)

// ── 打开/关闭设置面板 ──
const openSettingPane = (tabValue: settingPanes, anchor = '') => {
  globalState.currSettingTabCode = tabValue
  globalState.currSettingAnchor = anchor
  switchSettingDrawerVisible(true)
  gaProxy('click', ['setting', 'open'], { trigger: 'rightMenu', tab: tabValue })
  gaProxy('click', ['rightMenu', tabValue])
}

// ── 菜单动作映射 ──
const menuActionMap: Record<string, () => void | Promise<void>> = {
  setting: () => {
    const code = state.currTargetCode
    if (code.length === 0) {
      openSettingPane('general')
    } else {
      const pane = getWidgetSetting(code as WidgetCodes)
      const anchor = pane === 'clockDate' ? code : ''
      openSettingPane(pane, anchor)
    }
  },
  editLayout: () => {
    switchSettingDrawerVisible(false)
    toggleDragMode(true)
    gaProxy('click', ['rightMenu', 'editLayout'])
  },
  fullscreen: () => {
    toggleFullscreen()
    gaProxy('click', ['rightMenu', 'fullscreen'])
  },
  focusMode: () => {
    localState.value.isFocusMode = !localState.value.isFocusMode
    gaProxy('click', ['focusMode_toggle'], {
      enabled: localState.value.isFocusMode,
      source: 'rightMenu',
    })
  },
  editFocusMode: () => {
    openSettingPane('focusMode')
  },
  downloadWallpaper: async () => {
    await downloadCurrentWallpaper()
    gaProxy('click', ['rightMenu', 'downloadWallpaper'])
  },
  changeWallpaper: () => {
    globalState.isBackgroundDrawerAutoOpen = true
    switchSettingDrawerVisible(true)
    globalState.currSettingTabCode = 'general'
    gaProxy('click', ['rightMenu', 'changeWallpaper'])
  },
  aboutSponsor: () => {
    openSettingPane('aboutSponsor')
  },
  aboutIndex: () => {
    openSettingPane('aboutIndex')
  },
  deleteWidget: () => {
    const code = state.currTargetCode as WidgetCodes
    if (!WIDGET_CODE_LIST.includes(code)) return
    animateDeleteWidget(code)
    gaProxy('click', ['rightMenu', 'deleteWidget'])
  },
}

// ── 选择菜单项 ──
const onSelectMenu = (key: string) => {
  state.isMenuVisible = false
  const action = menuActionMap[key]
  if (!action) return
  setTimeout(() => {
    action()
  }, 0)
}

// ── 点击外部关闭 ──
const menuRef = ref<HTMLElement | null>(null)

const handleOutsideClick = (e: MouseEvent) => {
  if (e.button !== 0) return
  // 检查点击目标是否在菜单内部
  if (menuRef.value && menuRef.value.contains(e.target as Node)) return
  state.isMenuVisible = false
}

watch(
  () => state.isMenuVisible,
  (visible) => {
    if (visible) {
      // 使用 capture: true 确保在事件冒泡前拦截，
      // 配合 contains 检查来区分菜单内外点击
      document.addEventListener('mousedown', handleOutsideClick, true)
    } else {
      document.removeEventListener('mousedown', handleOutsideClick, true)
    }
  },
)

// ── 打开菜单（含边界检测） ──
const openMenu = (e: MouseEvent) => {
  state.posX = e.clientX
  state.posY = e.clientY
  const targetData = getTargetDataFromEvent(e)
  state.currTargetCode = targetData.code
  // 无论菜单是否已打开，都重建菜单列表（已打开时目标可能从空白变为 widget）
  menuList.value = buildMenuList()
  state.isMenuVisible = true

  nextTick(() => {
    const el = document.querySelector('.ctx-menu') as HTMLElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 8
    if (state.posX + rect.width > window.innerWidth) {
      state.posX = window.innerWidth - rect.width - margin
    }
    if (state.posY + rect.height > window.innerHeight) {
      state.posY = window.innerHeight - rect.height - margin
    }
  })
}

// ── 右键事件处理 ──
const handleContextMenu = (e: MouseEvent) => {
  if (globalState.isGuideMode || globalState.isSettingDrawerVisible) return
  e.preventDefault()
  if (isDragMode.value) {
    toggleDragMode(false)
  }
  // 无论菜单是否已打开，都直接更新位置和目标（已打开时无缝移动，未打开时弹出）
  openMenu(e)
}

// ── 生命周期 ──
onMounted(() => {
  document.addEventListener('contextmenu', handleContextMenu, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick, true)
  document.removeEventListener('contextmenu', handleContextMenu, true)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="state.isMenuVisible"
        ref="menuRef"
        class="ctx-menu"
        :style="{
          left: state.posX + 'px',
          top: state.posY + 'px',
        }"
        @mousedown.stop
        @click.stop
      >
        <!-- 主操作列表 -->
        <div class="ctx-menu__list">
          <template
            v-for="item in menuList"
            :key="item.key"
          >
            <div
              v-if="item.type !== 'divider'"
              class="ctx-menu__item"
              :class="{
                'ctx-menu__item--disabled': item.disabled,
                'ctx-menu__item--danger': item.danger,
              }"
              :data-key="item.key"
              @click="onSelectMenu(item.key)"
            >
              <Icon
                v-if="item.icon"
                :icon="item.icon"
                class="ctx-menu__item-icon"
              />
              <span class="ctx-menu__item-label">{{ item.label }}</span>
            </div>
            <div
              v-else
              class="ctx-menu__divider"
            />
          </template>
        </div>

        <!-- 底部图标行：更换壁纸 & 下载壁纸 | 买杯咖啡 & 关于 -->
        <div class="ctx-menu__footer">
          <template v-if="isDownloadVisible">
            <n-tooltip
              trigger="hover"
              placement="bottom"
            >
              <template #trigger>
                <button
                  type="button"
                  class="ctx-menu__footer-icon"
                  :aria-label="$t('rightMenu.changeWallpaper')"
                  @click.stop="onSelectMenu('changeWallpaper')"
                >
                  <Icon :icon="ICONS.imageSquare" />
                </button>
              </template>
              {{ $t('rightMenu.changeWallpaper') }}
            </n-tooltip>
            <n-tooltip
              trigger="hover"
              placement="bottom"
            >
              <template #trigger>
                <button
                  type="button"
                  class="ctx-menu__footer-icon"
                  :aria-label="$t('rightMenu.downloadWallpaper')"
                  @click.stop="onSelectMenu('downloadWallpaper')"
                >
                  <Icon :icon="ICONS.downloadFill" />
                </button>
              </template>
              {{ $t('rightMenu.downloadWallpaper') }}
            </n-tooltip>

            <div class="ctx-menu__footer-divider" />
          </template>

          <n-tooltip
            trigger="hover"
            placement="bottom"
          >
            <template #trigger>
              <button
                type="button"
                class="ctx-menu__footer-icon"
                :aria-label="$t('setting.aboutSponsor')"
                @click.stop="onSelectMenu('aboutSponsor')"
              >
                <Icon :icon="ICONS.sponsor" />
              </button>
            </template>
            {{ $t('setting.aboutSponsor') }}
          </n-tooltip>
          <n-tooltip
            trigger="hover"
            placement="bottom"
          >
            <template #trigger>
              <button
                type="button"
                class="ctx-menu__footer-icon"
                :aria-label="$t('setting.aboutIndex')"
                @click.stop="onSelectMenu('aboutIndex')"
              >
                <Icon :icon="ICONS.info" />
              </button>
            </template>
            {{ $t('setting.aboutIndex') }}
          </n-tooltip>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ============================================================
   Right-click Context Menu — Liquid Glass Implementation

   颜色通过 CSS 变量（--nt-cm-*）由 tokens.css 全局 token 提供，自动跟随 light/dark 切换。
   静态 token 来自 src/styles/tokens.css。

   玻璃光感语言：
   - ::before 内高光渐变
   - ::after  顶部高光线
   - backdrop-filter 多层模糊
   - 多层阴影叠加深度
   ============================================================ */

/* ---- 菜单容器 ---- */
.ctx-menu {
  position: fixed;
  z-index: 9999;
  user-select: none;
  padding: 7px 8px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--nt-cm-border);
  background: var(--nt-cm-bg);
  backdrop-filter: blur(40px) saturate(2);
  box-shadow:
    0 16px 48px var(--nt-cm-shadow),
    0 6px 16px rgba(0, 0, 0, 0.06),
    0 2px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---- 玻璃内高光（::before） ---- */
.ctx-menu::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.02) 40%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 0;
}

/* ---- 顶部高光线（::after） ---- */
.ctx-menu::after {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 1;
}

/* 确保内容层在玻璃高光之上 */
.ctx-menu__list,
.ctx-menu__footer {
  position: relative;
  z-index: 1;
}

/* ---- 主操作列表 ---- */
.ctx-menu__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* ---- 菜单项 ---- */
.ctx-menu__item {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 5px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    transform 0.1s ease,
    box-shadow var(--transition-fast);
  position: relative;
}

/* hover 时添加微光边框效果 */
.ctx-menu__item::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid transparent;
  transition: border-color var(--transition-fast);
  pointer-events: none;
}

.ctx-menu__item:hover::before {
  border-color: var(--gray-alpha-12);
}

.ctx-menu__item:active {
  transform: scale(0.97);
}

.ctx-menu__item:hover {
  background: var(--nt-cm-hover-bg);
  box-shadow: 0 1px 4px var(--gray-alpha-06);
}

/* ---- 图标前缀 ---- */
.ctx-menu__item-icon {
  width: 20px;
  min-width: 20px;
  margin-right: 5px;
  font-size: 16px;
  color: var(--nt-cm-icon);
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.ctx-menu__item:hover .ctx-menu__item-icon {
  color: var(--nt-cm-icon-hover);
  transform: scale(1.08);
}

/* ---- 标签文字 ---- */
.ctx-menu__item-label {
  font-size: var(--text-base);
  font-weight: 400;
  color: var(--nt-cm-text);
  letter-spacing: 0.2px;
  white-space: nowrap;
}

/* ---- disabled 项 ---- */
.ctx-menu__item--disabled {
  pointer-events: none;
}
.ctx-menu__item--disabled .ctx-menu__item-label,
.ctx-menu__item--disabled .ctx-menu__item-icon {
  opacity: var(--opacity-muted);
}
.ctx-menu__item--disabled:hover {
  background: transparent;
  box-shadow: none;
}
.ctx-menu__item--disabled:hover::before {
  border-color: transparent;
}

/* ---- 危险项 ---- */
.ctx-menu__item--danger .ctx-menu__item-label {
  color: var(--nt-cm-danger-text);
}
.ctx-menu__item--danger .ctx-menu__item-icon {
  color: var(--nt-cm-danger-icon);
}
.ctx-menu__item--danger:hover {
  background: var(--nt-cm-danger-hover);
}
.ctx-menu__item--danger:hover .ctx-menu__item-icon {
  color: var(--nt-cm-danger-text);
}

/* ---- 分割线 ---- */
.ctx-menu__divider {
  margin: 6px 10px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--nt-cm-divider) 15%,
    var(--nt-cm-divider) 85%,
    transparent 100%
  );
  height: 1px;
}

/* ---- 底部图标行 ---- */
.ctx-menu__footer {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--nt-cm-divider);
}

.ctx-menu__footer-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: none;
  font-size: 16px;
  color: var(--nt-cm-icon);
  border-radius: var(--radius-md);
  cursor: pointer;
  min-width: 0;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    transform 0.1s ease,
    box-shadow var(--transition-fast);
}

.ctx-menu__footer-divider {
  width: 1px;
  height: 16px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--nt-cm-divider) 50%,
    transparent 100%
  );
}

.ctx-menu__footer-icon:hover {
  color: var(--nt-cm-icon-hover);
  background: var(--nt-cm-hover-bg);
  box-shadow: 0 1px 4px var(--gray-alpha-08);
}

.ctx-menu__footer-icon:active {
  transform: scale(0.9);
}

/* ---- Transition 动画（非 scoped，Teleport 到 body 后仍需生效） ----
   进入 0.18s 弹性曲线 scale 0.88→1 + fade-in
   退出 0.08s ease-in 快速淡出 */
.context-menu-enter-active {
  transition:
    opacity 0.18s cubic-bezier(0.34, 1.1, 0.64, 1),
    transform 0.18s cubic-bezier(0.34, 1.1, 0.64, 1);
}

.context-menu-leave-active {
  transition:
    opacity 0.08s ease-in,
    transform 0.08s ease-in;
}

.context-menu-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(-4px);
}

.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.94) translateY(-2px);
}
</style>
