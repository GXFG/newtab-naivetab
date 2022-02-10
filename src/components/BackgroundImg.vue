<template>
  <!-- save css var -->
  <div id="background">
    <div id="background__container" />
  </div>
</template>

<script setup lang="ts">
import { localState } from '@/logic'
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
    filter: blur(v-bind(localState.style.general.bgBlur + 'px'));
    opacity: v-bind(localState.style.general.bgOpacity);
  }
}
</style>
