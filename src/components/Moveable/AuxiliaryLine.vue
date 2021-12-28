<template>
  <div v-show="moveState.isXAxisCenterVisible" class="axis xaxis__center"></div>
  <div v-show="moveState.isYAxisCenterVisible" class="axis yaxis__center"></div>
  <div v-show="moveState.isTopVisible" class="axis axis__top"></div>
  <div v-show="moveState.isBottomVisible" class="axis axis__bottom"></div>
  <div v-show="moveState.isLeftVisible" class="axis axis__left"></div>
  <div v-show="moveState.isRightVisible" class="axis axis__right"></div>
</template>

<script setup lang="ts">
import { moveState } from '@/logic'

</script>

<style scoped>
.axis {
  z-index: 99;
  background-color: var(--bg-auxiliary-line);
  transition: all 1s ease;
}
.xaxis__center {
  position: fixed;
  top: 0;
  left: 50%;
  width: 1px;
  height: 100vh;
}
.yaxis__center {
  position: fixed;
  top: 50%;
  left: 0;
  width: 100vw;
  height: 1px;
}
.axis__top {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 1px;
}
.axis__bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 1px;
}
.axis__left {
  position: fixed;
  top: 0;
  left: 0;
  width: 1px;
  height: 100vh;
}
.axis__right {
  position: fixed;
  top: 0;
  right: 0;
  width: 1px;
  height: 100vh;
}
</style>
