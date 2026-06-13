<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, watch } from 'vue'
import { localConfig, localState } from '@/logic/config/state'
import { customPrimaryColor, colorMixWithAlpha } from '@/logic/store/style'
import { widgetsRegistry } from '@/newtab/widgets/registry'
import { WIDGET_GROUPS } from '@/common/widget-constants'
import { ICONS } from '@/logic/constants/icons'
import { SettingFormSection } from '@/setting/components'
import { SwitchField } from '@/setting/fields'
import NTSwitch from '@/components/ui/NTSwitch.vue'
import { gaProxy } from '@/logic/utils/gtag'

/** 与 WIDGET_GROUPS 按索引对应的分组图标 */
const WIDGET_GROUP_ICONS = [
  ICONS.clockAnalog,
  ICONS.bookmarkKeyboard,
  ICONS.tune,
]

const widgetGroups = computed(() =>
  WIDGET_GROUPS.map((group) => ({
    label: window.$t(group.labelKey),
    items: group.codes.map((code) => widgetsRegistry[code]).filter(Boolean),
  })),
)

watch(
  () => localState.value.isFocusMode,
  (val) => {
    gaProxy('click', ['focusMode_toggle'], {
      enabled: val,
      source: 'setting',
    })
  },
)

// 将主题色替换 alpha 通道，生成半透明版本
const primaryBg = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.08),
)
const primaryBgHover = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.14),
)
const primaryBorder = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.28),
)
const primaryIconBg = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.14),
)

const cssVars = computed(() => ({
  '--nt-focus-primary-bg': primaryBg.value,
  '--nt-focus-primary-bg-hover': primaryBgHover.value,
  '--nt-focus-primary-border': primaryBorder.value,
  '--nt-focus-primary-icon-bg': primaryIconBg.value,
}))

/**
 * focusMode 面板故意不使用 SettingFormWrap，属于预期设计。
 * 其他面板使用 SettingFormWrap 是为了获取统一的容器样式 + 底部重置按钮，
 * 但 focusMode 操作的是 localState.isFocusMode（布尔开关）而非 localConfig，
 * 不需要重置功能，且包含自定义的 Widget 网格 UI，无法复用标准表单布局。
 */
</script>

<template>
  <div
    class="setting__pane-content"
    :style="cssVars"
  >
    <SettingFormSection section-key="common.behavior">
      <SwitchField
        v-model="localState.isFocusMode"
        :label="$t('generalSetting.enableFocusMode')"
        :tip-content="$t('generalSetting.focusModeTips')"
      />
    </SettingFormSection>

    <div class="focus__groups">
      <SettingFormSection
        v-for="(group, index) in widgetGroups"
        :key="group.label"
        :title="group.label"
        :icon="WIDGET_GROUP_ICONS[index]"
        style="margin-bottom: 16px"
      >
        <div class="focus__grid">
          <div
            v-for="meta in group.items"
            :key="meta.code"
            class="focus__item"
            :class="{
              'focus__item--active':
                localConfig.general.focusVisibleWidgetMap[meta.code],
            }"
            @click="
              localConfig.general.focusVisibleWidgetMap[meta.code] =
                !localConfig.general.focusVisibleWidgetMap[meta.code]
            "
          >
            <div class="focus__icon-wrap">
              <Icon
                class="focus__icon"
                :icon="meta.iconName"
                :style="{ fontSize: meta.iconSize + 'px' }"
              />
            </div>
            <span class="focus__label">{{ $t(meta.widgetLabel) }}</span>
            <!-- 用原生 div 包裹保证 .stop 可靠生效，
                   组件上的 @click.stop 经 fallthrough 链可能丢失 -->
            <div
              class="focus__switch-wrap"
              @click.stop
            >
              <NTSwitch
                v-model:value="
                  localConfig.general.focusVisibleWidgetMap[meta.code]
                "
              />
            </div>
          </div>
        </div>
      </SettingFormSection>
    </div>
  </div>
</template>

<style scoped>
.focus__groups {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 8px;
}

.focus__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  padding: 10px;
  gap: 10px;
  width: 100%;
}

.focus__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  background-color: var(--nt-gray-minimal);
  cursor: pointer;
  transition:
    background-color var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base);
  user-select: none;

  &:hover {
    background-color: var(--nt-gray-light);
    border-color: var(--nt-gray-moderate);
    box-shadow: var(--shadow-sm);
  }

  &.focus__item--active {
    background-color: var(--nt-focus-primary-bg);
    border-color: var(--nt-focus-primary-border);

    .focus__icon-wrap {
      background-color: var(--nt-focus-primary-icon-bg);
      color: var(--nt-primary-color);
    }

    .focus__label {
      opacity: var(--opacity-primary);
      font-weight: 500;
    }

    &:hover {
      background-color: var(--nt-focus-primary-bg-hover);
    }
  }
}

.focus__icon-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  border-radius: var(--radius-lg);
  background-color: var(--nt-gray-light);
  color: var(--nt-text-secondary);
  transition:
    background-color var(--transition-base),
    color var(--transition-base);
}

.focus__icon {
  display: block;
}

.focus__label {
  flex: 1;
  font-size: var(--text-sm);
  line-height: 1.4;
  opacity: var(--opacity-secondary);
  transition:
    opacity var(--transition-base),
    font-weight var(--transition-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.focus__switch-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
</style>
