<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { isFirefox } from '@/env'
import { URL_FIREFOX_EXTENSIONS_SHORTCUTS } from '@/logic/constants/index'
import { requestPermission } from '@/logic/storage'
import { KEYBOARD_TYPE_OPTION, SPLIT_SPACE_OPTION, KEYCAP_TYPE_OPTION } from '@/logic/constants/keyboard'
import { state as keyboardState, getSystemBookmarkForKeyboard } from '~/newtab/widgets/keyboard/logic'
import { availableFontOptions, fontSelectRenderLabel, localState, localConfig, openConfigShortcutsPage } from '@/logic/store'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import CustomColorPicker from '~/components/CustomColorPicker.vue'
import Tips from '@/components/Tips.vue'
import BookmarkConfig from './BookmarkConfig.vue'
import PresetThemeDrawer from './PresetThemeDrawer.vue'

const state = reactive({
  isPresetThemeDrawerVisible: false,
  currImporKey: '',
})

const bookmarkSourceList = computed(() => [
  { label: window.$t('keyboard.systemBrowser'), value: 1 },
  { label: window.$t('keyboard.thisExtension'), value: 2 },
])

const handleBookmarkSourceChange = async (source: number) => {
  if (source === 2) {
    return
  }
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    localConfig.keyboard.source = 2
    return
  }
  getSystemBookmarkForKeyboard()
}

const defaultFolderOptions = computed(() => {
  return keyboardState.systemBookmarks
    .filter((item) => Object.prototype.hasOwnProperty.call(item, 'children'))
    .map((item) => ({
      label: item.title,
      value: item.title,
    }))
})

const handleDefaultFolderTitleChange = (value: string) => {
  keyboardState.selectedFolderTitleStack = value ? [value] : []
}

const isOpenPopupVisible = ref(!!chrome.action.openPopup)

const onOpenPopup = () => {
  if (chrome.action.openPopup) {
    chrome.action.openPopup()
  }
}
</script>

