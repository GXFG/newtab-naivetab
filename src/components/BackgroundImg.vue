<template>
  <div id="background">
    <div id="background__container" />
  </div>
</template>

<script setup lang="ts">
import { globalState } from '@/logic'
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
    filter: blur(v-bind(globalState.style.general.bgBlur + 'px'));
    opacity: v-bind(globalState.style.general.bgOpacity);
  }
}
</style>
