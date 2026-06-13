# Reka UI 组件开发规范

## 概述

[Reka UI](https://reka-ui.com/llms.txt) 是 NaiveTab 使用的无样式交互组件库，只提供 WAI-ARIA 无障碍和交互逻辑（键盘导航、focus 管理、state 切换等）。所有视觉样式由项目自行定义。

**阅读** https://reka-ui.com/llms.txt

**核心原则：交互逻辑归 reka-ui，视觉样式归 `src/styles/reka/`，业务封装归 `components/ui/`。**

**设计语言：** 融合 iOS 26 + macOS 26 风格 — macOS 的桌面端紧凑比例 + iOS 的滑块立体阴影和弹簧动效。Switch 为参考模板，后续组件保持一致。

## 设计原则

从 Switch 组件打磨过程中提炼出 6 条通用设计原则，**每个 Reka 组件都必须遵守**：

| # | 原则 | 具体做法 | CSS 手段 |
|---|------|----------|----------|
| 1 | **立体层次** | 容器凹、指示器凸。用内阴影表示"被填充的空间"，用多层投影表示"浮起的物体" | 容器 `box-shadow: inset ...`，指示器多层 `box-shadow` |
| 2 | **局部反馈** | 交互只改变被操作元素自身，不缩放/移动整体容器 | `:active` 只改指示器尺寸/颜色，容器 `<transform: none>` |
| 3 | **环境光着色** | 选中态时指示器的阴影染上主题色，模拟环境光反射 | `box-shadow` 中用 `color-mix(in srgb, var(--nt-primary-color) 30%, ...)` |
| 4 | **通透质感** | 填充态用微渐变替代纯色，模拟曲面/管道的光线折射 | `background: linear-gradient(180deg, 微亮→微暗)`，差值 < 10% |
| 5 | **双模式自适应** | 每一条视觉规则都要回答"深色模式下对吗"。浅色用黑半透阴影，深色用白半透 | 内阴影在 `:root[data-theme='dark']` 下换为 `rgba(255,255,255,...)`；指示器降纯 |
| 6 | **弹簧律动** | 不同组件用不同弹簧参数，但共用一个曲线家族。启动快、有回弹、不拖沓 | Switch 用 `--transition-switch`，Toggle/Checkbox 可共用或微调 |

**Token 抽象策略：** 当前 Switch 的阴影/光环值经过精细调校，暂不抽象为通用 Token。等第二个组件（Checkbox/Toggle）实现时再提取公共部分——两条原则后再抽象，避免过早泛化导致其他组件"套不上"。

### 深色模式防遗漏

这是最容易出错的环节。浅色模式下的 `rgba(0,0,0,...)` 阴影在深色背景上**完全不可见**，导致组件"贴平"，立体层次消失。

**每写一个 CSS 属性，自问三个问题：**

1. 这个值在深色背景下看得见吗？（`rgba(0,0,0,0.15)` → 看不见 ❌）
2. 如果看不见，应换成什么？（`rgba(255,255,255,0.08)` → 微光环抱 ✅）
3. 指示器的颜色需要降纯吗？（纯白 `#fff` → `#f0f0f0` ✅）

**深色模式必须覆盖的属性清单：**

| 属性 | 浅色值模式 | 深色值模式 | 原因 |
|------|-----------|-----------|------|
| 容器内阴影 | `rgba(0,0,0, 0.04~0.06)` | `rgba(255,255,255, 0.04~0.06)` | 黑阴影在深色背景不可见 |
| 指示器投影 | `rgba(0,0,0, 0.06~0.15)` | `rgba(255,255,255, 0.06~0.10)` | 同上，深度感需白色微光替代 |
| 指示器背景色 | `white` / `#fff` | `#f0f0f0` | 纯白在暗背景过于刺眼 |
| 阴影中的 `color-mix` | `...%, rgba(0,0,0, 0.15)` | `...%, rgba(255,255,255, 0.10)` | 着色阴影的基底色也要切换 |

**CSS 结构约定：** 每个组件区块末尾统一放置深色模式覆盖，使用以下固定头部注释，方便 review 时快速扫描：

```css
/* ============================================================
 * 深色模式覆盖（原则5：双模式自适应）
 *
 * 核心规则：浅色用黑半透阴影（暗影深度），深色用白半透阴影（微光环抱）。
 *   黑色阴影在深色背景上不可见，必须切换为白色通道。
 * ============================================================ */
```

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/styles/reka/` | Reka 组件样式目录（一个组件一个文件，对标 Radix Themes） |
| `src/styles/reka/common.css` | 共享规则（焦点环 + forced-colors） |
| `src/styles/reka/index.css` | 聚合入口 |
| `src/styles/reka-template.css` | 新组件 CSS 模板（copy-paste → 填空，不参与编译，唯一权威） |
| `src/styles/tokens.css` | 设计 Token（`--reka-*` 交互变量、`--nt-gray-*` 中性灰等） |
| `src/components/ui/NTSwitch.vue` | Switch 组件封装（参考实现） |
| `docs/architecture/reka-ui.md` | 本文档 |
| `docs/architecture/reka-ui-migration.md` | Naive UI → Reka UI 迁移计划与进度追踪 |

## 架构分层

```
┌──────────────────────────────────────────┐
│  components/ui/NT*.vue                   │  ← Vue 封装（props、v-model、插槽）
├──────────────────────────────────────────┤
│  reka-ui (SwitchRoot, SwitchThumb...)    │  ← 无样式交互逻辑（WAI-ARIA）
├──────────────────────────────────────────┤
│  styles/reka/*.css                       │  ← 视觉样式（一个组件一个文件）
├──────────────────────────────────────────┤
│  styles/tokens.css                       │  ← 设计 Token（颜色、间距、过渡）
└──────────────────────────────────────────┘
```

## Vue 组件封装模式

新增 Reka 组件时，在 `src/components/ui/` 下创建 `NT*.vue`，遵循以下模板：

```vue
<script setup lang="ts">
/**
 * NT{Name} — NaiveTab {Name} 组件
 *
 * 基于 Reka UI {RootComponent} 二次封装。
 * 样式由 src/styles/reka/{name}.css 中的 .reka-{name} 系列类控制，
 * 支持浅色/深色模式自动切换。
 *
 * @example
 * <NT{Name} v-model:value="enabled" />
 * <NT{Name} v-model:value="enabled" disabled />
 */
import { {Root}, {Child} } from 'reka-ui'

defineProps<{
  disabled?: boolean
}>()

const checked = defineModel<boolean>('value', { required: true })
</script>

<template>
  <{Root}
    v-model="checked"
    :disabled="disabled"
    class="reka-{name} reka-focus-visible"
  >
    <{Child} class="reka-{name}__{child}" />
  </{Root}>
</template>
```

**规则：**
- 文件名 `NT{Name}.vue`，组件名自动推导
- `v-model` 参数名统一用 `value`（与 Naive UI API 保持一致）
- Root 元素绑定 `class="reka-{name} reka-focus-visible"`（焦点环统一使用共享 class）
- 自定义状态用 `data-*` 属性（如 `data-loading`），不用 class
- 禁止在组件 `<style>` 中写样式，所有样式统一在 `src/styles/reka/{name}.css`

## CSS 命名与结构

### 命名约定

BEM 命名，以 `.reka-` 为前缀：

```
.reka-{component}               → 组件根元素
.reka-{component}__{element}    → 子元素
.reka-{component}--{variant}    → 变体（暂未使用）
```

### 状态覆盖模板

每个组件的 CSS 按以下顺序覆盖（后出现的优先级更高）。**每个状态注释必须包含设计意图，而不仅仅是"做什么"。**

```css
/* ============================================================
 * {Name} 组件样式
 *
 * 状态覆盖顺序：
 *   base → hover → active → focus-visible → checked → disabled → loading
 *
 * 设计意图速查：
 *   base     → 尺寸 + 凹槽内阴影（原则1：立体层次）
 *   hover    → 底色深一档 + 外侧微光环（原则1：层次递进）
 *   active   → 仅指示器形变，容器不动（原则2：局部反馈）
 *   checked  → 主题色微渐变 + 指示器阴影染色（原则3+4：光着色+通透）
 *   disabled → 整体降透明度，阴影打薄（原则1：层次退化）
 *   loading  → 指示器呼吸脉冲，与 disabled 视觉区分
 *   dark     → 内阴影换白色通道，指示器降纯（原则5：双模式自适应）
 * ============================================================ */

/* 1. base — 尺寸 + 凹槽内阴影（原则1：容器凹陷） */
.reka-{name} {
  /* 几何变量：改 --{name}-size 联动所有尺寸（对标 Radix Themes 变量链） */
  --{name}-size: 16px;

  all: unset;
  display: inline-block;  /* ① 必须：覆盖 all:unset 的 display:inline */
  outline: none;  /* ② 必须：禁止浏览器默认 focus outline */
  box-sizing: border-box;  /* ③ 必须：border 含在宽高内 */
  flex-shrink: 0;  /* ④ 必须：flex 容器中不压缩 */
  position: relative;
  width: var(--{name}-size);
  height: var(--{name}-size);
  border-radius: var(--radius-pill);
  background-color: var(--nt-gray-medium);            /* 未选中底色 */
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06),  /* 凹槽顶边阴影 */
              inset 0 0 0 0.5px rgba(0, 0, 0, 0.04); /* 凹槽边缘发丝 */
  transition: background-color var(--transition-bg),     /* 背景 120ms——最快 */
              box-shadow var(--transition-shadow);       /* 阴影 140ms——稍慢 */
  cursor: var(--reka-cursor-interactive);
}

