<script setup lang="ts">
import { measureMountedPerf } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'
import { createTab } from '@/logic/util'
import { isDragMode } from '@/logic/moveable'
import { state, newsLocalState, updateNews, onRetryNews } from '@/newtab/widgets/news/logic'
import { localConfig, getIsWidgetRender, getLayoutStyle, getStyleField, getStyleConst } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const selectNewsSourceList = computed(() =>
  localConfig.news.sourceList.map((key: NewsSources) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

const handleChangeCurrTab = (value: NewsSources) => {
  state.currNewsTabValue = value
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
  // 阻止默认行为（例如浏览器中键的滚轮模式切换）
  event.preventDefault()
  // 阻止事件冒泡
  event.stopPropagation()
  if (event.button !== 1) {
    return
  }
  // 按下鼠标中键
  if (isDragMode.value) {
    return
  }
  createTab(url, false)
}

onMounted(() => {
  updateNews()
  measureMountedPerf(WIDGET_CODE)
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  updateNews()
})

const dragStyle = ref('')
const containerStyle = getLayoutStyle(WIDGET_CODE)
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
const customTabActiveBackgroundColor = getStyleField(WIDGET_CODE, 'tabActiveBackgroundColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
</script>

<template>
  <WidgetWrap
    v-model:dragStyle="dragStyle"
    widget-code="news"
  >
    <div
      v-if="isRender"
      id="news"
      data-target-type="widget"
      data-target-code="news"
    >
      <div
        class="news__container"
        :style="dragStyle || containerStyle"
        :class="{
          'news__container--drag': isDragMode,
          'news__container--border': localConfig.news.isBorderEnabled,
          'news__container--shadow': localConfig.news.isShadowEnabled,
        }"
      >
        <div class="news__wrap">
          <NTabs
            :value="state.currNewsTabValue"
            type="segment"
            animated
            justify-content="space-evenly"
            @before-leave="() => !isDragMode"
            @update:value="handleChangeCurrTab"
          >
            <NTabPane
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
                <template v-if="newsLocalState[source.value] && newsLocalState[source.value].list.length !== 0">
                  <div
                    v-for="(item, index) in newsLocalState[source.value] && newsLocalState[source.value].list"
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

                    <n-popover
                      :delay="500"
                      trigger="hover"
                      :style="`width: ${customWidth}; line-height: 1.5;`"
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
                    </n-popover>
                  </div>
                </template>
                <div
                  v-else
                  class="content__empty"
                >
                  <NButton
                    ghost
                    @click="onRetryNews(source.value)"
                  >
                    {{ `${$t('common.login')} / ${$t('common.refresh')}` }}
                  </NButton>
                </div>
              </div>
            </NTabPane>
          </NTabs>
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#news {
  font-family: v-bind(customFontFamily);
  user-select: none;
  .news__container {
    z-index: 10;
    position: absolute;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    .news__wrap {
      width: v-bind(customWidth);
      .n-tabs .n-tab-pane {
        padding: 0 !important;
      }
      /* segment */
      .n-tabs .n-tabs-rail {
        background-color: transparent !important;
        .n-tabs-capsule {
          background-color: v-bind(customTabActiveBackgroundColor) !important;
        }
      }
      /* line bottom border */
      .n-tabs .n-tabs-nav.n-tabs-nav--line-type .n-tabs-nav-scroll-content {
        border-bottom: v-bind(customBorderWidth) solid v-bind(customBorderColor) !important;
      }
      .n-tabs-tab__label {
        font-size: v-bind(customFontSize);
      }
      .news__content {
        height: v-bind(customHeight);
        color: v-bind(customFontColor);
        font-size: v-bind(customFontSize);
        overflow-y: scroll;
        &::-webkit-scrollbar {
          display: none;
        }
        .content__item {
          display: flex;
          align-items: center;
          padding: v-bind(customMargin) 0;
          width: 100%;
          .row__index {
            width: 8%;
            flex: 0 0 auto;
            font-weight: 500;
            text-align: center;
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
            width: 92%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            .content__desc {
              flex: 1;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
            .content__hot {
              flex: 0 0 auto;
              margin: 0 8px;
              opacity: 0.7;
            }
          }
        }
        .content__item--hover:hover {
          color: v-bind(customUrlActiveColor);
        }
        .content__empty {
          display: flex;
          justify-content: center;
          align-items: center;
          height: v-bind(customHeight);
        }
      }
      .news__content--hover:hover {
        cursor: pointer;
      }
    }
  }
  .news__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: v-bind(bgMoveableWidgetMain) !important;
    }
  }
  .news__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .news__container--shadow {
    box-shadow:
      v-bind(customShadowColor) 0px 2px 4px 0px,
      v-bind(customShadowColor) 0px 2px 16px 0px;
  }
}
</style>
