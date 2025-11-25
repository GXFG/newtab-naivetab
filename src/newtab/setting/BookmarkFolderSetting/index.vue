<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { localConfig } from '@/logic/store'
import { getBrowserBookmark } from '@/logic/bookmark'
import { requestPermission } from '@/logic/storage'
import SettingPaneTitle from '~/newtab/setting/SettingPaneTitle.vue'
import SettingPaneWrap from '~/newtab/setting/SettingPaneWrap.vue'
import BookmarkPicker from '@/components/BookmarkPicker.vue'
import { refreshSelectedFolderTitles } from '@/newtab/widgets/bookmarkFolder/logic'

const state = reactive({
  showPicker: false,
  rootBookmarks: [] as BookmarkNode[],
})

const folderCrumb = computed(() => {
  const stack = localConfig.bookmarkFolder.selectedFolderTitles || []
  return stack.length === 0 ? (window.$t('bookmarkFolder.rootDirectory') as string) : stack.join(' / ')
})

const findPathById = (root: BookmarkNode[], id: string): string[] => {
  for (const node of root) {
    if (node.id === id) return [node.title]
    if (node.children && node.children.length > 0) {
      const childPath = findPathById(node.children as BookmarkNode[], id)
      if (childPath.length > 0) return [node.title, ...childPath]
    }
  }
  return []
}

const ensureBookmarkRoot = async () => {
  if (state.rootBookmarks.length > 0) {
    return
  }
  const base = await getBrowserBookmark()
  state.rootBookmarks = base
}

const onOpenPicker = async () => {
  try {
    await ensureBookmarkRoot()
    state.showPicker = true
  } catch (e) {
    const granted = await requestPermission('bookmarks')
    if (granted) {
      await ensureBookmarkRoot()
      state.showPicker = true
    } else {
      window.$message.error(window.$t('permission.bookmark') as string)
    }
  }
}

const onSelectBookmark = async (option: any) => {
  try {
    await ensureBookmarkRoot()
    const path = findPathById(state.rootBookmarks, option.id)
    localConfig.bookmarkFolder.selectedFolderTitles = path
    refreshSelectedFolderTitles()
  } catch (e) {
    console.warn('Select bookmark failed', e)
  }
}

const onResetFolder = () => {
  localConfig.bookmarkFolder.selectedFolderTitles = []
  refreshSelectedFolderTitles()
}
</script>

<template>
  <SettingPaneTitle :title="$t('setting.bookmarkFolder')" />

  <SettingPaneWrap
    id="bookmarkFolder__setting"
    widget-code="bookmarkFolder"
    :width-range="[100, 500]"
    :height-range="[100, 500]"
  >
    <template #header>
      <NFormItem :label="$t('bookmarkFolder.defaultDisplayFolderTitle')">
        <div class="setting__item_wrap">
          <div class="item__box folder__crumb">
            <Icon
              :icon="ICONS.folderOutline"
              class="crumb__icon"
            />
            <span class="crumb__text">{{ folderCrumb }}</span>
          </div>
          <div class="item__box">
            <NButton
              type="primary"
              size="small"
              ghost
              class="setting__item-ele"
              @click="onOpenPicker"
            >
              <Icon :icon="ICONS.bookmarkPlus" />&nbsp;{{ $t('common.select') }}
            </NButton>
            <NButton
              size="small"
              ghost
              class="setting__item-ele"
              @click="onResetFolder"
            >
              <Icon :icon="ICONS.restoreTwotone" />&nbsp;{{ $t('general.resetSettingValue') }}
            </NButton>
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.layoutColumns')">
        <div class="setting__item_wrap">
          <div class="item__box layout__inline">
            <NInputNumber
              v-model:value="localConfig.bookmarkFolder.gridColumns"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="1"
              :max="50"
            />
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="$t('general.newTabOpen')">
        <NSwitch
          v-model:value="localConfig.bookmarkFolder.isNewTabOpen"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.hideIcon')">
        <NSwitch
          v-model:value="localConfig.bookmarkFolder.isIconVisible"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.hideName')">
        <NSwitch
          v-model:value="localConfig.bookmarkFolder.isNameVisible"
          size="small"
        />
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.iconSize')">
        <div class="setting__item_wrap">
          <div
            class="item__box"
            style="width: 100%"
          >
            <NSlider
              v-model:value="localConfig.bookmarkFolder.iconSize"
              :step="1"
              :min="5"
              :max="128"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmarkFolder.iconSize"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="5"
              :max="128"
            />
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.itemHeight')">
        <div class="setting__item_wrap">
          <div
            class="item__box"
            style="width: 100%"
          >
            <NSlider
              v-model:value="localConfig.bookmarkFolder.itemHeight"
              :step="1"
              :min="10"
              :max="100"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmarkFolder.itemHeight"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="10"
              :max="100"
            />
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.itemGap')">
        <div class="setting__item_wrap">
          <div
            class="item__box"
            style="width: 100%"
          >
            <NSlider
              v-model:value="localConfig.bookmarkFolder.itemGap"
              :step="1"
              :min="0"
              :max="30"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmarkFolder.itemGap"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="0"
              :max="30"
            />
          </div>
        </div>
      </NFormItem>

      <NFormItem :label="$t('bookmarkFolder.itemBorderRadius')">
        <div class="setting__item_wrap">
          <div
            class="item__box"
            style="width: 100%"
          >
            <NSlider
              v-model:value="localConfig.bookmarkFolder.itemBorderRadius"
              :step="1"
              :min="0"
              :max="20"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.bookmarkFolder.itemBorderRadius"
              class="setting__item-ele setting__input-number"
              size="small"
              :step="1"
              :min="0"
              :max="20"
            />
          </div>
        </div>
      </NFormItem>
    </template>
  </SettingPaneWrap>

  <BookmarkPicker
    v-model:show="state.showPicker"
    select-type="folder"
    @select="onSelectBookmark"
  />
</template>

<style>
#bookmarkFolder__setting .folder__crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: rgba(127, 140, 141, 0.08);
}
#bookmarkFolder__setting .crumb__icon {
  font-size: 16px;
}
#bookmarkFolder__setting .crumb__text {
  font-size: 13px;
  user-select: text;
}

#bookmarkFolder__setting .layout__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
#bookmarkFolder__setting .layout__multiply {
  margin-left: 10px;
  font-size: 18px;
  opacity: 0.7;
}
#bookmarkFolder__setting .layout__preview {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;;
}
#bookmarkFolder__setting .preview__grid {
  display: grid;
  justify-items: center;
  gap: 6px;
  height: 100px;
}
#bookmarkFolder__setting .preview__item {
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  background-color: rgba(127, 140, 141, 0.15);
  max-width: 30px;
}
</style>