/* 2. hover — 底色微深 + 外侧微光环（原则1：层次递进）。
   必须加 :not(:disabled)：disabled 元素不应响应交互反馈。 */
.reka-{name}:not(:disabled):hover {
  background-color: var(--nt-gray-heavy);             /* 比 base 深一档 */
  box-shadow: /* 继承 base 内阴影 + 外侧光环 */;
}

/* 3. active — 仅指示器形变（原则2：局部反馈，容器不动）。
   必须加 :not(:disabled)，禁止 disabled 状态响应 press 反馈。 */
.reka-{name}:not(:disabled):active {
  /* 容器不缩放，只微调底色 */
}
.reka-{name}:not(:disabled):active .reka-{name}__indicator {
  /* 指示器微扩/微缩，模拟按压形变 */
}

/* 4. focus-visible — 键盘焦点环（共享 class，仅 Tab 键触发） */
/* 组件上加 class="reka-focus-visible" → 通用 .reka-focus-visible:focus-visible */

/* 5. checked — 主题色微渐变 + 指示器阴影染上主题色（原则3+4：光着色+通透） */
.reka-{name}[data-state='checked'] {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--nt-primary-color) 92%, white) 0%,   /* 顶部微亮 */
    color-mix(in srgb, var(--nt-primary-color) 100%, black) 100%  /* 底部纯色 */
  );
  box-shadow: /* 凹槽内阴影（比 base 稍轻） */;
}
.reka-{name}[data-state='checked'] .reka-{name}__indicator {
  box-shadow: /* 染上主题色的 raised shadow（原则3） */;
}

