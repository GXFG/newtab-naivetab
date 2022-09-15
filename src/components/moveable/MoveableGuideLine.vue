<script setup lang="ts">
import { getStyleConst, moveState, isDragMode } from '@/logic'

const auxiliaryLineMain = getStyleConst('auxiliaryLineMain')
const auxiliaryLineBound = getStyleConst('auxiliaryLineBound')
</script>

<template>
  <div v-if="isDragMode">
    <div v-show="moveState.isXAxisCenterVisible" class="axis xaxis__center" />
    <div v-show="moveState.isYAxisCenterVisible" class="axis yaxis__center" />
    <div v-show="moveState.isTopBoundVisible" class="bound bound__top" />
    <div v-show="moveState.isBottomBoundVisible" class="bound bound__bottom" />
    <div v-show="moveState.isLeftBoundVisible" class="bound bound__left" />
    <div v-show="moveState.isRightBoundVisible" class="bound bound__right" />
  </div>
</template>

<style>
/* 画布中心辅助线 */
.axis {
  z-index: 20;
  outline: 1px solid v-bind(auxiliaryLineMain);
}
.xaxis__center {
  position: fixed;
  top: 0;
  left: 50%;
  width: 0;
  height: 100vh;
}
.yaxis__center {
  position: fixed;
  top: 50%;
  left: 0;
  width: 100vw;
  height: 0;
}

/* 画布边界辅助线 */
.bound {
  z-index: 20;
  outline: 2px solid v-bind(auxiliaryLineBound);
}
.bound__top {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 0;
}
.bound__bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 0;
}
.bound__left {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 100vh;
}
.bound__right {
  position: fixed;
  top: 0;
  right: 0;
  width: 0;
  height: 100vh;
}
</style>
