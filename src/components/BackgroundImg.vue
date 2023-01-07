<script setup lang="ts">
import { localConfig, imageState } from '@/logic'

const bgStyle = computed(() => {
  return localConfig.general.isBackgroundImageEnabled ? `background-image: url(${imageState.currBackgroundImageFileObjectURL});` : ''
})

const customOpacity = computed(() => (localConfig.general.bgOpacity))
</script>

<template>
  <!-- save css var -->
  <div id="background">
    <div id="background__container" :style="bgStyle" />
  </div>
</template>

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
    background-position: center;
    filter: blur(v-bind(`${localConfig.general.bgBlur}px`));
    opacity: v-bind(customOpacity);
  }
}
</style>