/* 6. checked + hover — 主题色微暗 + 主题色光环 */
.reka-{name}[data-state='checked']:hover {
  background-color: color-mix(in srgb, var(--nt-primary-color) 85%, black);
  box-shadow: /* 继承 checked 内阴影 + 主题色外侧光环 */;
}

/* 7. disabled — 整体降透明度，阴影退化（原则1：层次退化） */
.reka-{name}:disabled:not([data-loading]) {
  opacity: var(--opacity-muted);
  cursor: var(--reka-cursor-disabled);
}

/* 8. loading — 指示器脉冲动画（按需实现） */
.reka-{name}[data-loading] {
  cursor: var(--reka-cursor-disabled);
}
.reka-{name}[data-loading] .reka-{name}__indicator {
  animation: reka-{name}-loading-pulse 1.2s ease-in-out infinite;
}

/* 9. 深色模式覆盖（原则5：双模式自适应） */
:root[data-theme='dark'] .reka-{name},
.dark .reka-{name} {
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.04),   /* 内阴影换白色 */
              inset 0 0 0 0.5px rgba(255, 255, 255, 0.06);
}
:root[data-theme='dark'] .reka-{name}__indicator,
.dark .reka-{name}__indicator {
  background-color: #f0f0f0;  /* 指示器降纯，避免暗背景下纯白刺眼 */
}
```

**必须覆盖的状态：** base、hover、active、focus-visible（共享 class）、data-state、disabled。loading 按需实现。深色模式覆盖按组件需要添加.

### Indicator 替代模式

Reka UI 的 Indicator 组件（如 `CheckboxIndicator`、`SwitchThumb`）内部使用 `Presence` 控制 DOM 挂载/卸载，以支持 enter/exit 动画。但在以下场景中，Presence 反而引入问题：

| 场景 | 问题 | 解决方案 |
|------|------|----------|
| 简单 scale/opacity 动画 | Presence 的 mount/unmount 导致布局抖动（元素从"不存在"突然"出现"） | 绕过 Indicator，内容始终渲染在 Root 内，CSS `[data-state]` 控制显隐 |
| 固定尺寸指示器 | Indicator 卸载时 flex 容器重新计算尺寸 | 同上 |

**替代方案（以 Checkbox 勾号为例）：**

```vue
<!-- 不推荐：Presence 卸载 DOM，布局抖动 -->
<CheckboxRoot>
  <CheckboxIndicator>
    <svg class="check" ... />
  </CheckboxIndicator>
