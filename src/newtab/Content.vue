<script setup lang="ts">
import { useDialog } from 'naive-ui'
import ChangelogModal from '@/components/ChangelogModal.vue'

import BackgroundImg from '@/newtab/layers/BackgroundImg.vue'
import RightClickMenu from '@/newtab/layers/RightClickMenu.vue'

import DraftGuideLine from '@/newtab/draft/DraftGuideLine.vue'
import DraftDrawer from '@/newtab/draft/DraftDrawer.vue'

import Setting from '@/setting/index.vue'
import WidgetErrorBoundary from '@/newtab/WidgetErrorBoundary.vue'
import { widgetsList } from '@/newtab/widgets/registry'

window.$dialog = useDialog()
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
  <WidgetErrorBoundary
    v-for="item in widgetsList"
    :key="item.code"
    :code="item.code"
  >
    <component :is="item.component" />
  </WidgetErrorBoundary>
</template>
