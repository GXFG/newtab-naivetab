<template>
  <div v-show="moveState.isXAxisCenterVisible" class="axis xaxis__center"></div>
  <div v-show="moveState.isYAxisCenterVisible" class="axis yaxis__center"></div>
  <div v-show="moveState.isTopVisible" class="bound bound__top"></div>
  <div v-show="moveState.isBottomVisible" class="bound bound__bottom"></div>
  <div v-show="moveState.isLeftVisible" class="bound bound__left"></div>
  <div v-show="moveState.isRightVisible" class="bound bound__right"></div>
</template>

<script setup lang="ts">
import { moveState, globalState } from '@/logic'
import { getStyleConst } from '@/styles/index'

const auxiliaryLineMain = computed(() => getStyleConst('auxiliaryLineMain', globalState.localState.currThemeCode))
const auxiliaryLineBound = computed(() => getStyleConst('auxiliaryLineBound', globalState.localState.currThemeCode))
</script>

<style>
/* 画布中心辅助线 */
.axis {
  z-index: 99;
  background-color: v-bind(auxiliaryLineMain);
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

/* 画布边界辅助线 */
.bound {
  z-index: 99;
  background-color: v-bind(auxiliaryLineBound);
  transition: all 1s ease;
}
.bound__top {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 1px;
}
.bound__bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 1px;
}
.bound__left {
  position: fixed;
  top: 0;
  left: 0;
  width: 1px;
  height: 100vh;
}
.bound__right {
  position: fixed;
  top: 0;
  right: 0;
  width: 1px;
  height: 100vh;
}
</style>
