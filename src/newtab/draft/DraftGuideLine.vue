<script setup lang="ts">
import { moveState, isDragMode } from '@/logic/moveable'
</script>

<template>
  <div
    v-if="isDragMode"
    class="guide__line"
  >
    <div
      class="axis xaxis__center"
      :class="{ line__show: moveState.isXAxisCenterVisible }"
    />
    <div
      class="axis yaxis__center"
      :class="{ line__show: moveState.isYAxisCenterVisible }"
    />
    <div
      class="bound bound__top"
      :class="{ line__show: moveState.isTopBoundVisible }"
    />
    <div
      class="bound bound__bottom"
      :class="{ line__show: moveState.isBottomBoundVisible }"
    />
    <div
      class="bound bound__left"
      :class="{ line__show: moveState.isLeftBoundVisible }"
    />
    <div
      class="bound bound__right"
      :class="{ line__show: moveState.isRightBoundVisible }"
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
    opacity: 0;
    /* 吸附到中心时的淡入过渡，配合 cubic-bezier 带轻微弹性感 */
    transition: opacity 180ms cubic-bezier(0.34, 1.06, 0.64, 1);
    pointer-events: none;
  }

  .xaxis__center {
    position: fixed;
    top: 0;
    left: 50%;
    width: 1px;
    height: 100vh;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--nt-auxiliary-line-main) 15%,
      var(--nt-auxiliary-line-main) 85%,
      transparent 100%
    );
    box-shadow: 0 0 6px 1px var(--nt-auxiliary-line-main);
    transform: translateX(-50%);
  }

  .yaxis__center {
    position: fixed;
    top: 50%;
    left: 0;
    width: 100vw;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent 0%,
      var(--nt-auxiliary-line-main) 15%,
      var(--nt-auxiliary-line-main) 85%,
      transparent 100%
    );
    box-shadow: 0 0 6px 1px var(--nt-auxiliary-line-main);
    transform: translateY(-50%);
  }

  /* 画布边界辅助线 */
  .bound {
    z-index: 20;
    opacity: 0;
    /* 碰边时快速闪现，消失时稍慢，形成边界感 */
    transition: opacity 150ms ease-out;
    pointer-events: none;
  }

  .bound__top {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent 0%,
      var(--nt-auxiliary-line-bound) 20%,
      var(--nt-auxiliary-line-bound) 80%,
      transparent 100%
    );
    box-shadow: 0 0 8px 2px var(--nt-auxiliary-line-bound);
  }

  .bound__bottom {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: 2px;
    background: linear-gradient(
      to right,
      transparent 0%,
      var(--nt-auxiliary-line-bound) 20%,
      var(--nt-auxiliary-line-bound) 80%,
      transparent 100%
    );
    box-shadow: 0 0 8px 2px var(--nt-auxiliary-line-bound);
  }

  .bound__left {
    position: fixed;
    top: 0;
    left: 0;
    width: 2px;
    height: 100vh;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--nt-auxiliary-line-bound) 20%,
      var(--nt-auxiliary-line-bound) 80%,
      transparent 100%
    );
    box-shadow: 0 0 8px 2px var(--nt-auxiliary-line-bound);
  }

  .bound__right {
    position: fixed;
    top: 0;
    right: 0;
    width: 2px;
    height: 100vh;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      var(--nt-auxiliary-line-bound) 20%,
      var(--nt-auxiliary-line-bound) 80%,
      transparent 100%
    );
    box-shadow: 0 0 8px 2px var(--nt-auxiliary-line-bound);
  }
}
</style>
