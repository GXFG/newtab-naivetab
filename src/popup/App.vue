<script setup lang="ts">
import {
  registerGlobalErrorHandler,
  registerVueErrorHandler,
} from '@/logic/utils/errorHandler'
import {
  initDomStyleWatchers,
  cleanupDomStyleWatchers,
} from '@/logic/store/dom'
import Content from '@/popup/Content.vue'

onMounted(() => {
  registerGlobalErrorHandler('popup')
  registerVueErrorHandler(getCurrentInstance()!.appContext.app, 'popup')
  initDomStyleWatchers()
})

onUnmounted(() => {
  cleanupDomStyleWatchers()
})
</script>

<template>
  <Content />
</template>

<style>
/* popup 的 body 基线 —— 刻意不引 src/styles/global.css：
 * 那里的 body 是 100vw/100vh/overflow:hidden 的全屏规则，会把扩展弹窗撑成满屏。
 * 代价是本文件必须自己补齐 popup 需要的 body 属性（文字色、字体栈）。
 *
 * 为什么要显式写 color：.reka-card 只设 background-color 不设 color，标题和输入框
 * （原生 <input>，只靠 all: unset 继承）都从 body 拿颜色。**但理由不是"防止深底黑字"** ——
 * tokens.css 的 color-scheme 已经让 UA 默认色跟着主题走（深色下 UA 默认白字，
 * 实测 rgb(255,255,255)），删掉也不会黑底黑字。真正的理由是**跟用户配置对齐**：
 * 用户改过页面文字色，弹窗要跟着变；且这样弹窗与设置面板（.setting-board 继承 body）
 * 共用同一个基线色来源，不会分叉。
 *
 * 取值用 --nt-text-color-main（用户页面文字色），别改成 --nt-text-primary ——
 * 那是"具体文字"的层级 token，不是卡片基线。
 *
 * 字体栈在此单独定义：弹窗比新标签页更小、更需要中文优先，不用 font.css 的 Arial 栈。
 */
body {
  font-family:
    Helvetica Neue,
    Helvetica,
    Arial,
    PingFang SC,
    Heiti SC,
    Hiragino Sans GB,
    Microsoft YaHei,
    sans-serif;
  color: var(--nt-text-color-main);
}
</style>
