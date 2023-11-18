<script setup lang="ts">
import { SECOND_MODAL_WIDTH } from '@/logic/const'
import { KEYCAP_PREINSTALL_MAP } from '@/logic/keyboard'
import { localConfig, localState } from '@/logic/store'

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:show'])

const onCloseModal = () => {
  emit('update:show', false)
}

const onSelectPresetTheme = (themeKey: string) => {
  localConfig.bookmark.shellColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].shellColor
  localConfig.bookmark.mainFontColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].mainFontColor
  localConfig.bookmark.mainBackgroundColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].mainBackgroundColor
  localConfig.bookmark.emphasisOneFontColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisOneFontColor
  localConfig.bookmark.emphasisOneBackgroundColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisOneBackgroundColor
  localConfig.bookmark.emphasisTwoFontColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisTwoFontColor
  localConfig.bookmark.emphasisTwoBackgroundColor[localState.value.currAppearanceCode] = KEYCAP_PREINSTALL_MAP[themeKey].emphasisTwoBackgroundColor
}

const presetThemeList = Object.keys(KEYCAP_PREINSTALL_MAP)
</script>

<template>
  <NDrawer
    :show="props.show"
    :width="SECOND_MODAL_WIDTH"
    :height="350"
    :placement="localConfig.general.drawerPlacement"
    show-mask="transparent"
    to="#preset-theme__drawer"
    @update:show="onCloseModal()"
  >
    <NDrawerContent
      :title="`${$t('common.select')}${$t('bookmark.presetTheme')}`"
      closable
    >
      <div class="theme__container">
        <div
          v-for="themeKey in presetThemeList"
          :key="themeKey"
          class="theme__item"
          :style="`background-color: ${KEYCAP_PREINSTALL_MAP[themeKey].shellColor}`"
          @click="onSelectPresetTheme(themeKey)"
        >
          <p
            class="theme__qwerty"
            :style="`color: ${KEYCAP_PREINSTALL_MAP[themeKey].mainFontColor}; background-color: ${KEYCAP_PREINSTALL_MAP[themeKey].mainBackgroundColor}`"
          >
            {{ KEYCAP_PREINSTALL_MAP[themeKey].label }}
          </p>

          <div class="theme__emphasis">
            <p
              class="emphasis__one"
              :style="`color: ${KEYCAP_PREINSTALL_MAP[themeKey].emphasisOneFontColor}; background-color: ${KEYCAP_PREINSTALL_MAP[themeKey].emphasisOneBackgroundColor}`"
            >
              Control
            </p>

            <p
              class="emphasis__two"
              :style="`color: ${KEYCAP_PREINSTALL_MAP[themeKey].emphasisTwoFontColor}; background-color: ${KEYCAP_PREINSTALL_MAP[themeKey].emphasisTwoBackgroundColor}`"
            >
              Enter
            </p>
          </div>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.theme__container {
  display: flex;
  flex-wrap: wrap;
  .theme__item {
    display: flex;
    flex-direction: column;
    margin: 1%;
    padding: 3%;
    width: 31%;
    border-radius: 3px;
    text-align: center;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    &:hover {
      opacity: 0.6;
    }
    .theme__qwerty {
      border-radius: 3px;
    }
    .theme__emphasis {
      display: flex;
      margin-top: 5px;
      .emphasis__one {
        flex: 1;
        border-radius: 3px;
      }
      .emphasis__two {
        flex: 1;
        margin-left: 5px;
        border-radius: 3px;
      }
    }
  }
}
</style>
