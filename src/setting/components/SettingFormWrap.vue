<script setup lang="ts">
import { h } from 'vue'
import { Icon } from '@iconify/vue'
import NTDropdown from '@/components/ui/NTDropdown.vue'
import NTButton from '@/components/ui/NTButton.vue'
import { ICONS } from '@/logic/constants/icons'
import {
  resetWidgetConfig,
  hasWidgetConfig,
  hasPreserveFields,
} from '@/logic/config/reset'

import { showToast } from '@/common/toast'

/**
 * SettingFormWrap — 每个 Widget 设置面板的容器组件，职责：
 * 1. 包裹内容区域，提供统一的 .setting__pane-content 样式类
 * 2. 底部自动附加重置按钮（支持 quick / full 两种模式）
 * 3. 通过 widgetCode 关联 i18n key（setting.{widgetCode}）和 config-reset 逻辑
 *
 * 命名说明："FormWrap" 沿用了早期版本的命名习惯，实际职责更接近 "PaneWrap"。
 * 保留原名避免大规模重命名，理解时可按 "面板容器 + 重置入口" 对待。
 */

const props = withDefaults(
  defineProps<{
    widgetCode: string
    hideReset?: boolean
    id?: string
  }>(),
  {
    hideReset: false,
    id: '',
  },
)

const hasCode = computed(() => hasWidgetConfig(props.widgetCode))
const showPreserve = computed(() => hasPreserveFields(props.widgetCode))

const renderIcon = (iconName: string) => () =>
  h(Icon, { icon: iconName, size: 16 })

const renderResetBtn = () =>
  h(
    NTButton,
    { type: 'error', size: 'tiny', variant: 'secondary', round: true },
    () => [
      h(Icon, { icon: ICONS.restoreTwotone }),
      h(
        'span',
        {},
        `${window.$t('generalSetting.resetSettingValue')} "${window.$t('setting.' + props.widgetCode)}"`,
      ),
    ],
  )

const resetOptions = computed(() => [
  {
    key: 'quick',
    icon: renderIcon(ICONS.save),
    label: () =>
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '2px 0',
          },
        },
        [
          h(
            'div',
            { style: { fontSize: '14px', fontWeight: 500, lineHeight: '1.2' } },
            window.$t('generalSetting.quickReset'),
          ),
          h(
            'div',
            {
              style: {
                fontSize: '12px',
                color: 'var(--nt-text-tertiary)',
                lineHeight: '1.2',
              },
            },
            window.$t('generalSetting.quickResetDesc'),
          ),
        ],
      ),
  },
  {
    key: 'full',
    icon: renderIcon(ICONS.clearOutlined),
    label: () =>
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '2px 0',
          },
        },
        [
          h(
            'div',
            { style: { fontSize: '14px', fontWeight: 500, lineHeight: '1.2' } },
            window.$t('generalSetting.fullReset'),
          ),
          h(
            'div',
            {
              style: {
                fontSize: '12px',
                color: 'var(--nt-text-tertiary)',
                lineHeight: '1.2',
              },
            },
            window.$t('generalSetting.fullResetDesc'),
          ),
        ],
      ),
  },
])

const handleResetSelect = (key: string) => {
  if (key === 'quick') resetWidgetConfig(props.widgetCode, 'quick')
  else if (key === 'full') resetWidgetConfig(props.widgetCode, 'full')
  // 安全说明：成功提示仅在 hasCode === true 时才触发（模板中 v-if="hasCode" 拦截），
  // 因此 widgetCode 必定在 defaultConfig 中，resetWidgetConfig 不会提前 return。
  // 即使当前值已与默认值完全一致，Object.assign 仍会正常执行（无实际变更）。
  // i18n key 约定：reset 按钮文案拼接 setting.{widgetCode}
  // 新增 Widget 时须在 registry.ts 的 SETTING_GROUPS 中注册 labelKey 为 'setting.xxx'，
  // 且同时在 locales/zh-CN.json 和 en-US.json 的 setting 命名空间下添加对应翻译
  showToast.success(
    `${window.$t('generalSetting.resetSettingValue')} "${window.$t('setting.' + props.widgetCode)}" ${window.$t('common.success')}`,
  )
}
</script>

<template>
  <div
    :id="props.id || undefined"
    class="setting-form-wrap setting__pane-content"
  >
    <slot />

    <div
      v-if="hasCode && !props.hideReset"
      class="form-wrap__reset-wrap"
    >
      <NTDropdown
        v-if="showPreserve"
        :options="resetOptions"
        @select="handleResetSelect"
      >
        <component :is="renderResetBtn" />
      </NTDropdown>
      <NTPopconfirm
        v-else
        @positive-click="resetWidgetConfig(props.widgetCode, 'full')"
      >
        <template #trigger>
          <component :is="renderResetBtn" />
        </template>
        <span>{{ $t('generalSetting.confirmReset') }}</span>
      </NTPopconfirm>
    </div>
  </div>
</template>

<style scoped>
.setting-form-wrap {
  .form-wrap__reset-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-4);
    margin-bottom: var(--space-4);
  }
}
</style>
