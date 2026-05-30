<script setup lang="ts">
/**
 * KeyboardKeycapDisplay
 *
 * 单个键帽的纯展示组件，widget（newtab）和 popup 共用同一套 DOM 结构。
 * - 仅负责渲染，不包含任何业务逻辑（数据获取、事件派发等由外层处理）
 * - 尺寸 / 颜色通过父级注入的 CSS 变量（--nt-kb-*）驱动，无需 props 传递
 * - 外层通过 :style 绑定 keycapCssVars（来自 useKeyboardStyle）注入所有变量
 *
 * 视觉层级（从外到内）：
 *   row__keycap（键帽底座，含边框/阴影）
 *     └─ keycap__stage（键帽顶面，gmk/dsa/flat 三种型别）
 *          ├─ keycap__label  （键位标识，如 A / Enter）
 *          ├─ keycap__img    （书签图标 / 文件夹图标）
 *          └─ keycap__name   （书签名称）
 */

import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'

// ── Props ────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    // 必填
    keyCode: string
    label: string // 键位标识文本（如 'A'、'Enter'）
    name: string // 书签名称
    visualType: KeycapVisualType // 键帽型别：flat / gmk / dsa

    // 书签相关
    iconSrc?: string // favicon URL

    // 命令图标（优先级高于书签图标，用于 keyboardCommand 设置面板）
    commandIcon?: string // iconify 图标名称

    // 内联样式（由 useKeyboardStyle helpers 生成）
    stageStyle?: string // stage 顶面的尺寸偏移（gmk/dsa 立体效果）
    textStyle?: string // label / name 的文字对齐 + padding
    iconStyle?: string // 图标区的 justify-content + padding

    // 交互 / 状态
    imgDraggable?: boolean // 图标是否可拖拽（popup 拖拽排序时开启）
    isSelected?: boolean // 选中高亮（popup 书签选择态）
    isLoading?: boolean // 加载动画
    isBorderEnabled?: boolean // 显示自定义边框（--nt-kb-border-*）
    renderMode?: 'full' | 'preview' // 完整光感 / 预览渲染（设置面板使用，禁用 backdrop-filter 和 hover filter）

    // 内容显示开关
    showCapKey?: boolean // 显示键位标识
    showName?: boolean // 显示书签名称
    showFavicon?: boolean // 显示书签图标
    showTactileBumps?: boolean // 显示触感凸起（F / J 键）

    // 动画控制
    enableTransition?: boolean // 是否启用 layer 切换动画（首次加载禁用，后续启用）
  }>(),
  {
    iconSrc: '',
    commandIcon: '',
    stageStyle: '',
    textStyle: '',
    iconStyle: '',
    imgDraggable: false,
    isSelected: false,
    isLoading: false,
    isBorderEnabled: false,
    renderMode: 'preview',
    showCapKey: true,
    showName: true,
    showFavicon: true,
    showTactileBumps: false,
    enableTransition: false,
  },
)

// ── 派生 class ───────────────────────────────────────────────────────────────
// 型别 class 由组件自身管理；hover / active / move 等附加状态由外层传入

/** 键帽底座 class：型别 + 可选边框 + 预览模式 */
const rowClassName = computed(() => [
  `row__keycap-${props.visualType}`,
  props.isBorderEnabled && 'row__keycap--border',
  props.renderMode === 'preview' && 'row__keycap--preview',
])

/** stage 顶面 class：随型别切换 */
const stageClassName = computed(() => `keycap__stage-${props.visualType}`)

/** 触感凸起显示判断（F / J 键专属，模拟实体键盘盲打定位标记） */
const shouldShowTactileBumps = computed(
  () => props.showTactileBumps && ['KeyF', 'KeyJ'].includes(props.keyCode),
)

/** 空值占位符（避免模板中使用 &nbsp; 或不可见字符被转义） */
const EMPTY_PLACEHOLDER = ' '

/** layer 切换动画 key，内容变化时触发过渡 */
const iconKey = computed(() => `${props.iconSrc || 'noicon'}-${props.keyCode}`)
const nameKey = computed(() => `${props.name || 'noname'}-${props.keyCode}`)
</script>

