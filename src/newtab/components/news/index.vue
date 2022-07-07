<template>
  <MoveableComponentWrap componentName="news" @drag="(style) => (dragStyle = style)">
    <div v-if="isRender" id="news" data-target-type="1" data-target-name="news">
      <div
        class="news__container"
        :style="dragStyle || containerStyle"
        :class="{
          'news__container--border': localConfig.news.isBorderEnabled,
          'news__container--shadow': localConfig.news.isShadowEnabled,
        }"
      >
        <div class="news__wrap">
          <NTabs type="segment" animated justify-content="space-evenly" @update:value="handleChangeCurrTab">
            <NTabPane v-for="source in selectNewsSourceList" :key="source.value" :name="source.value" :tab="source.label">
              <div class="news__content">
                <div v-for="(item, index) in newsState[source.value] && newsState[source.value].list" :key="item.desc" class="content__item">
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
                    :class="{
                      'row__content--hover': !isDragMode,
                    }"
                    :title="item.desc"
                    @click="onOpenPage(item.url)"
                  >
                    <p class="content__desc">
                      {{ item.desc }}
                    </p>
                    <p class="content__hot">
                      {{ item.hot }}
                    </p>
                  </div>
                </div>
              </div>
            </NTabPane>
          </NTabs>
        </div>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<script setup lang="ts">
import {
  isDragMode,
  createTab,
  globalState,
  localConfig,
  newsState,
  getIsComponentRender,
  getLayoutStyle,
  getStyleField,
  updateNews,
  refreshNews,
} from '@/logic'

const CNAME = 'news'
const isRender = getIsComponentRender(CNAME)

const selectNewsSourceList = computed(() =>
  localConfig.news.sourceList.map((key: string) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

const handleChangeCurrTab = (value: string) => {
  globalState.currNewsTabValue = value
}

const onOpenPage = (url: string) => {
  if (isDragMode.value) {
    return
  }
  createTab(url)
}

onMounted(() => {
  updateNews()
})

// 开启主开关后立即更新数据
watch(isRender, (value) => {
  if (!value) {
    return
  }
  refreshNews()
})

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customMargin = getStyleField(CNAME, 'margin', 'px')
const customWidth = getStyleField(CNAME, 'width', 'px')
const customHeight = getStyleField(CNAME, 'height', 'px')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customFontActiveColor = getStyleField(CNAME, 'fontActiveColor')
const customBackgroundActiveColor = getStyleField(CNAME, 'backgroundActiveColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

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
      // segment
      .n-tabs .n-tabs-rail {
        background-color: transparent !important;
        .n-tabs-tab-wrapper .n-tabs-tab.n-tabs-tab--active {
          background-color: v-bind(customBackgroundActiveColor) !important;
        }
      }
      // line bottom border
      .n-tabs .n-tabs-nav.n-tabs-nav--line-type .n-tabs-nav-scroll-content {
        border-bottom: v-bind(customBorderWidth) solid v-bind(customBorderColor) !important;
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
          margin: v-bind(customMargin) 0;
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
          .row__content--hover:hover {
            color: v-bind(customFontActiveColor);
            cursor: pointer;
          }
        }
      }
    }
  }
  .news__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .news__container--shadow {
    box-shadow: v-bind(customShadowColor) 0px 2px 4px 0px, v-bind(customShadowColor) 0px 2px 16px 0px;
  }
}
</style>
