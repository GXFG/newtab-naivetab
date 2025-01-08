<script setup lang="ts">
import { requestPermission } from '@/logic/storage'
import { KEYBOARD_TYPE_OPTION, SPLIT_SPACE_OPTION, KEYCAP_TYPE_OPTION } from '@/logic/keyboard'
import { state as bookmarkState, getBrowserBookmarkForKeyboard } from '@/logic/bookmark'
import { availableFontOptions, fontSelectRenderLabel, localState, localConfig, openConfigShortcutsPage } from '@/logic/store'
import BaseComponentSetting from '@/newtab/components/form/BaseComponentSetting.vue'
import CustomColorPicker from '@/newtab/components/form/CustomColorPicker.vue'
import Tips from '@/newtab/components/form/Tips.vue'
import BookmarkConfig from './BookmarkConfig.vue'
import PresetThemeDrawer from './PresetThemeDrawer.vue'

const state = reactive({
  isPresetThemeDrawerVisible: false,
  currImporKey: '',
})

const bookmarkSourceList = computed(() => [
  { label: window.$t('bookmark.systemBrowser'), value: 1 },
  { label: window.$t('bookmark.thisExtension'), value: 2 },
])

const handleBookmarkSourceChange = async (source: number) => {
  if (source === 2) {
    return
  }
  const granted = await requestPermission('bookmarks')
  if (!granted) {
    localConfig.bookmark.source = 2
    return
  }
  getBrowserBookmarkForKeyboard()
}

const defaultFolderOptions = computed(() => {
  return bookmarkState.systemBookmarks
    .filter((item) => Object.prototype.hasOwnProperty.call(item, 'children'))
    .map((item) => ({
      label: item.title,
      value: item.title,
    }))
})