<template>
  <!-- 键帽底座：型别 class 决定边框厚度和阴影风格 -->
  <div
    class="row__keycap"
    :class="rowClassName"
  >
    <!-- 选中遮罩（选择态） -->
    <div
      v-if="isSelected"
      class="keycap__select"
    >
      <Icon
        class="select__icon"
        :icon="ICONS.checkCircle"
      />
    </div>

    <!-- 键帽顶面（三种型别 flat / gmk / dsa，stageStyle 传入几何偏移） -->
    <div
      class="keycap__stage"
      :class="stageClassName"
      :style="stageStyle"
    >
      <!-- 加载动画（书签 favicon 加载中） -->
      <div
        v-if="isLoading"
        class="item__loading"
      >
        <Icon :icon="ICONS.loading" />
      </div>

      <!-- 键位标识（如 A / Enter / Shift） -->
      <p
        v-if="showCapKey"
        class="keycap__label"
        :style="textStyle"
      >
        {{ label || EMPTY_PLACEHOLDER }}
      </p>

      <!-- 命令图标区：commandIcon 优先级最高，其次才是书签 favicon/矢量图标 -->
      <div
        class="keycap__img"
        :style="iconStyle"
      >
        <Transition
          :name="enableTransition ? 'keycap-icon' : ''"
          mode="out-in"
        >
          <!-- 命令图标：优先级最高，用于 keyboardCommand 设置面板 -->
          <Icon
            v-if="commandIcon"
            :key="`cmd-${iconKey}`"
            :icon="commandIcon"
            class="img__command"
          />
          <!-- 书签 favicon -->
          <img
            v-else-if="showFavicon && iconSrc"
            :key="`icon-${iconKey}`"
            class="img__main"
            :src="iconSrc"
            :draggable="imgDraggable"
          />
        </Transition>
      </div>

      <!-- 书签名称 -->
      <Transition
        :name="enableTransition ? 'keycap-content' : ''"
        mode="out-in"
      >
        <p
          v-if="showName"
          :key="`name-${nameKey}`"
          class="keycap__name"
          :style="textStyle"
        >
          {{ name || EMPTY_PLACEHOLDER }}
        </p>
      </Transition>

      <!-- 触感凸起（仅 F / J 键，模拟实体键盘触感标记） -->
      <div
        v-if="shouldShowTactileBumps"
        class="keycap__tactile-bumps"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── 键帽底座基础样式 ─────────────────────────────────────────────────────── */
.row__keycap {
  position: relative;
  width: 100%;
  height: 100%;
  color: var(--nt-kb-main-font-color);
  background-color: var(--nt-kb-main-bg-color);
  border-radius: var(--nt-kb-border-radius);
  border-style: solid;
  box-sizing: border-box;
  cursor: pointer;
  transition:
    transform 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
    box-shadow 100ms ease,
    filter 100ms ease;

  /* ── 选中遮罩 ── */
  .keycap__select {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10;
    border-radius: calc(var(--nt-kb-border-radius) - 1px);
    overflow: hidden;
    pointer-events: none;
    animation: selectFadeIn 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94);

    /* 底部半透明渐变，保留键帽内容的可见性 */
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--nt-primary-color) 8%, transparent) 0%,
      color-mix(in srgb, var(--nt-primary-color) 22%, transparent) 100%
    );

    /* 玻璃模糊 + 饱和度增强 */
    backdrop-filter: blur(2px) saturate(1.3);

    /* 顶部高光线（与键帽顶面高光呼应） */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, var(--nt-primary-color) 60%, white),
        transparent
      );
      border-radius: 1px;
    }

    /* 多层边框 + 扩散光晕 */
    box-shadow:
      inset 0 0 0 1px
        color-mix(in srgb, var(--nt-primary-color) 50%, transparent),
      inset 0 0 12px
        color-mix(in srgb, var(--nt-primary-color) 12%, transparent),
      0 0 10px color-mix(in srgb, var(--nt-primary-color) 25%, transparent),
      0 0 20px color-mix(in srgb, var(--nt-primary-color) 12%, transparent);

    /* 选中图标 */
    .select__icon {
      width: 60%;
      height: 60%;
      color: var(--nt-primary-color);
      filter: drop-shadow(
        0 1px 4px color-mix(in srgb, var(--nt-primary-color) 45%, transparent)
      );
      animation: selectPopIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }

  /* ── 键帽顶面（纵向三段式：label / img / name） ── */
  .keycap__stage {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 100%;
    border-style: solid;
    color: inherit;
    background-color: inherit;

    /* 加载旋转图标，绝对定位居中覆盖 */
    .item__loading {
      z-index: 1;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--nt-primary-color);
      font-size: 190%;
    }

    /* 键位标识（左上角小字） */
    .keycap__label {
      flex: 0 0 auto;
      width: 100%;
      line-height: 1;
      padding-top: 1%;
      font-family: var(--nt-kb-key-font-family);
      font-size: var(--nt-kb-key-font-size);
      font-weight: 500;
    }

    /* 图标区（居中弹性伸缩，transform scale 由 --nt-kb-favicon-size 控制大小） */
    .keycap__img {
      flex: 1 1 0;
      min-height: 0;
      width: 100%;
      height: 40%;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;

      .img__main {
        height: 100%;
        transform: scale(var(--nt-kb-favicon-size));
      }

      .img__type {
        height: 100%;
        width: 100%;
        transform: scale(var(--nt-kb-favicon-size));
      }

      .img__command {
        transform: scale(var(--nt-kb-favicon-size));
      }
    }

    /* 书签名称（底部单行截断） */
    .keycap__name {
      flex: 0 0 auto;
      width: 100%;
      line-height: 1;
      font-size: var(--nt-kb-bookmark-font-size);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* 触感凸起（F / J 键底部横杠，模拟实体键盘盲打定位内凹标记） */
    .keycap__tactile-bumps {
      position: absolute;
      left: 50%;
      bottom: 8%;
      transform: translate(-50%, 0);
      /* 宽高随 base size 等比缩放，由 CSS 变量驱动 */
      width: var(--nt-kb-tactile-width);
      height: var(--nt-kb-tactile-height);
      border-radius: 99px;
      background: var(--nt-kb-main-font-color);
      opacity: 0.45;
      /* 键盘组件的 box-shadow 不使用全局 token，避免 tokens.css 变化影响键帽质感 */
      box-shadow:
        inset 0 1px 1px rgba(255, 255, 255, 0.35),
        0 1px 0 rgba(255, 255, 255, 0.15);
    }
  }
}

