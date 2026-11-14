<script setup lang="ts">
/**
 * MonthPicker — 万年历顶栏的年月选择器
 *
 * ## 为什么不是两个 NTSelect
 *
 * 12 个月是**固定、已知、无搜索需求**的集合，下拉最有价值的三件事（选项不定长、
 * 省空间、可搜索）在这里一样都用不上；代价却是顶栏最中央的位置被一个带边框的
 * 表单控件占着，月份反而不像标题。改成「标题按钮 + 弹层网格」后：
 *
 * - 月份一行即可读完，标题能放大到 1.15em，视觉上是日历的头而不是表单字段
 * - 12 个格子位置固定，靠空间记忆点击（想跳 11 月就往右下角点），不用在列表里扫字
 * - 年份从「201 项下拉」变成「12 年一页的网格」——原来从 2026 滚到 1990 要划很久，
 *   Reka Select 的 typeahead 又只按首字符匹配（全都以 1/2 开头，等于没有）
 *
 * ## 交互模型：立即提交，没有草稿态
 *
 * 翻年、点年、点月都直接 emit，父组件的日历当场跟着变。弹层相当于「日历的遥控器」
 * 而不是「先选好再确认」的表单 —— 与 iOS / macOS 的日期选择一致，也避免了
 * 「年份改了但没点月份算不算生效」的二义性。点月份后关闭，点年份后留在弹层里继续选月。
 *
 * ## 键盘
 *
 * 网格用 roving focus：方向键按 4 列移动、Home/End 到首尾，Enter/空格由 <button>
 * 原生触发。没有用 role="grid" —— 那套 ARIA 要求 row/gridcell 的完整结构，
 * 半套反而更糟，这里用 role="group" + 每个格子的 aria-current。
 */
import { Icon } from '@iconify/vue/offline'
import NTPopover from '@/components/ui/NTPopover.vue'
import { ICONS } from '@/logic/constants/icons'

const props = defineProps<{
  year: number
  month: number
  /** 12 个月份短名，由父组件按当前语言给出（1 月起） */
  labels: string[]
  minYear: number
  maxYear: number
  disabled?: boolean
  /** 弹层渲染在 Portal 中，拿不到 widget 上的 CSS 变量，需显式透传 */
  popoverStyle?: Record<string, string>
}>()

const emit = defineEmits<{
  select: [year: number, month: number]
}>()

/** 年份网格一页 12 年：3 行 × 4 列，与月份网格同列数 */
const YEAR_PAGE_SIZE = 12

const open = ref(false)
const panel = ref<'month' | 'year'>('month')
const yearPageStart = ref(props.minYear)
const panelEl = ref<HTMLElement | null>(null)

const titleText = computed(() =>
  window.$t('calendar.yearMonthTitle', {
    year: props.year,
    month: props.labels[props.month - 1],
  }),
)

/**
 * 标题的占位串 —— 让标题宽度与「当前是哪个月」无关。
 *
 * 否则 1月 → 12月 多一位数字，标题一宽，左右箭头就被顶得横移：
 * 翻月是连点操作，箭头不能在鼠标底下跑。
 *
 * 做法：12 个月各生成一条「最宽年份 + 该月」的串，全部堆进同一个网格单元格，
 * 格子宽度 = 这 12 条里最宽的那条，于是标题框恒定。用网格堆叠而不是给
 * `min-width` 写死 em：字体、字号、语言都可配，写死的数值一定会在某个组合下不够
 * 或留白过多，而隐藏串量出来的就是这套字体下的真实宽度。
 *
 * 年份取 8888 而不是真实年份：数字字形里 8 基本是最宽的，用它当上界，
 * 换年（1xxx / 2xxx）时框宽也不会动。
 */
const WIDEST_YEAR = 8888
const sizerTitles = computed(() =>
  props.labels.map((label) =>
    window.$t('calendar.yearMonthTitle', { year: WIDEST_YEAR, month: label }),
  ),
)

const monthPanelLabel = computed(() => window.$t('calendar.pickerMonthLabel'))
const yearPanelLabel = computed(() => window.$t('calendar.pickerYearLabel'))
/** 同一个按钮在两个面板里干的是两件事：翻一年 / 翻一页（12 年），标签要跟着说 */
const prevLabel = computed(() =>
  window.$t(
    panel.value === 'year'
      ? 'calendar.pickerPrevPage'
      : 'calendar.pickerPrevYear',
  ),
)
const nextLabel = computed(() =>
  window.$t(
    panel.value === 'year'
      ? 'calendar.pickerNextPage'
      : 'calendar.pickerNextYear',
  ),
)

