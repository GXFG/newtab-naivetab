<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import {
  localConfig,
  localState,
  customPrimaryColor,
  colorMixWithAlpha,
} from '@/logic/store'
import { widgetsRegistry } from '@/newtab/widgets/registry'
import { WIDGET_GROUPS } from '@/newtab/widgets/codes'
import { SettingHeaderBar, SettingFormSection } from '@/setting/components'
import { SwitchField } from '@/setting/fields'
import { ICONS } from '@/logic/icons'

const widgetGroups = computed(() =>
  WIDGET_GROUPS.map((group) => ({
    label: window.$t(group.labelKey),
    items: group.codes.map((code) => widgetsRegistry[code]).filter(Boolean),
  })),
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
  '--nt-focus-custom-primary-color': customPrimaryColor.value,
}))

/**
 * focusMode 面板故意不使用 SettingFormWrap，属于预期设计。
 * 其他面板使用 SettingFormWrap 是为了获取统一的容器样式 + 底部重置按钮，
 * 但 focusMode 操作的是 localState.isFocusMode（布尔开关）而非 localConfig，
 * 不需要重置功能，且包含自定义的 Widget 网格 UI，无法复用标准表单布局。
 */
</script>

<template>
  <div :style="cssVars">
    <SettingHeaderBar :title="$t('setting.focusMode')" />

    <div class="setting__pane-content">
      <SettingFormSection
        :title="$t('generalSetting.focusWidgets')"
        :icon="ICONS.fullscreen"
      >
        <SwitchField
          v-model="localState.isFocusMode"
          :label="$t('generalSetting.enableFocusMode')"
          :tip-content="$t('generalSetting.focusModeTips')"
        />
      </SettingFormSection>

      <div class="focus__groups">
        <div
          v-for="group in widgetGroups"
          :key="group.label"
          class="focus__group"
        >
          <p class="focus__group-label">
            {{ group.label }}
          </p>
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
              <div class="focus__switch-wrap">
                <NSwitch
                  v-model:value="
                    localConfig.general.focusVisibleWidgetMap[meta.code]
                  "
                  size="small"
                  @click.stop
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.focus__groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

.focus__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.focus__group-label {
  padding-left: 2px;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.4;
  user-select: none;
}

.focus__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 6px;
  width: 100%;
}

.focus__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  background-color: var(--gray-alpha-06);
  cursor: pointer;
  transition:
    background-color var(--transition-base),
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    transform var(--transition-fast);
  user-select: none;

  &:hover {
    background-color: var(--gray-alpha-10);
    border-color: var(--gray-alpha-15);
    box-shadow: var(--shadow-sm);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &.focus__item--active {
    background-color: var(--nt-focus-primary-bg);
    border-color: var(--nt-focus-primary-border);

    .focus__icon-wrap {
      background-color: var(--nt-focus-primary-icon-bg);
      color: var(--nt-focus-custom-primary-color);
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
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background-color: var(--gray-alpha-10);
  color: var(--gray-alpha-70);
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
