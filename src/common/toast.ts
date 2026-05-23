/**
 * 统一 Toast 模块 — 所有环境的用户反馈入口。
 *
 * 运行环境：
 * - Content Script：closed Shadow DOM 隔离样式
 * - Newtab / Popup / Options：同样用 Shadow DOM，避免 Widget/页面样式污染
 *
 * 零外部依赖，不引入 naive-ui。
 */

import logoSvg from '@/assets/img/logo.svg?raw'

const TOAST_HOST_CLASS = '__naivetab-toast-host'
const TOAST_CLASS = '__naivetab-toast'

const LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`

/** 4 种类型的 SVG inline 图标（Material Design Icons 风格） */
const SVG_ICONS: Record<string, string> = {
  success:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
}

/** 4 种类型的颜色（固定色，不区分主题） */
const TYPE_COLORS: Record<string, string> = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#CFCFCF',
}

let hostEl: HTMLDivElement | null = null
let shadow: ShadowRoot | null = null
let toastEl: HTMLDivElement | null = null
let logoEl: HTMLImageElement | null = null
let iconEl: HTMLDivElement | null = null
let textSpan: HTMLSpanElement | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

/** Shadow DOM 内部样式 */
const SHADOW_CSS = `
  :host {
    all: initial;
  }

  * {
    box-sizing: border-box;
  }

  @keyframes __naivetab-toast-bounce {
    0% {
      transform: translateX(-50%) translateY(0) scale(1);
    }
    30% {
      transform: translateX(-50%) translateY(-4px) scale(1.04);
    }
    100% {
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  .${TOAST_CLASS} {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 20px;
    max-width: 60vw;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(30, 30, 30, 0.92) 0%, rgba(20, 20, 20, 0.95) 100%);
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.4;
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: none;
    user-select: none;
  }

  .${TOAST_CLASS}.__width-change {
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .${TOAST_CLASS} .__text {
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }

  .${TOAST_CLASS}.__bounce {
    animation: __naivetab-toast-bounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .${TOAST_CLASS} .__logo {
    display: block;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity 0.2s ease,
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .${TOAST_CLASS} .__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity 0.2s ease,
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .${TOAST_CLASS} .__icon svg {
    display: block;
  }
`

function createToast() {
  hostEl = document.createElement('div')
  hostEl.className = TOAST_HOST_CLASS
  shadow = hostEl.attachShadow({ mode: 'closed' })

  const styleEl = document.createElement('style')
  styleEl.textContent = SHADOW_CSS
  shadow.appendChild(styleEl)

  toastEl = document.createElement('div')
  toastEl.className = TOAST_CLASS

  logoEl = document.createElement('img')
  logoEl.className = '__logo'
  logoEl.src = LOGO_DATA_URI
  logoEl.alt = ''
  logoEl.draggable = false
  toastEl.appendChild(logoEl)

  textSpan = document.createElement('span')
  textSpan.className = '__text'
  toastEl.appendChild(textSpan)

  iconEl = document.createElement('div')
  iconEl.className = '__icon'
  toastEl.appendChild(iconEl)

  shadow.appendChild(toastEl)
  document.body.appendChild(hostEl)
}

/**
 * 显示 Toast
 * @param type 类型：success / error / warning / info
 * @param message 显示文字
 * @param duration 显示时长（ms），默认 3500
 */
function show(
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  duration = 3500,
) {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  if (!hostEl || !shadow) {
    createToast()
    // 强制 reflow 提交初始隐藏状态，确保后续 transition 有起始点
    void toastEl!.offsetWidth
  }

  // 设置图标（info 类型不展示 icon）
  if (type === 'info') {
    ;(iconEl as HTMLElement).style.display = 'none'
  } else {
    ;(iconEl as HTMLElement).style.display = ''
    // SVG_ICONS 是硬编码常量，type 是 'success'|'error'|'warning'|'info' 字面量联合，
    // 不存在用户输入拼接，innerHTML 在此安全
    iconEl!.innerHTML = SVG_ICONS[type] || SVG_ICONS.info
    const color = TYPE_COLORS[type] || TYPE_COLORS.info
    ;(iconEl as HTMLElement).style.color = color
  }

  // 设置文字
  textSpan!.textContent = message

  const isVisible = toastEl!.style.opacity === '1'

  if (isVisible) {
    // 已可见时触发弹跳动画，表示命令被再次触发
    toastEl!.classList.remove('__bounce')
    toastEl!.classList.add('__width-change')
    void toastEl!.offsetWidth
    toastEl!.classList.add('__bounce')
  } else {
    // 首次显示，入场动画
    requestAnimationFrame(() => {
      toastEl!.style.opacity = '1'
      toastEl!.style.transform = 'translateX(-50%) translateY(0)'
      logoEl!.style.opacity = '1'
      logoEl!.style.transform = 'scale(1)'
      ;(iconEl as HTMLElement).style.opacity = '1'
      ;(iconEl as HTMLElement).style.transform = 'scale(1)'
    })
  }

  hideTimer = setTimeout(() => {
    toastEl!.style.opacity = '0'
    toastEl!.style.transform = 'translateX(-50%) translateY(-10px)'
    toastEl!.classList.remove('__bounce')
    toastEl!.classList.remove('__width-change')
    logoEl!.style.opacity = '0'
    logoEl!.style.transform = 'scale(0.5)'
    ;(iconEl as HTMLElement).style.opacity = '0'
    ;(iconEl as HTMLElement).style.transform = 'scale(0.5)'
    hideTimer = null
  }, duration)
}

export const showToast = {
  success: (message: string, duration?: number) =>
    show('success', message, duration),
  error: (message: string, duration?: number) =>
    show('error', message, duration),
  warning: (message: string, duration?: number) =>
    show('warning', message, duration),
  info: (message: string, duration?: number) => show('info', message, duration),
}
