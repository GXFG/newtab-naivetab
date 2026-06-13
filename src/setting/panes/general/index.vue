<script setup lang="ts">
import NTSelect from '@/components/ui/NTSelect.vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import i18n from '@/common/i18n'
import {
  exportSetting,
  importSetting,
  refreshSetting,
  resetSetting,
} from '@/logic/config/sync/manage'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'
import { customPrimaryColor, colorMixWithAlpha } from '@/logic/store/style'
import { ICONS } from '@/logic/constants/icons'
import {
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
  SettingFormInlineRow,
} from '@/setting/components'
import {
  NumberField,
  ColorField,
  FontField,
  SwitchField,
} from '@/setting/fields'
import BackgroundDrawer from './BackgroundDrawer.vue'
import StorageVisualization from './StorageVisualization.vue'

const { locale } = useI18n()

const state = reactive({
  i18nList: i18n.global.availableLocales.map((locale) => ({
    label: locale,
    value: locale,
  })),
  isBackgroundDrawerVisible: false,
})

const themeList = computed(() => [
  { label: window.$t('generalSetting.followSystem'), value: 'auto' },
  { label: window.$t('common.light'), value: 'light' },
  { label: window.$t('common.dark'), value: 'dark' },
])

const drawerPlacementList = [
  {
    value: 'left',
    icon: ICONS.dockLeft,
    style: { transform: 'rotate(180deg)' },
  },
  {
    value: 'top',
    icon: ICONS.dockBottom,
    style: { transform: 'rotate(180deg)' },
  },
  { value: 'bottom', icon: ICONS.dockBottom, style: {} },
  { value: 'right', icon: ICONS.dockLeft, style: {} },
] as {
  value: TDrawerPlacement | 'right'
  icon: string
  style: Record<string, string>
}[]

const scaleModeList = computed(() => [
  { label: window.$t('generalSetting.scaleModeAuto'), value: 'auto' },
  { label: window.$t('generalSetting.scaleModeFixed'), value: 'fixed' },
])

const focusElementList = computed(() => [
  { label: window.$t('generalSetting.focusBrowserDefault'), value: 'default' },
  { label: window.$t('generalSetting.focusRoot'), value: 'root' },
  { label: window.$t('setting.search'), value: 'search' },
  { label: window.$t('setting.memo'), value: 'memo' },
  { label: window.$t('setting.keyboardBookmark'), value: 'keyboardBookmark' },
])

const loadPageAnimationTypeList = computed(() => [
  { label: window.$t('generalSetting.fadeIn'), value: 'fade-in' },
  { label: window.$t('generalSetting.zoomIn'), value: 'zoom-in' },
])

const onChangeLocale = (newLocale: string) => {
  locale.value = newLocale
  localConfig.general.lang = newLocale
}

const openBackgroundDrawer = () => {
  state.isBackgroundDrawerVisible = true
}

const onBackgroundDrawerClose = () => {
  state.isBackgroundDrawerVisible = false
  globalState.isBackgroundDrawerAutoOpen = false
}

onMounted(() => {
  if (globalState.isBackgroundDrawerAutoOpen) {
    globalState.isBackgroundDrawerAutoOpen = false
    openBackgroundDrawer()
  }
})

watch(
  () => globalState.isBackgroundDrawerAutoOpen,
  (value: boolean) => {
    if (value) {
      globalState.isBackgroundDrawerAutoOpen = false
      openBackgroundDrawer()
    }
  },
)

const importSettingInputEl: Ref<HTMLInputElement | null> = ref(null)

const onImportSetting = () => {
  if (!importSettingInputEl.value) {
    return
  }
  importSettingInputEl.value.value = ''
  importSettingInputEl.value.click()
}

const onImportFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target || !target.files || target.files.length === 0) {
    console.warn('No file selected')
    return
  }
  const file = target.files[0]
  if (!file.name.includes('.json')) {
    target.value = ''
    return
  }
  const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = () => {
    importSetting(reader.result as string)
  }
}

const ntGeneralActiveColor = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.12),
)
const ntGeneralActiveBorderColor = computed(() =>
  colorMixWithAlpha(customPrimaryColor.value, 0.3),
)

const cssVars = computed(() => ({
  '--nt-general-active-color': ntGeneralActiveColor.value,
  '--nt-general-active-border-color': ntGeneralActiveBorderColor.value,
}))
</script>

