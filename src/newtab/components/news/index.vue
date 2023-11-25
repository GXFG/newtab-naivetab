<script setup lang="ts">
import { gaProxy } from '@/logic/gtag'
import { createTab } from '@/logic/util'
import { isDragMode } from '@/logic/moveable'
import { newsLocalState, updateNews, onRetryNews } from '@/logic/news'
import { globalState, localConfig, getIsComponentRender, getLayoutStyle, getStyleField, getStyleConst } from '@/logic/store'

const CNAME = 'news'
const isRender = getIsComponentRender(CNAME)

const selectNewsSourceList = computed(() =>
  localConfig.news.sourceList.map((key: NewsSources) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

const handleChangeCurrTab = (value: NewsSources) => {
  globalState.currNewsTabValue = value
  gaProxy('click', ['news', 'changeTab'])
}

const onOpenPage = (url: string) => {
  if (isDragMode.value) {
    return
  }
  createTab(url)
  gaProxy('click', ['news', 'openPage'])
}

const onMouseDownKey = (e: MouseEvent, url: string) => {
  if (e.button !== 1) {
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
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  updateNews()
})

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customMargin = getStyleField(CNAME, 'margin', 'vmin')
const customWidth = getStyleField(CNAME, 'width', 'vmin')
const customHeight = getStyleField(CNAME, 'height', 'vmin')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'vmin')
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customUrlActiveColor = getStyleField(CNAME, 'urlActiveColor')
const customTabActiveBackgroundColor = getStyleField(CNAME, 'tabActiveBackgroundColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')

const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="news"
  >
    <div
      v-if="isRender"
      id="news"
      data-target-type="1"
      data-target-name="news"
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
            :value="globalState.currNewsTabValue"
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
  </MoveableComponentWrap>
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
        .n-tabs-tab-wrapper .n-tabs-tab.n-tabs-tab--active {
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
      background-color: v-bind(bgMoveableComponentMain) !important;
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
