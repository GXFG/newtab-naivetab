<script setup lang="ts">
import { gaProxy } from '@/logic/utils/gtag'
import { createTab } from '@/logic/utils/common'
import { NEWS_SOURCE_MAP } from '@/logic/constants/urls'
import { isDragMode } from '@/logic/moveable'
import {
  state,
  newsLocalState,
  validNewsSourceList,
  updateNews,
  onRetryNews,
  handleWatchNewsConfigChange,
  isSourceLoading,
  isSourceAuthError,
} from '@/newtab/widgets/news/logic'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import NTTabs from '@/components/ui/NTTabs.vue'
import NTTabsPane from '@/components/ui/NTTabsPane.vue'
import NTScrollArea from '@/components/ui/NTScrollArea.vue'
import { WIDGET_CODE } from './config'

const customMargin = getStyleField(WIDGET_CODE, 'margin', 'vmin')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customUrlActiveColor = getStyleField(WIDGET_CODE, 'urlActiveColor')
const customTabActiveBackgroundColor = getStyleField(
  WIDGET_CODE,
  'tabActiveBackgroundColor',
)
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')

const newsStyle = computed(() => ({
  '--nt-n-margin': customMargin.value,
  '--nt-n-width': customWidth.value,
  '--nt-n-height': customHeight.value,
  '--nt-n-font-family': customFontFamily.value,
  '--nt-n-font-color': customFontColor.value,
  '--nt-n-font-size': customFontSize.value,
  '--nt-n-border-radius': customBorderRadius.value,
  '--nt-n-border-width': customBorderWidth.value,
  '--nt-n-border-color': customBorderColor.value,
  '--nt-n-url-active-color': customUrlActiveColor.value,
  '--nt-n-tab-active-background-color': customTabActiveBackgroundColor.value,
  '--nt-n-background-color': customBackgroundColor.value,
  '--nt-n-shadow-color': customShadowColor.value,
  '--nt-n-background-blur': customBackgroundBlur.value,
}))

