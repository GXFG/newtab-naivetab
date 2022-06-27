<template>
  <!-- save css var -->
  <div id="background">
    <div id="background__container" :style="bgStyle" />
  </div>
</template>

<script setup lang="ts">
import { localConfig, currBackgroundImageUrl, isImageLoading } from '@/logic'

const bgStyle = computed(() => {
  if (localConfig.general.isBackgroundImageEnabled) {
    return `background-image: url(${currBackgroundImageUrl.value});`
  }
  return ''
})

const customOpacity = computed(() => isImageLoading.value ? 0 : localConfig.general.bgOpacity)
</script>

<style>
#background {
  #background__container {
    z-index: 1;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-size: cover;
    background-repeat: no-repeat;
    filter: blur(v-bind(localConfig.general.bgBlur + 'px'));
    opacity: v-bind(customOpacity);
    /* transition: all 250ms ease; */
    /* will-change: background-image; */
  }
}
</style>
