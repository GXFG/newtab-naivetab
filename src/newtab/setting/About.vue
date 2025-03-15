<script setup lang="ts">
import { createTab } from '@/logic/util'
import { URL_NAIVETAB_DOC_HOME, URL_GITHUB_HOME } from '@/logic/const'
import { openChangelogModal, openSponsorModal, openExtensionsStorePage } from '@/logic/store'
import BaseComponentCardTitle from '@/newtab/components/form/BaseComponentCardTitle.vue'

const appVersion = computed(() => window.appVersion)
</script>

<template>
  <BaseComponentCardTitle :title="$t('setting.about')" />

  <div class="about__icon">
    <img
      class="icon__img"
      :src="'/assets/img/icon/icon.png'"
    />
  </div>

  <div class="about__version">
    <p class="version__text">V{{ `${appVersion}` }}</p>
    <NButton
      class="version__changelog"
      text
      size="small"
      :title="$t('rightMenu.changelog')"
      @click="openChangelogModal()"
    >
      <ic:outline-new-releases />&nbsp;{{ $t('rightMenu.changelog') }}
    </NButton>
  </div>

  <div class="about__link">
    <NButton
      size="small"
      ghost
      :title="$t('rightMenu.userGuide')"
      @click="createTab(URL_NAIVETAB_DOC_HOME)"
    >
      <material-symbols:book-2-outline />&nbsp;{{ $t('rightMenu.userGuide') }}
    </NButton>

    <NButton
      size="small"
      ghost
      :title="$t('rightMenu.goodReview')"
      @click="openExtensionsStorePage()"
    >
      <ph:thumbs-up-bold />&nbsp;{{ $t('rightMenu.goodReview') }}
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
      :title="$t('rightMenu.buyACupOfCoffee')"
      @click="openSponsorModal()"
    >
      <ci:coffee-togo />&nbsp;{{ $t('rightMenu.buyACupOfCoffee') }}
    </NButton>
  </div>
</template>

<style scoped>
.about__icon {
  margin-top: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  .icon__img {
    width: 80px;
    height: 80px;
  }
}

.about__version {
  display: flex;
  flex-direction: column;
  align-items: center;
  .version__text {
    margin: 5px 0;
  }
  .version__changelog {
    /* margin-top: 5px; */
  }
}

.about__link {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 30px 50px;
  gap: 15px;
}
</style>
