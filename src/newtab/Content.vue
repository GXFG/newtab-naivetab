<script setup lang="ts">
import { useMessage, useNotification, useDialog, useLoadingBar } from 'naive-ui'
import ChangelogModal from '@/components/ChangelogModal.vue'

import BackgroundImg from '~/newtab/content/BackgroundImg.vue'
import RightClickMenu from '~/newtab/content/RightClickMenu.vue'

import DraftGuideLine from '@/newtab/draft/DraftGuideLine.vue'
import DraftDrawer from '@/newtab/draft/DraftDrawer.vue'

import Setting from '@/newtab/setting/index.vue'
import { widgetsList } from '@/newtab/widgets/registry'

window.$message = useMessage()
window.$notification = useNotification()
window.$dialog = useDialog()
window.$loadingBar = useLoadingBar()
</script>

<template>
  <!-- component -->
  <BackgroundImg />
  <RightClickMenu />

  <ChangelogModal />

  <DraftGuideLine />
  <DraftDrawer />

  <Setting />

  <!-- widget -->
  <component
    :is="item.component"
    v-for="item in widgetsList"
    :key="item.code"
  />
</template>
