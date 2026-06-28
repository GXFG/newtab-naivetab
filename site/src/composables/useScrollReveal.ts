/**
 * @module useScrollReveal
 * 滚动入场动画 composable — IntersectionObserver + animejs
 *
 * 用法：
 *   const container = ref<HTMLElement>()
 *   useScrollReveal(container, { stagger: 0.06, threshold: 0.15 })
 *
 * 每个元素仅触发一次，进入视口后 unobserve。
 */

import { onMounted, onBeforeUnmount, type Ref } from 'vue'
import { animate, stagger } from 'animejs'

interface ScrollRevealOptions {
  /** 动画类型，默认 'fade-up' */
  type?: 'fade-up' | 'fade-in' | 'scale-in' | 'fade-left' | 'fade-right'
  /** 子元素 stagger 间隔（秒），默认 0.06 */
  stagger?: number
  /** IntersectionObserver 触发阈值，默认 0.15 */
  threshold?: number
  /** 动画时长（ms），默认 700 */
  duration?: number
  /** 入场缓动，默认 spring 物理引擎 */
  ease?: string
  /** rootMargin，默认 '0px 0px -60px 0px'（底部收缩 60px，确保元素滚入可见区域足够深才触发，避免刚露出底边就播放动画的仓促感） */
  rootMargin?: string
  /** 是否只触发一次，默认 true */
  once?: boolean
}

/**
 * 各动画类型的 from 状态
 */
const ANIM_PROPS: Record<string, Record<string, [number, number]>> = {
  'fade-up':    { opacity: [0, 1], translateY: [36, 0] },
  'fade-in':    { opacity: [0, 1] },
  'scale-in':   { opacity: [0, 1], scale: [0.92, 1] },
  'fade-left':  { opacity: [0, 1], translateX: [-36, 0] },
  'fade-right': { opacity: [0, 1], translateX: [36, 0] },
}

export function useScrollReveal(
  target: Ref<HTMLElement | null | undefined>,
  options: ScrollRevealOptions = {},
) {
  const {
    type = 'fade-up',
    stagger: staggerSec = 0.06,
    threshold = 0.15,
    duration = 700,
    ease = 'spring(1, 100, 10, 0)',
    rootMargin = '0px 0px -60px 0px',
    once = true,
  } = options

  let observer: IntersectionObserver | null = null

  function reveal(el: HTMLElement) {
    const props = ANIM_PROPS[type] ?? ANIM_PROPS['fade-up']
    const children = Array.from(el.children) as HTMLElement[]

    const baseParams = {
      ...props,
      duration,
      ease,
    }

    if (children.length > 0 && staggerSec > 0) {
      // 提前挂 will-change，避免首帧卡顿
      for (const child of children) {
        child.style.willChange = 'transform, opacity'
      }
      animate(children, {
        ...baseParams,
        delay: stagger(staggerSec * 1000, { from: 'center' }),
        onComplete: () => {
          for (const child of children) {
            child.style.willChange = 'auto'
          }
        },
      })
    } else {
      el.style.willChange = 'transform, opacity'
      animate(el, {
        ...baseParams,
        onComplete: () => {
          el.style.willChange = 'auto'
        },
      })
    }
  }

  onMounted(() => {
    const el = target.value
    if (!el) return

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(el)
            if (once) {
              observer?.unobserve(el)
            }
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
