<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { createTab } from '@/logic/util'
import { URL_NAIVETAB_DOC_HOME, URL_GITHUB_HOME, URL_FEEDBACK_EMAIL } from '@/logic/constants/index'
import { openUserGuide } from '@/logic/guide'
import { openChangelogModal, openExtensionsStorePage } from '@/logic/store'
import SettingPaneTitle from '@/newtab/setting/components/SettingPaneTitle.vue'

const appVersion = computed(() => window.appVersion)
</script>

<template>
  <SettingPaneTitle :title="$t('setting.aboutIndex')" />

  <p class="about__title">NaiveTab</p>

  <div class="about__icon">
    <img
      class="icon__img"
      :src="'/assets/img/icon/icon.png'"
    />
  </div>

  <p class="about__version">{{ `${$t('common.version')}: ${appVersion}` }}</p>

  <p class="about__label"><Icon :icon="ICONS.questionBold" />&nbsp;{{ `${$t('about.userHelp')}` }}</p>

  <div class="about__item_list">
    <NButton
      size="small"
      ghost
      :title="$t('about.userDocs')"
      @click="createTab(URL_NAIVETAB_DOC_HOME)"
    >
      <Icon :icon="ICONS.bookOutline" />&nbsp;{{ $t('about.userDocs') }}
    </NButton>
    <NButton
      size="small"
      ghost
      :title="$t('about.userGuide')"
      @click="openUserGuide"
    >
      <Icon :icon="ICONS.devGuideOutline" />&nbsp;{{ $t('about.userGuide') }}
    </NButton>
    <NButton
      size="small"
      ghost
      :title="$t('about.changelog')"
      @click="openChangelogModal"
    >
      <Icon :icon="ICONS.newReleases" />&nbsp;{{ $t('about.changelog') }}
    </NButton>
  </div>

  <p class="about__label"><Icon :icon="ICONS.feedbackMsg" />&nbsp;{{ `${$t('about.feedback')}` }}</p>

  <div class="about__item_list">
    <NButton
      size="small"
      ghost
      :title="$t('about.goodReview')"
      @click="openExtensionsStorePage()"
    >
      <Icon :icon="ICONS.thumbsUp" />&nbsp;{{ $t('about.goodReview') }}
    </NButton>

    <NButton
      size="small"
      ghost
      title="GitHub"
      @click="createTab(URL_GITHUB_HOME)"
    >
      <Icon :icon="ICONS.githubLogo" />&nbsp;Github
    </NButton>

    <NButton
      size="small"
      ghost
      title="Email"
      @click="createTab(URL_FEEDBACK_EMAIL)"
    >
      <Icon :icon="ICONS.emailOutline" />&nbsp;Email
    </NButton>
  </div>

  <p class="about__copyright">{{ `© ${new Date().getFullYear()} NaiveTab. All rights reserved.` }}</p>
</template>

<style scoped>
.about__title {
  margin-top: 20px;
  font-size: 17px;
  letter-spacing: 1px;
  text-align: center;
  font-family: Arial Rounded MT Bold;
}

.about__icon {
  /* margin-top: 5px; */
  display: flex;
  justify-content: center;
  align-items: center;
  .icon__img {
    width: 70px;
    height: 70px;
  }
}

.about__version {
  margin-top: 5px;
  text-align: center;
  font-family: Arial Rounded MT Bold;
}

.about__label {
  margin: 18px 5px 0 5px;
  display: flex;
  align-items: center;
}
.about__item_list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 10px 65px;
  gap: 15px;
}
.about__copyright {
  margin-top: 45px;
  font-size: 14px;
  letter-spacing: 1px;
  text-align: center;
}
</style>
