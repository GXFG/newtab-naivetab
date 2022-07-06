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
          <div class="news__tabs">
            <p
              v-for="item in selectNewsOriginList"
              :key="item.value"
              class="tabs__item"
              :class="{
                'tabs__item--active': item.value === globalState.currNewsTabValue,
              }"
              @click="handleChangeCurrTab(item.value)"
            >
              {{ item.label }}
            </p>
          </div>
          <div ref="contentEl" class="news__content">
            <div
              v-for="(item, index) in newsState[globalState.currNewsTabValue] && newsState[globalState.currNewsTabValue].list"
              :key="item.desc"
              class="content__item"
            >
              <p
                class="item__index"
                :class="{
                  item__index__1: index === 0,
                  item__index__2: index === 1,
                  item__index__3: index === 2,
                }"
              >
                {{ index + 1 }}
              </p>
              <p
                class="item__url"
                :class="{
                  'item__url--hover': !isDragMode,
                }"
                :title="item.desc"
                @click="onOpenPage(item.url)"
              >
                {{ item.desc }}
              </p>
            </div>
          </div>
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

const selectNewsOriginList = computed(() =>
  localConfig.news.originList.map((key: string) => ({
    label: window.$t(`news.${key}`),
    value: key,
  })),
)

const contentEl = ref()

const handleChangeCurrTab = (value: string) => {
  globalState.currNewsTabValue = value
  contentEl.value.scrollTo(0, 0)
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
const customItemActiveColor = getStyleField(CNAME, 'activeColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
</script>

<style scoped>
#news {
  font-family: v-bind(customFontFamily);
  user-select: none;
  .news__container {
    z-index: 10;
    position: absolute;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    .news__wrap {
      padding: 8px;
      width: v-bind(customWidth);
      .news__tabs {
        padding-bottom: 8px;
        display: flex;
        justify-content: space-around;
        align-items: center;
        .tabs__item {
          padding: 4px 8px;
          color: v-bind(customFontColor);
          font-size: v-bind(customFontSize);
          font-weight: 500;
          border-radius: 3px;
          cursor: pointer;
        }
        .tabs__item--active {
          background-color: v-bind(customItemActiveColor);
        }
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
          .item__index {
            min-width: 18px;
            font-weight: 500;
            text-align: center;
          }
          .item__index__1 {
            color: #fe2d46;
          }
          .item__index__2 {
            color: #f60;
          }
          .item__index__3 {
            color: #faa90e;
          }
          .item__url {
            margin-left: 8px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .item__url--hover:hover {
            cursor: pointer;
            color: #2440b3;
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