<template>
  <BackgroundDrawer
    :show="state.isBackgroundDrawerVisible"
    @update:show="onBackgroundDrawerClose"
  />

  <SettingFormWrap
    widget-code="general"
    hide-reset
    :style="cssVars"
  >
    <!-- 页面设置 -->
    <SettingFormSection
      :title="$t('generalSetting.pageSettings')"
      :icon="ICONS.fullscreen"
    >
      <SettingFormItem :label="$t('generalSetting.pageTitle')">
        <NTInput
          v-model:value="localConfig.general.pageTitle"
          type="text"
          size="small"
        />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.general.isLoadPageAnimationEnabled"
        :label="$t('generalSetting.loadPageAnimation')"
      >
        <template #extra>
          <NTRadioGroup
            v-model:value="localConfig.general.loadPageAnimationType"
            direction="horizontal"
          >
            <NTRadio
              v-for="item in loadPageAnimationTypeList"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NTRadio>
          </NTRadioGroup>
        </template>
      </SwitchField>

      <SettingFormItem
        :label="$t('generalSetting.scaleMode')"
        :tip-content="$t('generalSetting.scaleModeTips')"
      >
        <NTRadioGroup
          v-model:value="localConfig.general.scaleMode"
          direction="horizontal"
        >
          <NTRadio
            v-for="item in scaleModeList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NTRadio>
        </NTRadioGroup>
      </SettingFormItem>
    </SettingFormSection>

    <!-- 焦点与导航 -->
    <SettingFormSection
      :title="$t('generalSetting.focusNavigation')"
      :icon="ICONS.focus"
    >
      <SettingFormItem
        :label="$t('generalSetting.defaultFocus')"
        :tip-content="$t('generalSetting.defaultFocusTips')"
      >
        <NTSelect
          v-model:value="localConfig.general.openPageFocusElement"
          :options="focusElementList"
          size="small"
        />
      </SettingFormItem>

      <SettingFormItem
        :label="$t('common.drawerSite')"
        class="drawer__site_wrap--compact"
      >
        <div class="drawer__site--compact">
          <div
            v-for="(item, index) in drawerPlacementList"
            :key="index"
            class="site__item"
            :class="{
              'site__item--active':
                localConfig.general.drawerPlacement === item.value,
            }"
            :style="item.style"
            @click="localConfig.general.drawerPlacement = item.value"
          >
            <Icon :icon="item.icon" />
          </div>
        </div>
      </SettingFormItem>
    </SettingFormSection>

    <!-- 字体与色彩 -->
    <SettingFormSection
      :title="$t('generalSetting.fontColor')"
      :icon="ICONS.palette"
    >
      <FontField
        v-model:font-family="localConfig.general.fontFamily"
        v-model:font-color="localConfig.general.fontColor"
        v-model:font-size="localConfig.general.fontSize"
        :label="$t('common.font')"
      />

      <SettingFormItem :label="$t('common.appearance')">
        <NTRadioGroup
          v-model:value="localConfig.general.appearance"
          direction="horizontal"
        >
          <NTRadio
            v-for="item in themeList"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </NTRadio>
        </NTRadioGroup>
      </SettingFormItem>

      <SettingFormInlineRow>
        <ColorField
          v-model="localConfig.general.primaryColor"
          :label="$t('common.primaryColor')"
          :disabled="localConfig.general.isAutoPrimaryColor"
        />
        <SwitchField
          v-model="localConfig.general.isAutoPrimaryColor"
          :label="$t('generalSetting.autoPrimaryColor')"
        />
      </SettingFormInlineRow>

      <SettingFormInlineRow :tip-content="$t('generalSetting.autoColorTips')">
        <ColorField
          v-model="localConfig.general.backgroundColor"
          :label="$t('common.backgroundColor')"
          :disabled="localConfig.general.isAutoBackgroundColor"
        />
        <SwitchField
          v-model="localConfig.general.isAutoBackgroundColor"
          :label="$t('generalSetting.autoBackgroundColor')"
        />
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 背景图 -->
    <SettingFormSection
      :title="$t('generalSetting.bgImage')"
      :icon="ICONS.imageSquare"
    >
      <SwitchField
        v-model="localConfig.general.isBackgroundImageEnabled"
        :label="$t('common.backgroundImage')"
      >
        <template #extra>
          <NTButton
            type="primary"
            size="tiny"
            variant="secondary"
            round
            @click="openBackgroundDrawer()"
          >
            <Icon :icon="ICONS.selectFinger" />&nbsp;{{ $t('common.select') }}
          </NTButton>
        </template>
      </SwitchField>

      <SettingFormInlineRow>
        <NumberField
          v-model="localConfig.general.bgBlur"
          :label="$t('common.blur')"
          :step="0.01"
          :min="0"
          :max="50"
        />

        <NumberField
          v-model="localConfig.general.bgOpacity"
          :label="$t('common.opacity')"
          :step="0.01"
          :min="0"
          :max="1"
        />
      </SettingFormInlineRow>

      <SwitchField
        v-model="localConfig.general.isParallaxEnabled"
        :label="$t('generalSetting.parallax')"
        :tip-content="$t('generalSetting.parallaxTips')"
      />

      <Transition name="setting-slide">
        <NumberField
          v-if="localConfig.general.isParallaxEnabled"
          v-model="localConfig.general.parallaxIntensity"
          :label="$t('generalSetting.parallaxIntensity')"
          :step="1"
          :min="0"
          :max="20"
          show-slider
        />
      </Transition>
    </SettingFormSection>

    <!-- 语言与时间 -->
    <SettingFormSection
      :title="$t('generalSetting.languageTime')"
      :icon="ICONS.calendar"
    >
      <SettingFormInlineRow>
        <SettingFormItem :label="$t('generalSetting.language')">
          <NTSelect
            v-model:value="locale"
            :options="state.i18nList"
            size="small"
            @update:value="onChangeLocale"
          />
        </SettingFormItem>
        <SettingFormItem :label="$t('generalSetting.timeLanguage')">
          <NTSelect
            v-model:value="localConfig.general.timeLang"
            :options="state.i18nList"
            size="small"
          />
        </SettingFormItem>
      </SettingFormInlineRow>
    </SettingFormSection>

    <!-- 数据管理 -->
    <SettingFormSection
      :title="$t('generalSetting.dataManagement')"
      :icon="ICONS.restoreTwotone"
    >
      <StorageVisualization />

      <SettingFormItem
        :label="$t('generalSetting.importExportSettingsLabel')"
        :tip-content="$t('generalSetting.importExportSettingsTips')"
      >
        <NTButton
          type="primary"
          size="tiny"
          variant="secondary"
          round
          :loading="globalState.isImportSettingLoading"
          @click="onImportSetting"
        >
          <Icon :icon="ICONS.importFile" />
          {{ $t('generalSetting.importSettingsValue') }}
        </NTButton>
        <input
          ref="importSettingInputEl"
          style="display: none"
          type="file"
          accept=".json"
          @change="onImportFileChange"
        />
        <NTButton
          type="primary"
          size="tiny"
          variant="secondary"
          round
          @click="exportSetting"
        >
          <Icon :icon="ICONS.exportFile" />
          {{ $t('generalSetting.exportSettingValue') }}
        </NTButton>
      </SettingFormItem>

      <SettingFormItem
        :label="$t('generalSetting.clearStorageLabel')"
        :tip-content="$t('generalSetting.clearStorageTips')"
      >
        <NTButton
          type="warning"
          size="tiny"
          variant="secondary"
          round
          :loading="globalState.isClearStorageLoading"
          @click="refreshSetting()"
        >
          <Icon :icon="ICONS.clearOutlined" />
          {{ $t('generalSetting.clearStorageValue') }}
        </NTButton>
      </SettingFormItem>

      <SettingFormItem
        :label="$t('generalSetting.resetSettingLabel')"
        :tip-content="$t('generalSetting.resetSettingTips')"
      >
        <NTPopconfirm @positive-click="resetSetting">
          <template #trigger>
            <NTButton
              type="error"
              size="tiny"
              variant="secondary"
              round
            >
              <Icon :icon="ICONS.restoreTwotone" />
              {{ $t('generalSetting.resetAllSettingValue') }}
            </NTButton>
          </template>
          {{ $t('generalSetting.confirmResetAll') }}
        </NTPopconfirm>
      </SettingFormItem>
    </SettingFormSection>
  </SettingFormWrap>
</template>

<style scoped>
.drawer__site_wrap--compact :deep(.form-item__control) {
  align-items: flex-start;
}

.drawer__site--compact {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius-lg);
  background: var(--nt-gray-minimal);
  border: 1px solid var(--nt-gray-light);

  .site__item {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 32px;
    height: 28px;
    font-size: 16px;
    cursor: pointer;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    transition:
      background-color var(--transition-base),
      color var(--transition-base),
      border-color var(--transition-base),
      transform var(--transition-fast);
    color: var(--nt-text-tertiary);

    &:hover {
      background-color: var(--nt-gray-light);
      color: var(--nt-text-primary);
      transform: scale(1.06);
    }
  }

  .site__item--active {
    color: var(--nt-primary-color) !important;
    background-color: var(--nt-general-active-color);
    border-color: var(--nt-general-active-border-color);
    transform: scale(1.06);
  }
}
</style>