/* ── layer 切换内容过渡动画 ── */

/* 图标过渡：快速缩放 + 淡入淡出 */
.keycap-icon-enter-active {
  transition:
    opacity 150ms cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.keycap-icon-leave-active {
  transition:
    opacity 80ms ease,
    transform 80ms ease;
}

.keycap-icon-enter-from {
  opacity: 0;
  transform: scale(0.4) !important;
}

.keycap-icon-leave-to {
  opacity: 0;
  transform: scale(0.4) !important;
}

/* 名称过渡：轻微缩放 + 淡入淡出 */
.keycap-content-enter-active {
  transition:
    opacity 150ms cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.keycap-content-leave-active {
  transition:
    opacity 80ms ease,
    transform 80ms ease;
}

.keycap-content-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.keycap-content-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* ── 选中动画关键帧 ── */
@keyframes selectFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes selectPopIn {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ── flat 型别（微立体内嵌渐变 + 顶面高光线模拟光泽） ─────────────────────── */
.row__keycap-flat {
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.22),
    0 1px 2px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);

  .keycap__stage-flat {
    padding: var(--nt-kb-stage-flat-padding);
    border-radius: var(--nt-kb-border-radius);
    border-width: 1px;
    border-color: rgba(255, 255, 255, 0.18) rgba(0, 0, 0, 0.08)
      rgba(0, 0, 0, 0.12) rgba(255, 255, 255, 0.12);
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.04) 50%,
      rgba(0, 0, 0, 0.06) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.15);
  }
}

/* ── GMK 型别（仿 Cherry 高度，顶厚底薄三层边框 + 外阴影） ─────────────── */
.row__keycap-gmk {
  border-width: var(--nt-kb-gmk-top-border) var(--nt-kb-gmk-h-border)
    var(--nt-kb-gmk-bot-border);
  border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.12) rgba(0, 0, 0, 0.3)
    rgba(0, 0, 0, 0.08);
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);

  .keycap__stage-gmk {
    overflow: hidden;
    border-width: 0px;
    border-color: rgba(0, 0, 0, 0.1);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 8px 4px;
    border-bottom-left-radius: 8px 4px;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 255, 255, 0.1) 18%,
      rgba(0, 0, 0, 0.04) 55%,
      rgba(0, 0, 0, 0.1) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.12),
      0 2px 6px rgba(0, 0, 0, 0.18);
    background-color: inherit;
    color: inherit;
  }
}