const alignPage = (year: number) =>
  props.minYear +
  Math.floor((year - props.minYear) / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE

const pageYears = computed(() =>
  Array.from(
    { length: YEAR_PAGE_SIZE },
    (_, i) => yearPageStart.value + i,
  ).filter((y) => y >= props.minYear && y <= props.maxYear),
)

const pageLabel = computed(
  () => `${pageYears.value[0]}–${pageYears.value[pageYears.value.length - 1]}`,
)

/** 年份网格走到头就置灰，避免「点了没反应」 */
const canPrev = computed(() =>
  panel.value === 'year'
    ? yearPageStart.value > props.minYear
    : props.year > props.minYear,
)
const canNext = computed(() =>
  panel.value === 'year'
    ? yearPageStart.value + YEAR_PAGE_SIZE <= props.maxYear
    : props.year < props.maxYear,
)

/** 打开后把焦点放到当前项上，键盘用户不必先 Tab 一圈 */
const focusActive = () => {
  nextTick(() => {
    const selector =
      panel.value === 'month'
        ? `[data-month="${props.month}"]`
        : `[data-year="${props.year}"]`
    panelEl.value?.querySelector<HTMLButtonElement>(selector)?.focus()
  })
}

watch(open, (isOpen) => {
  if (!isOpen) return
  panel.value = 'month'
  focusActive()
})

/**
 * 打开 / 关闭弹层。
 *
 * 模板上必须写 `.stop`：这个按钮在 NTPopover 的 PopoverTrigger **内部**，而 Reka 给
 * 触发器绑了 `onClick: onOpenToggle`。真实点击时，浏览器在两个监听器之间会做一次
 * microtask checkpoint，Vue 正好把 `open = true` 刷进去；等事件冒泡到触发器，
 * Reka 读到的 open 已经是 true，于是又翻回 false —— 表现就是「闪一下就没」。
 * 从 JS 里 `el.dispatchEvent(...)` 或 `trigger('click')` 不会有这次 checkpoint，
 * 所以单测发现不了，只有真人点才会复现。拦住冒泡后，开关只剩这里一个。
 */
const toggle = () => {
  if (props.disabled) return
  open.value = !open.value
}

const step = (delta: number) => {
  if (panel.value === 'year') {
    yearPageStart.value = Math.min(
      Math.max(yearPageStart.value + delta * YEAR_PAGE_SIZE, props.minYear),
      props.maxYear,
    )
    return
  }
  emit('select', props.year + delta, props.month)
}

const showYearPanel = () => {
  yearPageStart.value = alignPage(props.year)
  panel.value = 'year'
  focusActive()
}

const showMonthPanel = () => {
  panel.value = 'month'
  focusActive()
}

const pickMonth = (month: number) => {
  emit('select', props.year, month)
  open.value = false
}

const pickYear = (year: number) => {
  emit('select', year, props.month)
  showMonthPanel()
}

/**
 * 方向键在网格里移动焦点。
 *
 * roving focus 而不是给每个格子加 tabindex：24 个格子全进 Tab 序列会把
 * widget 的键盘路径撑得很长。索引从 currentTarget 里现查，省掉一份 ref 数组。
 */
const onGridKeydown = (e: KeyboardEvent) => {
  const keys = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ]
  if (!keys.includes(e.key)) return

  const cells = Array.from(
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '[data-cell]',
    ),
  )
  const index = cells.indexOf(e.target as HTMLButtonElement)
  if (index < 0) return
  e.preventDefault()

  const offsetMap = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -4,
    ArrowDown: 4,
  }
  const offset =
    offsetMap[e.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'] ??
    0
  const next =
    e.key === 'Home'
      ? 0
      : e.key === 'End'
        ? cells.length - 1
        : Math.min(cells.length - 1, Math.max(0, index + offset))
  cells[next]?.focus()
}
</script>