const handleDefaultFolderTitleChange = (value: string) => {
  bookmarkState.selectedFolderTitleStack = value ? [value] : []
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
    <BaseComponentSetting
      cname="bookmark"
      :margin-range="[0, 20]"
      :border-radius-range="[0, 40]"
    >
      <template #header>
        <NFormItem :label="$t('bookmark.bookmarkSource')">
          <NRadioGroup
            v-model:value="localConfig.bookmark.source"
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
          v-if="localConfig.bookmark.source === 1"
          :label="$t('bookmark.defaultDisplayFolderTitle')"
        >
          <NSelect
            v-model:value="localConfig.bookmark.defaultExpandFolder"
            :options="defaultFolderOptions"
            :placeholder="$t('bookmark.rootDirectory')"
            clearable
            @update:value="handleDefaultFolderTitleChange"
          />
        </NFormItem>

        <NFormItem :label="$t('bookmark.listenBackgroundKeystrokes')">
          <div class="setting__item_wrap">
            <div class="item__box">
              <NSwitch
                v-model:value="localConfig.bookmark.isListenBackgroundKeystrokes"
                size="small"
              />
              <Tips :content="$t('bookmark.listenBackgroundKeystrokesTips')" />
            </div>
            <div
              v-if="localConfig.bookmark.isListenBackgroundKeystrokes"
              class="item__box"
            >
              <NButton
                type="primary"
                size="small"
                ghost
                @click="openConfigShortcutsPage()"
              >
                <ic:twotone-keyboard-command-key />&nbsp;{{ $t('bookmark.customKeys') }}
              </NButton>
            </div>
          </div>
        </NFormItem>

        <NFormItem :label="$t('bookmark.dblclickKeyToOpen')">
          <div class="setting__item_wrap">
            <div class="item__box">
              <NSwitch
                v-model:value="localConfig.bookmark.isDblclickOpen"
                size="small"
              />
              <Tips :content="$t('bookmark.dblclickKeyToOpenTips')" />
            </div>
            <div
              v-if="localConfig.bookmark.isDblclickOpen"
              class="item__box"
            >
              <span class="setting__item-element">{{ $t('bookmark.intervalTime') }}</span>
              <NInputNumber
                v-model:value="localConfig.bookmark.dblclickIntervalTime"
                class="setting__item-element setting__input-number--unit"
                size="small"
                :min="0"
                :step="1"
              >
                <template #suffix> ms </template>
              </NInputNumber>
              <Tips :content="$t('bookmark.intervalTimeTips')" />
            </div>
          </div>
        </NFormItem>

        <NFormItem :label="$t('general.newTabOpen')">
          <NSwitch
            v-model:value="localConfig.bookmark.isNewTabOpen"
            size="small"
          />
        </NFormItem>

        <NFormItem
          v-if="isOpenPopupVisible"
          :label="$t('bookmark.configBookmark')"
        >
          <NButton
            type="primary"
            size="small"
            ghost
            @click="onOpenPopup()"
          >
            <material-symbols:open-in-new />&nbsp;{{ `${$t('common.open')}${$t('common.config')}` }}
          </NButton>
        </NFormItem>

        <BookmarkConfig />
      </template>

      <template #footer>
        <p class="setting__label">
          {{ `${$t('bookmark.keyboard')}${$t('common.config')}` }}
        </p>
        <NFormItem :label="$t('bookmark.keyboardType')">
          <NRadioGroup
            v-model:value="localConfig.bookmark.keyboardType"
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
        <NFormItem :label="$t('bookmark.keycapType')">
          <NRadioGroup
            v-model:value="localConfig.bookmark.keycapType"
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
        <NFormItem :label="$t('bookmark.splitSpace')">
          <NRadioGroup
            v-model:value="localConfig.bookmark.splitSpace"
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
        <NFormItem :label="`${$t('bookmark.presetTheme')}`">
          <NButton
            type="primary"
            size="small"
            ghost
            @click="state.isPresetThemeDrawerVisible = true"
          >
            <mingcute:finger-press-line />&nbsp;{{ $t('common.select') }}
          </NButton>
        </NFormItem>

        <p class="setting__label">
          {{ `${$t('bookmark.shell')}${$t('common.config')}` }}
        </p>
        <NFormItem :label="$t('bookmark.shell')">
          <NSwitch
            v-model:value="localConfig.bookmark.isShellVisible"
            size="small"
          />
          <CustomColorPicker
            v-if="localConfig.bookmark.isShellVisible"
            v-model:value="localConfig.bookmark.shellColor[localState.currAppearanceCode]"
            class="setting__item-element"
          />
        </NFormItem>
        <template v-if="localConfig.bookmark.isShellVisible">
          <NFormItem :label="`${$t('common.vertical')}${$t('common.margin')}`">
            <NSlider
              v-model:value="localConfig.bookmark.shellVerticalPadding"
              :step="1"
              :min="0"
              :max="100"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmark.shellVerticalPadding"
              class="setting__item-element setting__input-number"
              size="small"
              :step="1"
              :min="0"
              :max="100"
            />
          </NFormItem>
          <NFormItem :label="`${$t('common.horizontal')}${$t('common.margin')}`">
            <NSlider
              v-model:value="localConfig.bookmark.shellHorizontalPadding"
              :step="1"
              :min="0"
              :max="100"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmark.shellHorizontalPadding"
              class="setting__item-element setting__input-number"
              size="small"
              :step="1"
              :min="0"
              :max="100"
            />
          </NFormItem>
          <NFormItem :label="$t('common.borderRadius')">
            <NSlider
              v-model:value="localConfig.bookmark.shellBorderRadius"
              :step="0.1"
              :min="0"
              :max="30"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmark.shellBorderRadius"
              class="setting__item-element setting__input-number"
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
              v-model:value="localConfig.bookmark.isShellShadowEnabled"
              size="small"
            />
            <CustomColorPicker
              v-model:value="localConfig.bookmark.shellShadowColor[localState.currAppearanceCode]"
              class="setting__item-element"
            />
          </NFormItem>
          <p class="setting__label">
            {{ `${$t('bookmark.plate')}${$t('common.config')}` }}
          </p>
          <NFormItem :label="$t('bookmark.plate')">
            <NSwitch
              v-model:value="localConfig.bookmark.isPlateVisible"
              size="small"
            />
            <CustomColorPicker
              v-if="localConfig.bookmark.isPlateVisible"
              v-model:value="localConfig.bookmark.plateColor[localState.currAppearanceCode]"
              class="setting__item-element"
            />
          </NFormItem>
          <template v-if="localConfig.bookmark.isPlateVisible">
            <NFormItem :label="`${$t('common.margin')}`">
              <NSlider
                v-model:value="localConfig.bookmark.platePadding"
                :step="0.1"
                :min="0"
                :max="10"
                :tooltip="false"
              />
              <NInputNumber
                v-model:value="localConfig.bookmark.platePadding"
                class="setting__item-element setting__input-number"
                size="small"
                :step="0.1"
                :min="0"
                :max="10"
              />
            </NFormItem>
            <NFormItem :label="$t('common.borderRadius')">
              <NSlider
                v-model:value="localConfig.bookmark.plateBorderRadius"
                :step="0.1"
                :min="0"
                :max="10"
                :tooltip="false"
              />
              <NInputNumber
                v-model:value="localConfig.bookmark.plateBorderRadius"
                class="setting__item-element setting__input-number"
                size="small"
                :step="0.1"
                :min="0"
                :max="10"
              />
            </NFormItem>
          </template>
        </template>

        <p class="setting__label">
          {{ `${$t('bookmark.keycap')}${$t('common.config')}` }}
        </p>
        <NFormItem :label="`${$t('common.margin')}`">
          <NSlider
            v-model:value="localConfig.bookmark.keycapPadding"
            :step="0.1"
            :min="0"
            :max="10"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.bookmark.keycapPadding"
            class="setting__item-element setting__input-number"
            size="small"
            :step="0.1"
            :min="0"
            :max="10"
          />
        </NFormItem>

        <NFormItem :label="`${$t('common.size')}`">
          <NSlider
            v-model:value="localConfig.bookmark.keycapSize"
            :step="1"
            :min="40"
            :max="150"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.bookmark.keycapSize"
            class="setting__item-element setting__input-number"
            size="small"
            :step="1"
            :min="40"
            :max="150"
          />
        </NFormItem>

        <NFormItem :label="$t('common.borderRadius')">
          <NSlider
            v-model:value="localConfig.bookmark.keycapBorderRadius"
            :step="0.1"
            :min="0"
            :max="100"
            :tooltip="false"
          />
          <NInputNumber
            v-model:value="localConfig.bookmark.keycapBorderRadius"
            class="setting__item-element setting__input-number"
            size="small"
            :step="0.1"
            :min="0"
            :max="100"
          />
        </NFormItem>

        <NFormItem
          :label="$t('common.border')"
          class="n-form-item--color"
        >
          <NSwitch
            v-model:value="localConfig.bookmark.isKeycapBorderEnabled"
            size="small"
          />
          <CustomColorPicker
            v-model:value="localConfig.bookmark.keycapBorderColor[localState.currAppearanceCode]"
            class="setting__item-element"
          />
          <NInputNumber
            v-model:value="localConfig.bookmark.keycapBorderWidth"
            class="setting__item-element setting__input-number"
            size="small"
            :step="1"
            :min="1"
            :max="10"
          />
        </NFormItem>

        <NFormItem :label="`${$t('bookmark.keycap')}${$t('common.font')}`">
          <NSwitch
            v-model:value="localConfig.bookmark.isCapKeyVisible"
            size="small"
          />
          <template v-if="localConfig.bookmark.isCapKeyVisible">
            <NSelect
              v-model:value="localConfig.bookmark.keycapKeyFontFamily"
              class="setting__item-ml"
              size="small"
              :options="availableFontOptions"
              :render-label="fontSelectRenderLabel"
            />
            <NInputNumber
              v-model:value="localConfig.bookmark.keycapKeyFontSize"
              class="setting__item-element setting__input-number"
              size="small"
              :step="1"
              :min="5"
              :max="50"
            />
          </template>
        </NFormItem>

        <NFormItem :label="`${$t('common.icon')}${$t('common.size')}`">
          <NSwitch
            v-model:value="localConfig.bookmark.isFaviconVisible"
            size="small"
          />
          <template v-if="localConfig.bookmark.isFaviconVisible">
            <NSlider
              v-model:value="localConfig.bookmark.faviconSize"
              class="setting__item-ml"
              :step="0.01"
              :min="0"
              :max="1"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmark.faviconSize"
              class="setting__item-element setting__input-number"
              size="small"
              :step="0.01"
              :min="0"
              :max="1"
            />
          </template>
        </NFormItem>

        <NFormItem :label="`${$t('bookmark.nameLabel')}${$t('common.font')}`">
          <NSwitch
            v-model:value="localConfig.bookmark.isNameVisible"
            size="small"
          />
          <template v-if="localConfig.bookmark.isNameVisible">
            <NSelect
              v-model:value="localConfig.bookmark.keycapBookmarkFontFamily"
              class="setting__item-ml"
              size="small"
              :options="availableFontOptions"
              :render-label="fontSelectRenderLabel"
            />
            <NInputNumber
              v-model:value="localConfig.bookmark.keycapBookmarkFontSize"
              class="setting__item-element setting__input-number"
              size="small"
              :step="1"
              :min="5"
              :max="50"
            />
          </template>
        </NFormItem>

        <NFormItem :label="$t('bookmark.tactileBumps')">
          <NSwitch
            v-model:value="localConfig.bookmark.isTactileBumpsVisible"
            size="small"
          />
        </NFormItem>

        <NFormItem :label="`${$t('bookmark.keycap')}Qwerty`">
          <NFormItem
            :label="`${$t('common.fontColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.bookmark.mainFontColor[localState.currAppearanceCode]" />
          </NFormItem>
          <NFormItem
            :label="`${$t('common.backgroundColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.bookmark.mainBackgroundColor[localState.currAppearanceCode]" />
          </NFormItem>
        </NFormItem>

        <NFormItem :label="`${$t('bookmark.keycap')}Control`">
          <NFormItem
            :label="`${$t('common.fontColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.bookmark.emphasisOneFontColor[localState.currAppearanceCode]" />
          </NFormItem>
          <NFormItem
            :label="`${$t('common.backgroundColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.bookmark.emphasisOneBackgroundColor[localState.currAppearanceCode]" />
          </NFormItem>
        </NFormItem>

        <NFormItem :label="`${$t('bookmark.keycap')}Enter`">
          <NFormItem
            :label="`${$t('common.fontColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.bookmark.emphasisTwoFontColor[localState.currAppearanceCode]" />
          </NFormItem>

          <NFormItem
            :label="`${$t('common.backgroundColor')}`"
            class="n-form-item--color"
          >
            <CustomColorPicker v-model:value="localConfig.bookmark.emphasisTwoBackgroundColor[localState.currAppearanceCode]" />
          </NFormItem>
        </NFormItem>
      </template>
    </BaseComponentSetting>
  </NCollapse>
</template>

<style>
.flip-list-move {
  transition: transform 0.8s ease;
}
</style>
