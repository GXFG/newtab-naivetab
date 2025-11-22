<script setup lang="ts">
import { moveState, isDragMode } from '@/logic/moveable'
import { getStyleConst } from '@/logic/store'

const auxiliaryLineMain = getStyleConst('auxiliaryLineMain')
const auxiliaryLineBound = getStyleConst('auxiliaryLineBound')
</script>

<template>
  <div
    v-if="isDragMode"
    class="guide__line"
  >
    <div
      class="axis xaxis__center"
      :class="{ 'line__show': moveState.isXAxisCenterVisible }"
    />
    <div
      class="axis yaxis__center"
      :class="{ 'line__show': moveState.isYAxisCenterVisible }"
    />
    <div
      class="bound bound__top"
      :class="{ 'line__show': moveState.isTopBoundVisible }"
    />
    <div
      class="bound bound__bottom"
      :class="{ 'line__show': moveState.isBottomBoundVisible }"
    />
    <div
      class="bound bound__left"
      :class="{ 'line__show': moveState.isLeftBoundVisible }"
    />
    <div
      class="bound bound__right"
      :class="{ 'line__show': moveState.isRightBoundVisible }"
    />
  </div>
</template>

<style>
.guide__line {
  .line__show {
    opacity: 1 !important;
  }

  /* 画布中心辅助线 */
  .axis {
    z-index: 20;
    outline: 1.5px solid v-bind(auxiliaryLineMain);
    opacity: 0;
    transition: opacity 0.3s;
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
    outline: 5px solid v-bind(auxiliaryLineBound);
    opacity: 0;
    transition: opacity 0.3s;
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
}
</style>