<template>
  <NTPopover
    v-model:show="open"
    trigger="manual"
    placement="bottom"
    :style="popoverStyle"
  >
    <template #trigger>
      <button
        type="button"
        class="picker__title"
        :disabled="disabled"
        :aria-expanded="open"
        :aria-label="titleText"
        aria-haspopup="dialog"
        @click.stop="toggle"
      >
        <span class="title__text">
          <span
            v-for="sizer in sizerTitles"
            :key="sizer"
            class="title__sizer"
            aria-hidden="true"
            >{{ sizer }}</span
          >
          <span class="title__value">{{ titleText }}</span>
        </span>
        <span class="title__caret">
          <Icon :icon="ICONS.chevronDown" />
        </span>
      </button>
    </template>

    <div
      ref="panelEl"
      class="picker"
      role="dialog"
      :aria-label="panel === 'month' ? monthPanelLabel : yearPanelLabel"
    >
      <div class="picker__head">
        <button
          type="button"
          class="picker__nav"
          :disabled="!canPrev"
          :aria-label="prevLabel"
          @click="step(-1)"
        >
          <Icon :icon="ICONS.angleLeft" />
        </button>

        <button
          v-if="panel === 'month'"
          type="button"
          class="picker__year"
          @click="showYearPanel"
        >
          {{ year }}
        </button>
        <span
          v-else
          class="picker__year picker__year--static"
          >{{ pageLabel }}</span
        >

        <button
          type="button"
          class="picker__nav"
          :disabled="!canNext"
          :aria-label="nextLabel"
          @click="step(1)"
        >
          <Icon :icon="ICONS.angleRight" />
        </button>
      </div>

      <div
        v-if="panel === 'month'"
        class="picker__grid"
        role="group"
        :aria-label="monthPanelLabel"
        @keydown="onGridKeydown"
      >
        <button
          v-for="(label, index) in labels"
          :key="label"
          type="button"
          data-cell
          :data-month="index + 1"
          class="grid__cell"
          :class="{ 'grid__cell--active': index + 1 === month }"
          :aria-current="index + 1 === month ? 'true' : undefined"
          @click="pickMonth(index + 1)"
        >
          {{ label }}
        </button>
      </div>

      <div
        v-else
        class="picker__grid picker__grid--year"
        role="group"
        :aria-label="yearPanelLabel"
        @keydown="onGridKeydown"
      >
        <button
          v-for="item in pageYears"
          :key="item"
          type="button"
          data-cell
          :data-year="item"
          class="grid__cell"
          :class="{ 'grid__cell--active': item === year }"
          :aria-current="item === year ? 'true' : undefined"
          @click="pickYear(item)"
        >
          {{ item }}
        </button>
      </div>
    </div>
  </NTPopover>
</template>

<style scoped>
/* 标题：不是表单控件，所以无边框无底色，只保留可点击的 hover 反馈 */
.picker__title {
  all: unset;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  /* 与左右箭头同高（箭头是 2.4vmin），否则标题会把整行撑高 */
  min-height: 2.4vmin;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  font-size: calc(var(--nt-cal-customFontSize) * 1.15);
  font-weight: 600;
  color: var(--nt-cal-customFontColor);
  transition: background-color 150ms ease-in-out;
}
.picker__title:hover {
  background-color: var(--nt-gray-moderate);
}
.picker__title:disabled {
  cursor: move;
  opacity: 0.6;
}
.picker__title:focus-visible {
  outline: 2px solid var(--nt-primary-color);
  outline-offset: -2px;
}

/* 标题文字区的宽度由「最宽的那条占位串」决定，当前月份只影响显示内容。
   数字开等宽（tabular-nums），换年时 2026 → 2027 的字形推进量也一致。
   文字居中：整块宽度是钉死的，所以居中只会让「1月」比「12月」多出左右各 4px 余白，
   左右箭头不受影响。*/
.title__text {
  display: inline-grid;
  font-variant-numeric: tabular-nums;
}
.title__text > * {
  grid-area: 1 / 1;
  justify-self: center;
}
.title__sizer {
  visibility: hidden;
}
.title__caret {
  display: flex;
  align-items: center;
  font-size: 0.62em;
  opacity: 0.45;
}

/* 弹层：宽度按 4 列网格定，字号跟随 widget 字号但略小一档 */
.picker {
  width: 184px;
  font-size: calc(var(--nt-cal-customFontSize, 13px) * 0.92);
  color: var(--nt-cal-customFontColor, inherit);
}
.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.picker__nav {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 150ms ease-in-out;
}
.picker__nav:hover {
  background-color: var(--nt-gray-moderate);
}
.picker__nav:disabled {
  opacity: 0.3;
  cursor: default;
}
.picker__nav:disabled:hover {
  background-color: transparent;
}
.picker__nav:focus-visible {
  outline: 2px solid var(--nt-primary-color);
  outline-offset: -2px;
}
.picker__year {
  all: unset;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.08em;
  font-weight: 600;
}
.picker__year:hover {
  background-color: var(--nt-gray-moderate);
}
.picker__year:focus-visible {
  outline: 2px solid var(--nt-primary-color);
  outline-offset: -2px;
}
.picker__year--static {
  cursor: default;
}
.picker__year--static:hover {
  background-color: transparent;
}

.picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px;
}
.grid__cell {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 150ms ease-in-out;
}
.grid__cell:hover {
  background-color: var(--nt-gray-moderate);
}
.grid__cell:focus-visible {
  outline: 2px solid var(--nt-primary-color);
  outline-offset: -2px;
}
/* 当前月/年：用格子上「今天」的同一支背景色，让弹层和日历是一套配色 */
.grid__cell--active {
  background-color: var(--nt-cal-customTodayItemBackgroundColor);
  font-weight: 600;
}
</style>