<template>
  <PresetThemeDrawer v-model:show="state.isPresetThemeDrawerVisible" />

  <NCollapse display-directive="show">
    <SettingPaneTitle :title="$t('setting.keyboard')" />

    <SettingPaneWrap
      widget-code="keyboard"
      :margin-range="[0, 20]"
      :border-radius-range="[0, 40]"
    >
      <template #header>
        <NFormItem :label="$t('keyboard.bookmarkSource')">
          <NRadioGroup
            v-model:value="localConfig.keyboard.source"
            size="small"
            @update:value="handleBookmarkSourceChange"
          >
            <NRadioButton
              v-for="item in bookmarkSourceList"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NRadioButton>
          </NRadioGroup>
        </NFormItem>
        <NFormItem
          v-if="localConfig.keyboard.source === 1"
          :label="$t('keyboard.defaultDisplayFolderTitle')"
        >
          <NSelect
            v-model:value="localConfig.keyboard.defaultExpandFolder"
            :options="defaultFolderOptions"
            :placeholder="$t('keyboard.rootDirectory')"
            clearable
            @update:value="handleDefaultFolderTitleChange"
          />
        </NFormItem>

        <NFormItem :label="$t('keyboard.listenBackgroundKeystrokes')">
          <div class="setting__item_wrap">
            <div class="item__box">
              <NSwitch
                v-model:value="localConfig.keyboard.isListenBackgroundKeystrokes"
                size="small"
              />
              <Tips :content="`${$t('keyboard.listenBackgroundKeystrokesTips')} ${isFirefox ? URL_FIREFOX_EXTENSIONS_SHORTCUTS : ''}`" />
            </div>
            <div
              v-if="localConfig.keyboard.isListenBackgroundKeystrokes && !isFirefox"
              class="item__box"
            >
              <NButton
                type="primary"
                size="small"
                ghost
                @click="openConfigShortcutsPage()"
              >
                <Icon :icon="ICONS.keyboardCmdKey" />&nbsp;{{ $t('keyboard.customKeys') }}
              </NButton>
            </div>
          </div>
        </NFormItem>

        <NFormItem :label="$t('keyboard.dblclickKeyToOpen')">
          <div class="setting__item_wrap">
            <div class="item__box">
              <NSwitch
                v-model:value="localConfig.keyboard.isDblclickOpen"
                size="small"
              />
              <Tips :content="$t('keyboard.dblclickKeyToOpenTips')" />
            </div>
            <div
              v-if="localConfig.keyboard.isDblclickOpen"
              class="item__box"
            >
              <span class="setting__item-ele">{{ $t('keyboard.intervalTime') }}</span>
              <NInputNumber
                v-model:value="localConfig.keyboard.dblclickIntervalTime"
                class="setting__item-ele setting__input-number--unit"
                size="small"
                :min="0"
                :step="1"
              >
                <template #suffix> ms </template>
              </NInputNumber>
              <Tips :content="$t('keyboard.intervalTimeTips')" />
            </div>
          </div>
        </NFormItem>

        <NFormItem :label="$t('general.newTabOpen')">
          <NSwitch
            v-model:value="localConfig.keyboard.isNewTabOpen"
            size="small"
          />
        </NFormItem>

        <NFormItem
          v-if="isOpenPopupVisible"
          :label="$t('keyboard.configBookmark')"
        >
          <NButton
            type="primary"
            size="small"
            ghost
            @click="onOpenPopup()"
          >
            <Icon :icon="ICONS.openInNew" />&nbsp;{{ `${$t('common.open')}${$t('common.config')}` }}
          </NButton>
        </NFormItem>

        <BookmarkConfig />
      </template>

      <template #footer>
        <p class="setting__label">
          <Icon
            :icon="ICONS.keyboardLabel"
            class="label__icon"
          />
          {{ `${$t('keyboard.keyboard')}${$t('common.config')}` }}
        </p>
        <NFormItem :label="$t('keyboard.keyboardType')">
          <NRadioGroup
            v-model:value="localConfig.keyboard.keyboardType"
            size="small"
            style="margin-top: 6px"
          >
            <NRadio
              v-for="item in KEYBOARD_TYPE_OPTION"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NRadio>
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('keyboard.keycapType')">
          <NRadioGroup
            v-model:value="localConfig.keyboard.keycapType"
            size="small"
          >
            <NRadioButton
              v-for="item in KEYCAP_TYPE_OPTION"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NRadioButton>
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="$t('keyboard.splitSpace')">
          <NRadioGroup
            v-model:value="localConfig.keyboard.splitSpace"
            size="small"
          >
            <NRadioButton
              v-for="item in SPLIT_SPACE_OPTION"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </NRadioButton>
          </NRadioGroup>
        </NFormItem>
        <NFormItem :label="`${$t('keyboard.presetTheme')}`">
          <NButton
            type="primary"
            size="small"
            ghost
            @click="state.isPresetThemeDrawerVisible = true"
          >
            <Icon :icon="ICONS.selectFinger" />&nbsp;{{ $t('common.select') }}
          </NButton>
        </NFormItem>

        <p class="setting__label">
          <Icon
            :icon="ICONS.keyboardShellLabel"
            class="label__icon"
          />
          {{ `${$t('keyboard.shell')}${$t('common.config')}` }}
        </p>
        <NFormItem :label="$t('keyboard.shell')">
          <NSwitch
            v-model:value="localConfig.keyboard.isShellVisible"
            size="small"
          />
          <CustomColorPicker
            v-if="localConfig.keyboard.isShellVisible"
            v-model:value="localConfig.keyboard.shellColor[localState.currAppearanceCode]"
            class="setting__item-ele"
          />
        </NFormItem>
        <template v-if="localConfig.keyboard.isShellVisible">
          <NFormItem :label="`${$t('common.vertical')}${$t('common.margin')}`">
            <NSlider
              v-model:value="localConfig.keyboard.shellVerticalPadding"
              :step="1"
              :min="0"
              :max="100"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.shellVerticalPadding"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="0"
              :max="100"
            />
          </NFormItem>
          <NFormItem :label="`${$t('common.horizontal')}${$t('common.margin')}`">
            <NSlider
              v-model:value="localConfig.keyboard.shellHorizontalPadding"
              :step="1"
              :min="0"
              :max="100"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.shellHorizontalPadding"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="0"
              :max="100"
            />
          </NFormItem>
          <NFormItem :label="$t('common.borderRadius')">
            <NSlider
              v-model:value="localConfig.keyboard.shellBorderRadius"
              :step="0.1"
              :min="0"
              :max="30"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.shellBorderRadius"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="0.1"
              :min="0"
              :max="30"
            />
          </NFormItem>
          <NFormItem :label="$t('common.blur')">
            <NSlider
              v-model:value="localConfig.keyboard.shellBackgroundBlur"
              :step="0.1"
              :min="0"
              :max="30"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.shellBackgroundBlur"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="0.1"
              :min="0"
              :max="30"
            />
          </NFormItem>
          <NFormItem
            :label="$t('common.shadow')"
            class="n-form-item--color"
          >
            <NSwitch
              v-model:value="localConfig.keyboard.isShellShadowEnabled"
              size="small"
            />
            <CustomColorPicker
              v-model:value="localConfig.keyboard.shellShadowColor[localState.currAppearanceCode]"
              class="setting__item-ele"
            />
          </NFormItem>
          <p class="setting__label">
            <Icon
              :icon="ICONS.keyboardPlateLabel"
              class="label__icon"
            />
            {{ `${$t('keyboard.plate')}${$t('common.config')}` }}
          </p>
          <NFormItem :label="$t('keyboard.plate')">
            <NSwitch
              v-model:value="localConfig.keyboard.isPlateVisible"
              size="small"
            />
            <CustomColorPicker
              v-if="localConfig.keyboard.isPlateVisible"
              v-model:value="localConfig.keyboard.plateColor[localState.currAppearanceCode]"
              class="setting__item-ele"
            />
          </NFormItem>
          <template v-if="localConfig.keyboard.isPlateVisible">
            <NFormItem :label="`${$t('common.margin')}`">
              <NSlider
                v-model:value="localConfig.keyboard.platePadding"
                :step="0.1"
                :min="0"
                :max="10"
                :tooltip="false"
              />
              <NInputNumber
                v-model:value="localConfig.keyboard.platePadding"
                class="setting__item-ele setting__input-number"
                size="small"
                :step="0.1"
                :min="0"
                :max="10"
              />
            </NFormItem>
            <NFormItem :label="$t('common.borderRadius')">
              <NSlider
                v-model:value="localConfig.keyboard.plateBorderRadius"
                :step="0.1"
                :min="0"
                :max="10"
                :tooltip="false"
              />
              <NInputNumber
                v-model:value="localConfig.keyboard.plateBorderRadius"
                class="setting__item-ele setting__input-number"
                size="small"
                :step="0.1"
                :min="0"
                :max="10"
              />
            </NFormItem>
            <NFormItem :label="$t('common.blur')">
              <NSlider
                v-model:value="localConfig.keyboard.plateBackgroundBlur"
                :step="0.1"
                :min="0"
                :max="30"
                :tooltip="false"
              />
              <NInputNumber
                v-model:value="localConfig.keyboard.plateBackgroundBlur"
                class="setting__item-ele setting__input-number"
                size="small"
                :step="0.1"
                :min="0"
                :max="30"
              />
            </NFormItem>
          </template>
        </template>

        <p class="setting__label">
          <Icon
            :icon="ICONS.keyboardKeycapLabel"
            class="label__icon"
          />
          {{ `${$t('keyboard.keycap')}${$t('common.config')}` }}
        </p>
        <NFormItem :label="`${$t('common.margin')}`">
          <NSlider
            v-model:value="localConfig.keyboard.keycapPadding"
            :step="0.1"
            :min="0"
            :max="10"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.keyboard.keycapPadding"
            class="setting__item-ele setting__input-number"
            size="small"
            :step="0.1"
            :min="0"
            :max="10"
          />
        </NFormItem>

        <NFormItem :label="`${$t('common.size')}`">
          <NSlider
            v-model:value="localConfig.keyboard.keycapSize"
            :step="1"
            :min="40"
            :max="150"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.keyboard.keycapSize"
            class="setting__item-ele setting__input-number"
            size="small"
            :step="1"
            :min="40"
            :max="150"
          />
        </NFormItem>

        <NFormItem :label="$t('common.borderRadius')">
          <NSlider
            v-model:value="localConfig.keyboard.keycapBorderRadius"
            :step="0.1"
            :min="0"
            :max="100"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.keyboard.keycapBorderRadius"
            class="setting__item-ele setting__input-number"
            size="small"
            :step="0.1"
            :min="0"
            :max="100"
          />
        </NFormItem>

        <NFormItem :label="$t('common.blur')">
          <NSlider
            v-model:value="localConfig.keyboard.keycapBackgroundBlur"
            :step="0.1"
            :min="0"
            :max="30"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.keyboard.keycapBackgroundBlur"
            class="setting__item-ele setting__input-number"
            size="small"
            :step="0.1"
            :min="0"
            :max="30"
          />
        </NFormItem>

        <NFormItem
          :label="$t('common.border')"
          class="n-form-item--color"
        >
          <NSwitch
            v-model:value="localConfig.keyboard.isKeycapBorderEnabled"
            size="small"
          />
          <CustomColorPicker
            v-model:value="localConfig.keyboard.keycapBorderColor[localState.currAppearanceCode]"
            class="setting__item-ele"
          />
          <NInputNumber
            v-model:value="localConfig.keyboard.keycapBorderWidth"
            class="setting__item-ele setting__input-number"
            size="small"
            :step="1"
            :min="1"
            :max="10"
          />
        </NFormItem>

        <NFormItem :label="`${$t('keyboard.keycap')}${$t('common.font')}`">
          <NSwitch
            v-model:value="localConfig.keyboard.isCapKeyVisible"
            size="small"
          />
          <template v-if="localConfig.keyboard.isCapKeyVisible">
            <NSelect
              v-model:value="localConfig.keyboard.keycapKeyFontFamily"
              class="setting__item-ml"
              size="small"
              :options="availableFontOptions"
              :render-label="fontSelectRenderLabel"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.keycapKeyFontSize"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="5"
              :max="50"
            />
          </template>
        </NFormItem>

        <NFormItem :label="`${$t('common.icon')}${$t('common.size')}`">
          <NSwitch
            v-model:value="localConfig.keyboard.isFaviconVisible"
            size="small"
          />
          <template v-if="localConfig.keyboard.isFaviconVisible">
            <NSlider
              v-model:value="localConfig.keyboard.faviconSize"
              class="setting__item-ml"
              :step="0.01"
              :min="0"
              :max="1"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.faviconSize"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="0.01"
              :min="0"
              :max="1"
            />
          </template>
        </NFormItem>

        <NFormItem :label="`${$t('keyboard.nameLabel')}${$t('common.font')}`">
          <NSwitch
            v-model:value="localConfig.keyboard.isNameVisible"
            size="small"
          />
          <template v-if="localConfig.keyboard.isNameVisible">
            <NSelect
              v-model:value="localConfig.keyboard.keycapBookmarkFontFamily"
              class="setting__item-ml"
              size="small"
              :options="availableFontOptions"
              :render-label="fontSelectRenderLabel"
            />
            <NInputNumber
              v-model:value="localConfig.keyboard.keycapBookmarkFontSize"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="5"
              :max="50"
            />
          </template>
        </NFormItem>

        <NFormItem :label="$t('keyboard.tactileBumps')">
          <NSwitch
            v-model:value="localConfig.keyboard.isTactileBumpsVisible"
            size="small"
          />
        </NFormItem>

        <NFormItem :label="`${$t('keyboard.keycap')}Qwerty`">
          <NFormItem
            :label="`${$t('common.fontColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.keyboard.mainFontColor[localState.currAppearanceCode]" />
          </NFormItem>
          <NFormItem
            :label="`${$t('common.backgroundColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.keyboard.mainBackgroundColor[localState.currAppearanceCode]" />
          </NFormItem>
        </NFormItem>

        <NFormItem :label="`${$t('keyboard.keycap')}Control`">
          <NFormItem
            :label="`${$t('common.fontColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.keyboard.emphasisOneFontColor[localState.currAppearanceCode]" />
          </NFormItem>
          <NFormItem
            :label="`${$t('common.backgroundColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.keyboard.emphasisOneBackgroundColor[localState.currAppearanceCode]" />
          </NFormItem>
        </NFormItem>

        <NFormItem :label="`${$t('keyboard.keycap')}Enter`">
          <NFormItem
            :label="`${$t('common.fontColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.keyboard.emphasisTwoFontColor[localState.currAppearanceCode]" />
          </NFormItem>

          <NFormItem
            :label="`${$t('common.backgroundColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.keyboard.emphasisTwoBackgroundColor[localState.currAppearanceCode]" />
          </NFormItem>
        </NFormItem>
      </template>
    </SettingPaneWrap>
  </NCollapse>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}
</style>
