<script setup lang="ts">
import { gaProxy } from '@/logic/utils/gtag'
import { createTab } from '@/logic/utils/common'
import { isDragMode } from '@/logic/moveable'
import {
  state,
  newsLocalState,
  updateNews,
  onRetryNews,
  handleWatchNewsConfigChange,
} from '@/newtab/widgets/news/logic'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import NTTabs from '@/components/ui/NTTabs.vue'
import NTTabsPane from '@/components/ui/NTTabsPane.vue'
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
  localConfig.news.sourceList.map((key: NewsSources) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

const handleChangeCurrTab = (value?: NewsSources | string | number) => {
  if (isDragMode.value || !value) {
    return
  }
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
      <div class="news__wrap">
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
            <div
              class="news__content"
              :class="{
                'news__content--hover': !isDragMode,
              }"
            >
              <template
                v-if="
                  newsLocalState[source.value] &&
                  newsLocalState[source.value].list.length !== 0
                "
              >
                <div
                  v-for="(item, index) in newsLocalState[source.value] &&
                  newsLocalState[source.value].list"
                  :key="item.desc"
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

                  <NTPopover
                    :delay="300"
                    trigger="hover"
                    :disabled="isDragMode"
                    :style="newsPopoverStyle"
                  >
                    <template #trigger>
                      <div
                        class="row__content"
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
                    </template>
                    <span>{{ item.desc }}</span>
                  </NTPopover>
                </div>
              </template>
              <div
                v-else
                class="content__empty"
              >
                <NTButton
                  type="primary"
                  variant="secondary"
                  size="small"
                  round
                  @click="onRetryNews(source.value)"
                >
                  {{ $t('news.loginOrRefresh') }}
                </NTButton>
              </div>
            </div>
          </NTTabsPane>
        </NTTabs>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#news {
  font-family: var(--nt-n-font-family);
  user-select: none;
  .news__container {
    z-index: 10;
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
      .news__content {
        height: var(--nt-n-height);
        color: var(--nt-n-font-color);
        font-size: var(--nt-n-font-size);
        overflow-y: scroll;
        box-sizing: border-box;
        &::-webkit-scrollbar {
          display: none;
        }
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
          .reka-popover__trigger {
            width: 100%;
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
          justify-content: center;
          align-items: center;
          height: var(--nt-n-height);
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