</CheckboxRoot>

<!-- 推荐：SVG 始终在 DOM，CSS 控制显隐，无布局变化 -->
<CheckboxRoot>
  <svg class="check" ... />
</CheckboxRoot>
```

```css
/* 始终渲染，默认隐藏 */
.check {
  opacity: 0;
  transform: scale(0);
  transition: opacity var(--transition-fast),
              transform var(--transition-switch);
}
/* data-state 控制显隐 */
.reka-checkbox[data-state='checked'] .check {
  opacity: 1;
  transform: scale(1);
}
```

**是否使用 Indicator 的判断标准：**
- 指示器在两种状态下**视觉尺寸一致**（如 Switch thumb 始终占位）→ 用 Indicator
- 指示器从"无"到"有"（如 Checkbox 勾号）→ 用替代模式
- 需要复杂的 enter/exit 动画（如从一侧滑入）→ 用 Indicator + Presence 动画

### 通用工具类

| Class | 用途 |
|-------|------|
| `.reka-focus-visible:focus-visible` | 键盘焦点环（双层：内圈紧贴 + 外圈 offset 2px），仅 Tab 键触发。对标 shadcn ring-offset 模式 |

共享 class 定义在 `src/styles/reka/common.css`，各组件在 Root 元素上组合引用。`:focus-visible` 伪类确保鼠标点击不显示焦点环。

### 根元素重置

所有可交互的 Reka 根元素和子元素必须 `all: unset`，确保浏览器默认样式不影响自定义视觉。**根元素必须额外添加 4 个属性**：

| 属性 | 值 | 原因 |
|------|-----|------|
| `display` | `inline-block` / `flex` / `block` | `all: unset` 将 `<button>` 等元素的 `display` 重置为 `inline`（CSS 初始值），导致 `width/height` 被忽略。必须显式设置 |
| `outline` | `none` | 禁止浏览器默认 focus outline 在 `:focus`（鼠标点击）时出现 |
| `box-sizing` | `border-box` | `all: unset` 重置为 `content-box`，`width/height` 不含 border/padding，实际渲染尺寸膨胀 |
| `flex-shrink` | `0` | **仅固定尺寸控件**（Switch/Checkbox/Radio）。弹性控件（Slider）不设，否则无法在 flex 容器中收缩 |

```css
.reka-{name} {
  all: unset;
  display: inline-block;  /* 或 flex/block，按需。禁止留空 */
  outline: none;
  box-sizing: border-box;
  flex-shrink: 0;
  /* ... */
}
.reka-{name}__{element} {
  all: unset;
  display: block; /* 子元素通常需要恢复 display */
  /* ... */
}
```

> **为什么 `display` 是必需的：** `<button>` 的浏览器 UA 默认值是 `inline-block`。`all: unset` 将其重置为 CSS 初始值 `inline`。`inline` 元素忽略 `width`/`height`（由内容撑开），导致控件尺寸不可靠。不同浏览器对 form 元素的渲染有差异，不设 `display` 的行为不可预期。

## Token 体系

样式必须使用 `tokens.css` 中的变量，禁止硬编码：

| 用途 | Token | 示例值 |
|------|-------|--------|
| 交互光标 | `var(--reka-cursor-interactive)` | `pointer` |
| 禁用光标 | `var(--reka-cursor-disabled)` | `not-allowed` |
| 按下缩放 | `var(--reka-active-scale)` | `0.92` |
| 中性灰背景 | `var(--nt-gray-heavy)` / `var(--nt-gray-solid)` 等 | — |
| 主题色 | `var(--nt-primary-color)` | — |
| 圆角 | `var(--radius-pill)` / `var(--radius-md)` 等 | — |
| 过渡（背景） | `var(--transition-bg)` | `120ms ease` — 背景/边框色，最快响应 |
| 过渡（阴影） | `var(--transition-shadow)` | `140ms ease` — 深度变化稍慢，层次分明 |
| 过渡（位移） | `var(--transition-switch)` | `280ms cubic-bezier(0.25, 1.1, 0.5, 1)` — 小型控件弹簧（thumb/dot/checkmark） |
| 过渡（面板） | `var(--transition-spring-bounce)` | `280ms cubic-bezier(0.34, 1.56, 0.64, 1)` — 大型面板弹簧（popover/dialog），明显 overshoot |
| 过渡（通用） | `var(--transition-fast)` / `var(--transition-spring)` 等 | — |

**弹簧动画体系（原则6）：** 所有可交互元素必须使用弹簧曲线，禁止 `ease` / `linear`。

| 元素类型 | 使用 Token | overshoot |
|----------|-----------|-----------|
| 小型控件（thumb 滑动、dot 弹出、checkmark、close icon） | `--transition-switch` | 1.1（微弹） |
| 大型面板（popover、dialog、dropdown 进出场） | `--transition-spring-bounce` | 1.56（明显弹跳） |
| 纯色/阴影过渡 | `--transition-bg` / `--transition-shadow` | 无（不需要弹簧） |
| 边框宽度 | `var(--reka-border-width)` | `1.5px` — 全线控件统一边框 |
| 焦点环 | `var(--reka-focus-ring)` | 双层 box-shadow（内圈紧贴 + 外圈 offset） |
| 禁用滤镜 | `var(--reka-disabled-filter)` | `saturate(0.65) brightness(0.92)` — checked+disabled 保色 |
| 阴影 | `var(--shadow-sm)` / `var(--shadow-md)` 等 | — |
| 透明度 | `var(--opacity-muted)` / `var(--opacity-secondary)` | `0.45` / `0.65` |

**颜色规则：**
- 浅色/深色模式自动切换：`var(--nt-primary-color)`、`var(--nt-gray-*)` 已内置双模式值，无需额外处理
- 需要在 checked+hover 等状态微调颜色时，用 `color-mix()` 而非 `rgba(var(), alpha)`
- 白色/黑色常量的使用场景仅限于 thumb 等"在任何主题下都应该是白/黑"的元素。**注意：** 深色模式下 thumb 应使用微灰白（`#f0f0f0`）而非纯白，避免与暗背景反差过大