// NTPopover 是 teleport 组件，不继承父级 CSS 变量，需显式传宽度
const newsPopoverStyle = computed(() => ({
  width: customWidth.value,
  lineHeight: '1.5',
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

const selectNewsSourceList = computed(() =>
  // 只渲染受支持的来源，配置里残留的未知键（如 'reddit'）不生成 tab
  validNewsSourceList.value.map((key) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

/** 取来源的缓存列表：未知来源或数据未就绪时返回空数组，避免取属性抛错 */
const getSourceList = (source: NewsSources): NewsListItem[] =>
  newsLocalState.value[source]?.list || []

const handleChangeCurrTab = (value?: NewsSources | string | number) => {
  if (isDragMode.value || !value) {
    return
  }
  // 切换来源后旧条目的提示不再有意义
  closeTooltip()
  state.currNewsTabValue = value as NewsSources
  gaProxy('click', ['news', 'changeTab'])
}

const onOpenPage = (url: string) => {
  if (isDragMode.value) {
    return
  }
  createTab(url)
  gaProxy('click', ['news', 'openPage'])
}

const onMouseDownKey = (event: MouseEvent, url: string) => {
  // 拖动模式下不干预事件冒泡，让 body 的 mousedown 监听器能收到事件以启动拖拽
  if (isDragMode.value) {
    return
  }
  // 阻止默认行为（例如浏览器中键的滚轮模式切换）
  event.preventDefault()
  // 阻止事件冒泡（仅非拖动模式，防止影响拖拽事件链）
  event.stopPropagation()
  if (event.button !== 1) {
    return
  }
  // 按下鼠标中键
  createTab(url, false)
}

// 完整标题提示：整个 widget 共用一层 Popover，锚点跟随当前悬停的新闻条目。
// 不能每个条目各用一个 Popover——行间移动时旧实例关闭、新实例打开，中间的空档
// 会表现为提示抖动；共用一层则只切换锚点与文案，内容不卸载、不重播动画。
/** 指针进入条目后延迟展示，避免扫视时闪出提示 */
const TOOLTIP_OPEN_DELAY = 300
/** 离开条目/提示后的关闭延迟，留出移到相邻条目的时间 */
const TOOLTIP_CLOSE_DELAY = 200

const tooltipAnchor = ref<HTMLElement>()
const tooltipDesc = ref('')
const isTooltipOpen = ref(false)
let tooltipOpenTimer: ReturnType<typeof setTimeout> | null = null
let tooltipCloseTimer: ReturnType<typeof setTimeout> | null = null

const clearTooltipOpenTimer = () => {
  if (tooltipOpenTimer) {
    clearTimeout(tooltipOpenTimer)
    tooltipOpenTimer = null
  }
}

const clearTooltipCloseTimer = () => {
  if (tooltipCloseTimer) {
    clearTimeout(tooltipCloseTimer)
    tooltipCloseTimer = null
  }
}

const closeTooltip = () => {
  clearTooltipOpenTimer()
  clearTooltipCloseTimer()
  isTooltipOpen.value = false
}

const scheduleCloseTooltip = () => {
  clearTooltipOpenTimer()
  clearTooltipCloseTimer()
  tooltipCloseTimer = setTimeout(() => {
    isTooltipOpen.value = false
  }, TOOLTIP_CLOSE_DELAY)
}

const cancelCloseTooltip = () => {
  clearTooltipCloseTimer()
}

const onNewsItemEnter = (event: MouseEvent, desc: string) => {
  if (isDragMode.value) {
    return
  }
  cancelCloseTooltip()
  tooltipAnchor.value = event.currentTarget as HTMLElement
  tooltipDesc.value = desc
  // 已展示时只跟随锚点，不重新计时也不重建，保证行间移动连贯
  if (isTooltipOpen.value) {
    return
  }
  clearTooltipOpenTimer()
  tooltipOpenTimer = setTimeout(() => {
    isTooltipOpen.value = true
  }, TOOLTIP_OPEN_DELAY)
}

watch(isDragMode, (value) => {
  if (value) {
    closeTooltip()
  }
})

let newsConfigChangeHandle: ReturnType<
  typeof handleWatchNewsConfigChange
> | null = null

onMounted(() => {
  updateNews()
  newsConfigChangeHandle = handleWatchNewsConfigChange()
})

onUnmounted(() => {
  if (newsConfigChangeHandle) {
    newsConfigChangeHandle()
  }
  clearTooltipOpenTimer()
  clearTooltipCloseTimer()
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  updateNews()
})
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="news__container"
      :style="newsStyle"
      :class="{
        'news__container--border': localConfig.news.isBorderEnabled,
        'news__container--shadow': localConfig.news.isShadowEnabled,
      }"
    >
      <div
        class="news__wrap"
        @scroll.capture="closeTooltip"
      >
        <NTTabs
          :value="state.currNewsTabValue"
          animated
          justify-content="space-evenly"
          @update:value="handleChangeCurrTab"
        >
          <NTTabsPane
            v-for="source in selectNewsSourceList"
            :key="source.value"
            :name="source.value"
            :tab="source.label"
          >
            <NTScrollArea
              class="news__content"
              :class="{
                'news__content--hover': !isDragMode,
              }"
              @mouseleave="scheduleCloseTooltip"
            >
              <template v-if="getSourceList(source.value).length !== 0">
                <div
                  v-for="(item, index) in getSourceList(source.value)"
                  :key="index"
                  class="content__item"
                  :class="{
                    'content__item--hover': !isDragMode,
                  }"
                >
                  <p
                    class="row__index"
                    :class="{
                      row__index__1: index === 0,
                      row__index__2: index === 1,
                      row__index__3: index === 2,
                    }"
                  >
                    {{ index + 1 }}
                  </p>

                  <div
                    class="row__content"
                    @mouseenter="onNewsItemEnter($event, item.desc)"
                    @click="onOpenPage(item.url)"
                    @mousedown="onMouseDownKey($event, item.url)"
                  >
                    <p class="content__desc">
                      {{ item.desc }}
                    </p>
                    <p class="content__hot">
                      {{ item.hot }}
                    </p>
                  </div>
                </div>
              </template>
              <div
                v-else
                class="content__empty"
              >
                <p v-if="isSourceLoading(source.value)">
                  {{ $t('news.loading') }}
                </p>
                <template v-else-if="isSourceAuthError(source.value)">
                  <p class="content__empty-tip">
                    {{ $t('news.needLogin').split('__source__')[0] }}
                    <button
                      class="content__empty-link"
                      @click="createTab(NEWS_SOURCE_MAP[source.value], true)"
                    >
                      {{ $t(`news.${source.value}`) }}
                    </button>
                    {{ $t('news.needLogin').split('__source__')[1] }}
                  </p>
                  <NTButton
                    type="primary"
                    variant="secondary"
                    size="small"
                    round
                    @click="onRetryNews(source.value)"
                  >
                    {{ $t('news.tapToRetry') }}
                  </NTButton>
                </template>
                <NTButton
                  v-else
                  type="primary"
                  variant="secondary"
                  size="small"
                  round
                  @click="onRetryNews(source.value)"
                >
                  {{ $t('news.tapToRetry') }}
                </NTButton>
              </div>
            </NTScrollArea>
          </NTTabsPane>
        </NTTabs>

        <!-- 整个 widget 共用一层完整标题提示，锚点跟随当前悬停的条目 -->
        <NTPopover
          trigger="manual"
          :show="isTooltipOpen"
          :reference="tooltipAnchor"
          :style="newsPopoverStyle"
          @update:show="isTooltipOpen = $event"
        >
          <template #trigger>
            <div class="news__tooltip-anchor" />
          </template>
          <span
            class="news__tooltip-text"
            @mouseenter="cancelCloseTooltip"
            @mouseleave="scheduleCloseTooltip"
          >
            {{ tooltipDesc }}
          </span>
        </NTPopover>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#news {
  font-family: var(--nt-n-font-family);
  user-select: none;
  .news__container {
    z-index: var(--nt-z-index);
    position: absolute;
    border-radius: var(--nt-n-border-radius);
    background-color: var(--nt-n-background-color);
    backdrop-filter: blur(var(--nt-n-background-blur));
    overflow: hidden;
    will-change: transform;
    /* 显式触发合成层，配合 overflow:hidden + border-radius 消除边缘竖向闪烁 */
    transform: translateZ(0);

    .news__wrap {
      width: var(--nt-n-width);
      /* Widget 自定义 tab 容器背景色，融入 Widget 背景 */
      .reka-tabs__list {
        margin: var(--nt-n-margin);
        background-color: var(--nt-n-background-color);
      }
      /* Widget 自定义 tab 字号 */
      .reka-tabs__trigger {
        font-size: var(--nt-n-font-size);
      }
      /* Widget 自定义 pill 背景色，未配置时回退白色 */
      .reka-tabs__indicator {
        background-color: var(--nt-n-tab-active-background-color, white);
      }
      /* 提示的隐藏锚点：实际定位基准由 NTPopover 的 reference 提供 */
      .news__tooltip-anchor {
        position: absolute;
        width: 0;
        height: 0;
        pointer-events: none;
      }
      /* 提示内容铺满面板宽度，指针停在提示上时保持显示 */
      .news__tooltip-text {
        display: block;
      }
      .news__content {
        height: var(--nt-n-height);
        color: var(--nt-n-font-color);
        font-size: var(--nt-n-font-size);
        box-sizing: border-box;
        .content__item {
          display: flex;
          align-items: center;
          padding: var(--nt-n-margin);
          width: 100%;
          border-radius: 6px;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
          box-sizing: border-box;
          .row__index {
            width: 28px;
            flex: 0 0 28px;
            font-weight: 700;
            text-align: center;
            font-size: 0.85em;
            line-height: 1;
          }
          .row__index__1 {
            color: #fe2d46;
          }
          .row__index__2 {
            color: #f60;
          }
          .row__index__3 {
            color: #faa90e;
          }
          .row__content {
            flex: 1;
            min-width: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 6px;
            .content__desc {
              flex: 1;
              min-width: 0;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              line-height: 1.4;
            }
            .content__hot {
              flex: 0 0 auto;
              font-size: 0.8em;
              opacity: 0.5;
              white-space: nowrap;
            }
          }
        }
        .content__item--hover:hover {
          color: var(--nt-n-url-active-color);
          background-color: var(--nt-n-tab-active-background-color);
          cursor: pointer;
        }
        .content__empty {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          height: var(--nt-n-height);
        }
        .content__empty-link {
          all: unset;
          display: inline;
          color: var(--nt-primary-color);
          cursor: pointer;
          text-decoration: underline;
        }
      }
      .news__content--hover:hover {
        cursor: default;
      }
    }
  }
  .news__container--border {
    border: var(--nt-n-border-width) solid var(--nt-n-border-color);
  }
  .news__container--shadow {
    box-shadow:
      var(--nt-n-shadow-color) 0px 2px 4px 0px,
      var(--nt-n-shadow-color) 0px 2px 16px 0px;
  }
}
</style>
