<script setup lang="ts">
import { createTab } from '@/logic/util'
import { URL_NAIVETAB_DOC_HOME, URL_GITHUB_HOME, URL_FEEDBACK_EMAIL } from '@/logic/const'
import { openUserGuide } from '@/logic/guide'
import { openChangelogModal, openExtensionsStorePage } from '@/logic/store'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'

const appVersion = computed(() => window.appVersion)
</script>

<template>
  <BaseComponentCardTitle :title="$t('setting.aboutIndex')" />

  <p class="about__title">NaiveTab</p>

  <div class="about__icon">
    <img
      class="icon__img"
      :src="'/assets/img/icon/icon.png'"
    />
  </div>

  <p class="about__version">{{ `${$t('common.version')}: ${appVersion}` }}</p>

  <p class="about__label"><ic:baseline-help-outline />&nbsp;{{ `${$t('about.userHelp')}` }}</p>

  <div class="about__item_list">
    <NButton
      size="small"
      ghost
      :title="$t('about.userDocs')"
      @click="createTab(URL_NAIVETAB_DOC_HOME)"
    >
      <material-symbols:book-2-outline />&nbsp;{{ $t('about.userDocs') }}
    </NButton>
    <NButton
      size="small"
      ghost
      :title="$t('about.userGuide')"
      @click="openUserGuide"
    >
      <material-symbols:developer-guide-outline-rounded />&nbsp;{{ $t('about.userGuide') }}
    </NButton>
    <NButton
      size="small"
      ghost
      :title="$t('about.changelog')"
      @click="openChangelogModal"
    >
      <ic:outline-new-releases />&nbsp;{{ $t('about.changelog') }}
    </NButton>
  </div>

  <p class="about__label"><bx:message-rounded-dots />&nbsp;{{ `${$t('about.feedback')}` }}</p>

  <div class="about__item_list">
    <NButton
      size="small"
      ghost
      :title="$t('about.goodReview')"
      @click="openExtensionsStorePage()"
    >
      <ph:thumbs-up-bold />&nbsp;{{ $t('about.goodReview') }}
    </NButton>

    <NButton
      size="small"
      ghost
      title="GitHub"
      @click="createTab(URL_GITHUB_HOME)"
    >
      <carbon:logo-github />&nbsp;Github
    </NButton>

    <NButton
      size="small"
      ghost
      title="Email"
      @click="createTab(URL_FEEDBACK_EMAIL)"
    >
      <mdi:email-outline />&nbsp;Email
    </NButton>
  </div>
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
</style>