## 新增 Reka 组件检查清单

0. **🆚 对照标杆** — 打开 [设计参考与标杆](#设计参考与标杆)，依次查看 shadcn/ui 和 Radix Themes 对应组件源码，确认 API 设计和 CSS 变量链，记录差异
1. **创建 `src/components/ui/NT{Name}.vue`** — 按上述模板封装
2. **在 `src/styles/reka/` 创建 `{name}.css`** — 从 `reka-template.css` 复制 + 填空，按状态模板覆盖所有必需状态
3. **绑定 `reka-focus-visible` class** — Root 元素添加共享焦点环 class
4. **`all: unset` 根元素和可交互子元素**
5. **禁止在组件 `<style>` 中写样式** — 全部放入 `src/styles/reka/{name}.css`
6. **不需要手动注册** — `src/components.d.ts` 由 Vite 自动生成
7. **验证浅色/深色模式（逐属性排查）** — 逐条过 [深色模式防遗漏清单](#深色模式防遗漏)：
   - 容器内阴影 → 是否有 `rgba(255,255,255,...)` 深色覆盖？
   - 指示器投影 → 是否有 `rgba(255,255,255,...)` 深色覆盖？
   - 指示器背景色 → 深色下是否降纯（`#fff` → `#f0f0f0`）？
   - `color-mix` 中的 `rgba(0,0,0,...)` 基底 → 深色下是否切换为 `rgba(255,255,255,...)`？
   - 硬编码 `white` / `black` → 深色下是否需要微调？（原则5）
8. **对照设计原则自查** — 逐条过 [设计原则](#设计原则) 6 条，确认无遗漏（立体层次、局部反馈、环境光着色、通透质感、双模式自适应、弹簧律动）
9. **添加 forced-colors 支持** — 组件区块末尾添加 `@media (forced-colors: active)` 规则，使用系统色彩关键字（`Highlight`/`ButtonFace`/`ButtonText`）保证高对比度模式下可用
10. **设置 z-index** — 如果组件包含 Portal Content（下拉面板、弹窗、对话框等），必须在 `__content` / `__overlay` 规则块中设置 `z-index`，值参考 [z-index 层级体系](#z-index-层级体系)

## 现有组件参考

| 组件 | 文件 | Reka Root | 特有状态 |
|------|------|-----------|----------|
| NTSwitch | `components/ui/NTSwitch.vue` | `SwitchRoot` + `SwitchThumb` | loading (`data-loading`) |
| NTCheckbox | `components/ui/NTCheckbox.vue` | `CheckboxRoot` | 内联 SVG 替代 CheckboxIndicator |
| NTRadio / NTRadioGroup | `components/ui/NTRadio.vue` + `NTRadioGroup.vue` | `RadioGroupItem` / `RadioGroupRoot` | `::after` 伪元素内点 |
| NTScrollArea | `components/ui/NTScrollArea.vue` | `ScrollAreaRoot` + `ScrollAreaViewport` + `ScrollAreaScrollbar` + `ScrollAreaThumb` | `type`（hover/always/auto/scroll/glimpse） |
| NTSlider | `components/ui/NTSlider.vue` | `SliderRoot` + `SliderTrack` + `SliderRange` + `SliderThumb` | `number[]` → `number` 桥接 |
| NTTag | `components/ui/NTTag.vue` | 无（纯 CSS） | `closable` / `type` 变体 |
| NTNotice | `components/ui/NTNotice.vue` | 无（纯 CSS） | `type`（warning/info/success/error）/ `bordered` |
| NTPopover | `components/ui/NTPopover.vue` | `PopoverRoot` + `PopoverTrigger` + `PopoverPortal` + `PopoverContent` | `:show` / `trigger` (hover/click/manual) |
| NTPopconfirm | `components/ui/NTPopconfirm.vue` | 基于 NTPopover | `@positive-click` / `@negative-click` |
| NTButton | `components/ui/NTButton.vue` | 无（纯 CSS） | `type` / `size` / `variant` / `loading` |
| NTCard | `components/ui/NTCard.vue` | 无（纯 CSS） | `title` |
| NTTabs / NTTabsPane | `components/ui/NTTabs.vue` + `NTTabsPane.vue` | `TabsRoot` + `TabsList` + `TabsTrigger` + `TabsContent` + `TabsIndicator` | `animated` / `direction` 方向感知 |
| NTDrawer | `components/ui/NTDrawer.vue` | `DialogRoot` | `force-mount` 常驻 DOM + CSS transition 动画 |
| NTModal | `components/ui/NTModal.vue` | `DialogRoot` + `DialogOverlay` + `DialogContent` | `maskClosable` |
| NTSelect / NTSelectItem | `components/ui/NTSelect.vue` + `NTSelectItem.vue` | `SelectRoot` + `SelectContent` 等 | Indicator 固定占位防抖动 |
| NTDropdown | `components/ui/NTDropdown.vue` | `DropdownMenuRoot` + `DropdownMenuContent` | `options` / 插槽模式 |
| NTTooltip | `components/ui/NTTooltip.vue` | `TooltipProvider` + `TooltipRoot` + `TooltipContent` | 400ms 默认延迟 |
| NTAutoComplete | `components/ui/NTAutoComplete.vue` | `ComboboxRoot` + `ComboboxInput` | `ignore-filter` / `loading` 服务端搜索 |
| NTInput | `components/ui/NTInput.vue` | 原生 `<input>` / `<textarea>` | `clearable` / `showCount` / `autosize` |
| NTInputNumber | `components/ui/NTInputNumber.vue` | `NumberFieldRoot` + `NumberFieldInput` + `NumberFieldDecrement` + `NumberFieldIncrement` | `safeValue` / `clamp` |
| NTTree | `components/ui/NTTree.vue` | `TreeRoot` + `TreeItem` + `TreeItemContents` | `blockLine` / `blockNode` / `showLine` / `expandOnClick` |
| NTColorPicker | `components/ui/NTColorPicker.vue` | `ColorArea` + `ColorSlider` + `ColorSwatchPicker`（各 primitive 共享 v-model，未用 ColorRoot） | SV 面板 + 色相条 + 预设色板 |
| NTSpin | `components/ui/NTSpin.vue` | 无（纯 CSS） | `show` 遮罩加载 |
| **NTAccordion** + **NTAccordionItem** | `components/ui/NTAccordion.vue` + `NTAccordionItem.vue` | `AccordionRoot` + `AccordionItem` + `AccordionHeader` + `AccordionTrigger` + `AccordionContent` | `type="single"` 默认、`collapsible` |
| **NTScrollArea** | `components/ui/NTScrollArea.vue` | `ScrollAreaRoot` + `ScrollAreaViewport` + `ScrollAreaScrollbar` + `ScrollAreaThumb` | 自定义滚动条 |

## 设计参考与标杆

开发每个 Reka 组件时，分场景对照行业最佳实践：

### 参考矩阵

| 你要做什么 | 参考谁 | 为什么 | 怎么看 |
|-----------|--------|--------|--------|
| **组件 API 设计**（封装哪些 props） | **shadcn/ui** | Radix 生态最流行封装，API 经过大量项目验证 | [GitHub 源码](https://github.com/shadcn-ui/ui/tree/main/apps/www/registry/default/ui) |
| **CSS 变量链**（几何联动、`--size → translateX`） | **Radix Themes** | 最优雅的 CSS 变量链架构 | [组件源码](https://github.com/radix-ui/themes/tree/main/packages/radix-ui-themes/src/components) |
| **Token 架构**（颜色/间距/阴影命名与分级） | **Radix Themes** gray-a 颜色分级 + **Open Props** 命名规范 | 颜色灰度分级世界最佳；Open Props 命名规范一流 | [Radix Themes tokens](https://github.com/radix-ui/themes) / [Open Props](https://open-props.style/) |
| **交互动画**（弹簧曲线/时长/缓动） | **Apple HIG** | Apple 定义"该怎样"，shadcn 社区提供落地验证 | [HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| **焦点/无障碍**（focus ring/ARIA） | **Radix 内置**（Reka 继承） + **WAI-ARIA** | Radix/Reka 自动处理 ARIA 逻辑，我们只需验证视觉 | [WAI-ARIA 组件模式](https://www.w3.org/WAI/ARIA/apg/patterns/) |
| **深色模式**（CSS 变量切换策略） | **shadcn/ui** `.dark` class 策略 | 和我们的 `:root[data-theme='dark']` 方案一致 | [shadcn Dark Mode](https://ui.shadcn.com/docs/dark-mode) |

### 不参考的

| 候选 | 不推荐理由 |
|------|-----------|
| **Material Design 3** | Token 架构好，但设计哲学差距大（Material 扁平 vs 我们的立体层次） |
| **Ant Design** | Vue 版更新慢，CSS-in-JS 方案和我们 BEM + CSS 变量体系不兼容 |
| **Tailwind UI / Headless UI** | React 优先，Vue 版不成熟；Tailwind 类名和我们的 BEM 命名体系不兼容 |
| **Adobe Spectrum** | 企业级系统，Token 层级过深，对浏览器扩展项目是负担 |

### 开发时对照检查

每开发一个新 Reka 组件，至少过一遍：

1. [ ] 打开 shadcn/ui 对应组件源码，确认 props 设计和 API 风格
2. [ ] 打开 Radix Themes 对应组件源码，确认 CSS 变量链和过渡参数
3. [ ] 确认动画参数在 Apple HIG 建议范围内（弹簧曲线 overshoot < 1.2）
4. [ ] 确认焦点环比对 shadcn 的 `ring-offset` 模式（我们已有 `--reka-focus-ring`）
5. [ ] 确认深色模式覆盖对标 Radix Themes 的 dark 处理

## z-index 层级体系

所有 Reka Portal Content 组件（`SelectContent`、`PopoverContent`、`TooltipContent` 等）渲染到 `document.body`，处于同一堆叠上下文。z-index 必须遵循统一层级，否则会出现下拉面板被遮挡或层级混乱。

### 层级表（从低到高）

| z-index | 组件 | CSS 文件 | 说明 |
|---------|------|----------|------|
| 1000~1300 | Drawer | `drawer.css` | 动态递增（`--drawer-z`），支持嵌套 Setting 面板 |
| 2000 | Modal Overlay | `modal.css` | 对话框遮罩，始终高于 Drawer |
| 2100 | Modal Content | `modal.css` | 对话框内容 |
| **3000** | **Select / AutoComplete** | `select.css` / `auto-complete.css` | 表单下拉面板，高于 Modal |
| 4000 | Dropdown | `dropdown.css` | 右键菜单/下拉菜单，高于表单下拉 |
| 9999 | Popover | `popover.css` | 上下文弹窗 |
| 10000 | Tooltip | `tooltip.css` | 最高层级，浮动于一切之上 |

### 新增组件时如何选择

- **表单控件下拉**（Select、AutoComplete、Combobox）→ **3000**
- **菜单类下拉**（Dropdown、ContextMenu）→ **4000**
- **信息弹窗**（Popover、Popconfirm）→ **9999**
- **提示**（Tooltip）→ **10000**
- **对话框**（Modal）→ Overlay 2000、Content 2100
- **侧边面板**（Drawer）→ 使用动态 `var(--drawer-z, 1000)`，不要硬编码

### 非 Portal 组件不需要全局 z-index

以下组件的 `__content` 是内联渲染（非 Portal），**不需要**设置全局 z-index：
- TabsContent（内联在 TabsRoot 内）
- 所有无 Portal 的交互控件（Switch、Checkbox、Radio、Slider、Button 等）

这些组件的局部层叠使用 `z-index: 0/1` 即可。

## 常见陷阱

### Popper 内容面板禁止 `border`，必须用 `box-shadow`

**问题：** Select、Dropdown 等基于 Reka Popper 定位的内容面板，如果使用 CSS `border`，会在面板尺寸上额外增加 2px（border-box 亦然，border 仍占盒模型空间）。Popper 在测量和定位时会因 `border` 的存在/消失或渲染时序产生宽度抖动，表现为面板展开瞬间的"抽搐"或 hover 后宽度跳变。

**Why：** Popper 通过 JS 动态计算内容面板的 `min-width`（对齐 trigger 宽度）和定位坐标。`border` 属于盒模型的一部分，影响 `getBoundingClientRect()` 的测量值。当 `border` 值变化（如暗色模式切换、hover 伪类触发重绘）或浏览器分批渲染导致 border 先于/后于元素几何出现，Popper 会重新测量→重新定位，形成"宽度坍塌→恢复"的视觉抖动。

**How to apply：**

```css
/* ❌ 错误：border 导致 Popper 定位抖动 */
.reka-panel__content {
  border: 1px solid var(--nt-gray-light);
}

/* ✅ 正确：用 box-shadow 模拟边框，不占盒模型空间 */
.reka-panel__content {
  box-shadow: 0 0 0 1px var(--nt-gray-light),  /* ← hairline edge */
              0 4px 16px rgba(0, 0, 0, 0.08),
              0 1px 4px rgba(0, 0, 0, 0.04);
}
```

`box-shadow: 0 0 0 1px` 视觉完全等同 `border: 1px solid`，但 shadow 在盒模型外部，不参与 Popper 的尺寸测量和位置计算。

**已应用此规则的组件：** NTSelect、NTDropdown

**注意：** 暗色模式下需要用同一规则覆盖 hairline 颜色（如 `var(--nt-gray-light)`），不要额外设置 `border-color`。
