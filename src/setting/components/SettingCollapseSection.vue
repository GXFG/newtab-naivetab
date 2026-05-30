<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'

const props = withDefaults(
  defineProps<{
    name: string
    title?: string
    /** 标题前图标，须通过 ICONS 常量引用 */
    icon?: string
    expanded?: boolean
  }>(),
  {
    title: undefined,
    icon: undefined,
    expanded: false,
  },
)

const emit = defineEmits<{
  (e: 'update:expanded', name: string, isExpanded: boolean): void
}>()

const bodyRef = ref<HTMLElement>()

const toggle = () => {
  emit('update:expanded', props.name, !props.expanded)
}

/**
 * 展开时根据内容实际高度设置 max-height。
 * 每个 onEnter/onLeave 都绑定了 transitionend 监听 + setTimeout 双兜底：
 * 当用户开启 prefers-reduced-motion 时 transition 不执行，
 * transitionend 事件永不触发，setTimeout 会在动画时长 + 50ms 后调用 done() 防止卡死。
 */
const onBeforeEnter = () => {
  if (bodyRef.value) {
    bodyRef.value.style.maxHeight = '0px'
  }
}

const onEnter = (_el: Element, done: () => void) => {
  if (bodyRef.value) {
    const h = bodyRef.value.scrollHeight
    bodyRef.value.style.maxHeight = `${h}px`
    bodyRef.value.addEventListener('transitionend', done, { once: true })
    // prefers-reduced-motion 兜底
    setTimeout(done, 350)
  }
}

const onAfterEnter = () => {
  if (bodyRef.value) {
    bodyRef.value.style.maxHeight = 'none'
  }
}

const onBeforeLeave = () => {
  if (bodyRef.value) {
    bodyRef.value.style.maxHeight = `${bodyRef.value.scrollHeight}px`
  }
}

const onLeave = (_el: Element, done: () => void) => {
  requestAnimationFrame(() => {
    if (bodyRef.value) {
      bodyRef.value.style.maxHeight = '0px'
      bodyRef.value.addEventListener('transitionend', done, { once: true })
      // prefers-reduced-motion 兜底
      setTimeout(done, 300)
    }
  })
}

const onAfterLeave = () => {
  if (bodyRef.value) {
    bodyRef.value.style.maxHeight = '0px'
  }
}
</script>

<template>
  <div class="setting-collapse-section">
    <!-- 可点击的标题区域 -->
    <div
      class="section__header"
      :class="{ 'section__header--expanded': expanded }"
      @click="toggle"
    >
      <div class="header__title">
        <Icon
          v-if="icon"
          :icon="icon"
          class="header__icon"
        />
        <span
          v-if="title"
          class="header__label"
          >{{ title }}</span
        >
        <slot
          v-else
          name="header"
        />
      </div>

      <div class="header__indicator">
        <Icon
          :icon="ICONS.chevronRight"
          class="header__chevron"
          :class="{ 'header__chevron--expanded': expanded }"
        />
      </div>
    </div>

    <!-- 展开/收起动画区域 -->
    <Transition
      name="setting-collapse"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <div
        v-show="expanded"
        ref="bodyRef"
        class="section__body"
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.setting-collapse-section {
  margin-bottom: 4px;

  /* ——— 标题区域 ——— */
  .section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-radius: var(--radius-md);
    cursor: pointer;
    user-select: none;
    position: relative;
    transition: background-color var(--transition-base);
    color: var(--n-text-color-3);

    /* 左侧色条，主题色 */
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      border-radius: 2px;
      background: var(--nt-primary-color);
      transition: opacity var(--transition-base);
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 8px;
      right: 8px;
      height: 1px;
      background: var(--gray-alpha-06);
      transition: opacity var(--transition-base);
    }

    &:hover {
      background-color: var(--gray-alpha-08);

      .header__indicator {
        background-color: var(--gray-alpha-12);
      }
    }

    &.section__header--expanded {
      color: var(--n-text-color-2);

      &::after {
        opacity: 0;
      }

      &:hover {
        background-color: var(--gray-alpha-05);
      }

      .header__chevron {
        color: var(--n-text-color-2);
      }
    }

    .header__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;

      .header__icon {
        font-size: var(--text-base);
        flex-shrink: 0;
      }

      .header__label {
        font-size: var(--text-sm);
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
    }

    /* Chevron 指示器：圆形背景 + 旋转动画 */
    .header__indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-pill);
      flex-shrink: 0;
      transition: background-color var(--transition-base);

      .header__chevron {
        font-size: var(--text-base);
        color: var(--n-text-color-3);
        transform: rotate(0deg);
        transition:
          transform var(--transition-spring),
          color var(--transition-base);

        &.header__chevron--expanded {
          transform: rotate(90deg);
        }
      }
    }
  }

  /* ——— 内容容器 ——— */
  .section__body {
    margin-top: 6px;
    padding: 0 13px;
    border-radius: var(--radius-lg);
    border-bottom: 1px solid var(--gray-alpha-06);
    overflow: hidden;

    /* 内部 SettingFormItem 分隔线 */
    :deep(.form-item) {
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 14px;
        right: 14px;
        border-bottom: 1px solid var(--gray-alpha-06);
      }

      &:last-child::after {
        display: none;
      }
    }
  }
}

/* ——— 折叠/展开动画 ——— */
.setting-collapse-enter-active {
  transition:
    opacity 250ms ease,
    max-height 300ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.setting-collapse-leave-active {
  transition:
    opacity 200ms ease,
    max-height 250ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.setting-collapse-enter-from,
.setting-collapse-leave-to {
  opacity: 0;
}

.setting-collapse-enter-to,
.setting-collapse-leave-from {
  opacity: 1;
}
</style>