/* ── DSA 型别（球面均等高度，四边等宽 + 辐射渐变顶面） ──────────────────── */
.row__keycap-dsa {
  border-width: var(--nt-kb-dsa-border);
  border-color: rgba(255, 255, 255, 0.06) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.24)
    rgba(0, 0, 0, 0.06);
  box-shadow:
    0 3px 7px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  .keycap__stage-dsa {
    overflow: hidden;
    border-width: 0px;
    /* 随用户设置的 border-radius 变量响应，略加 2px 模拟 DSA 圆润球面 */
    border-radius: calc(var(--nt-kb-border-radius) + 2px);
    background: radial-gradient(
      ellipse at 38% 30%,
      rgba(255, 255, 255, 0.3) 0%,
      rgba(255, 255, 255, 0.1) 35%,
      rgba(0, 0, 0, 0.06) 65%,
      rgba(0, 0, 0, 0.14) 100%
    );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 0 rgba(0, 0, 0, 0.14),
      inset 1px 0 0 rgba(255, 255, 255, 0.12),
      inset -1px 0 0 rgba(0, 0, 0, 0.08),
      0 2px 5px rgba(0, 0, 0, 0.18);
    background-color: inherit;
    color: inherit;
  }
}

/* ── 状态修饰符 ──────────────────────────────────────────────────────────── */

/* 拖拽排序中 */
.row__keycap--move {
  cursor: move !important;
}

/* 自定义边框高亮（使用 outline 避免影响布局） */
.row__keycap--border {
  outline: var(--nt-kb-border-width) solid var(--nt-kb-border-color);
}

/* 按下态（popup 点击书签 / widget 键盘按下） */
.row__keycap--active {
  /* 按压位移随 base size 等比缩放 */
  transform: translate(0px, var(--nt-kb-active-translate-y));
  filter: brightness(0.92);
  transition:
    transform 60ms cubic-bezier(0.3, 0.8, 0.4, 0.6),
    filter 60ms ease,
    box-shadow 60ms ease;

  &.row__keycap-gmk {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.4),
      0 0px 1px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  &.row__keycap-dsa {
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.36),
      0 0px 1px rgba(0, 0, 0, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  &.row__keycap-flat {
    box-shadow:
      0 0px 1px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
}

/* 悬停态（--hover 是外层显式加的，gmk/dsa 自身也有 hover 增强） */
.row__keycap--hover:hover,
.row__keycap-gmk:hover,
.row__keycap-dsa:hover,
.row__keycap-flat:hover {
  transform: translate(0px, -1px);
  /* 同时提升亮度和对比度，在深色键帽上也能获得明显的 hover 感知 */
  filter: brightness(1.06) contrast(1.05);
}

.row__keycap--hover:hover.row__keycap-gmk,
.row__keycap-gmk:hover {
  box-shadow:
    0 5px 12px rgba(0, 0, 0, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.row__keycap--hover:hover.row__keycap-dsa,
.row__keycap-dsa:hover {
  box-shadow:
    0 5px 10px rgba(0, 0, 0, 0.44),
    0 2px 3px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.row__keycap--hover:hover.row__keycap-flat,
.row__keycap-flat:hover {
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* 预览模式（设置面板使用）：hover 不触发 filter / box-shadow 变化 */
.row__keycap--preview:hover {
  transform: translate3d(0px, -1px, 0);
  filter: none !important;
  box-shadow: inherit;
}

/* 覆盖各型别 hover 对 filter / box-shadow 的影响，保持型别自身 shadow */
.row__keycap--preview.row__keycap-gmk:hover {
  filter: none !important;
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.row__keycap--preview.row__keycap-dsa:hover {
  filter: none !important;
  box-shadow:
    0 3px 7px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.row__keycap--preview.row__keycap-flat:hover {
  filter: none !important;
  box-shadow:
    0 2px 5px rgba(0, 0, 0, 0.22),
    0 1px 2px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

/* 原生 :active（无需外层控制的默认点击反馈） */
.row__keycap-gmk:active {
  transform: translateY(var(--nt-kb-active-translate-y));
  filter: brightness(0.92);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.4),
    0 0px 1px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.row__keycap-dsa:active {
  transform: translateY(var(--nt-kb-active-translate-y));
  filter: brightness(0.92);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.36),
    0 0px 1px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.row__keycap-flat:active {
  transform: translateY(calc(var(--nt-kb-active-translate-y) * 0.6));
  filter: brightness(0.94);
  box-shadow:
    0 0px 1px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
</style>
