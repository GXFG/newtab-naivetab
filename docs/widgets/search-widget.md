# Search Widget 设计与实现

## 概述

Search Widget 是 NaiveTab 的搜索组件，支持多搜索引擎切换、自定义搜索引擎、多引擎搜索建议（跟随当前搜索引擎）、玻璃质感下拉列表等功能。本文档记录其架构决策、特殊设计、以及常见踩坑点。

---

## 1. 架构概览

### 1.1 数据流

```
用户输入
  │
  ├─ handleSearchInput → 显示下拉 + 触发防抖建议请求
  │
  ├─ getSearchSuggestHandler (300ms debounce)
  │    └─ 根据 localConfig.search.urlName 匹配引擎
  │         └─ getSearchSuggestion(label, suggestUrl, keyword)
  │              └─ state.suggestList = 前 6 条结果
  │
  ├─ handleSearchKeydown
  │    ├─ Enter → onSearch()
  │    └─ ArrowUp/Down → 键盘导航建议项
  │
  └─ onSearch()
       ├─ 新标签页打开 → createTab(searchUrl)
       └─ 当前标签页打开 → window.location.href = searchUrl
```

### 1.2 模块关系

```
src/newtab/widgets/search/
├── config.ts          # WIDGET_CODE、WIDGET_CONFIG、TWidgetConfig
├── index.ts           # 元数据注册
├── index.vue          # Widget 组件（核心逻辑 + 样式）

src/setting/panes/search/
└── index.vue          # 设置面板

src/logic/constants/search.ts    # SEARCH_ENGINE_LIST（搜索引擎列表 + suggestUrl）
src/api/search.ts                # getBaiduSugrec + getSearchSuggestion（统一建议 API）
```

---

## 2. 核心设计决策

### 2.1 多引擎搜索建议跟随

**决策：** `getSearchSuggest` 根据 `localConfig.search.urlName` 匹配当前搜索引擎，调用对应引擎的 suggest API。

**原因：** 扩展的 `host_permissions: ['*://*/*']` 声明允许 Content Script 跨域调用任意 URL，不受 CORS 限制。因此可以直接 fetch 各引擎的 suggestion 接口。

**覆盖范围：**

| 引擎 | suggest API | 返回格式 |
|------|------------|---------|
| Baidu | `sugrec?prod=pc&wd=xxx` | `{"g":[{q:"..."}]}` |
| Bing | `api.bing.com/osjson.aspx?query=xxx&json=1` | `["query", ["词1","词2"]]` |
| Google | `suggestqueries.google.com/complete/search?client=chrome&q=xxx` | `["query", ["词1","词2"]]` |
| DuckDuckGo | `duckduckgo.com/ac/?q=xxx&type=list` | `[{phrase:"..."}]` |
| Yandex | `suggest.yandex.com/suggest-ff.cgi?part=xxx` | `["query", ["词1","词2"]]` |
| Sogou | `w.sugg.sogou.com/sugg/ajaj_json?key=xxx&type=web` | `["query", ["词1","词2"]]` |
| 360 | `sug.so.360.cn/suggest?word=xxx` | `{"result":[{"word":"..."}]}` |
| Github / Qwant / Yahoo / 自定义 | 无 suggestUrl | 回退百度 |

**新增引擎时需同步补充 `suggestUrl` 字段，否则回退到百度。**

### 2.2 自定义下拉建议列表

下拉建议列表为手动实现，不依赖第三方组件。原因：
- Teleport 组件不继承父级 CSS 变量
- 需要完全定制玻璃质感样式（backdrop-filter、伪元素高光）
- 键盘导航与 input 事件有冲突

自定义下拉列表通过 `Transition` + `v-if` 控制显隐，配合 `onClickOutside`（VueUse）关闭。

### 2.3 onClickOutside 绑定 null ref

```ts
const dropdownRef = ref<HTMLElement | null>(null)

onClickOutside(dropdownRef, () => {
  state.isSuggestVisible = false
})
```

`dropdownRef` 初始值为 `null`（下拉框由 `v-if` 控制渲染）。VueUse `onClickOutside` 安全处理 null ref：
- ref 为 null 时不触发回调
- 回调中 `state.isSuggestVisible = false` 是幂等操作——下拉未显示时赋值 false 无副作用

### 2.4 防抖策略

`useDebounceFn(getBaiduSuggest, 300)` — 用户输入后 300ms 才发送建议请求。这个延迟偏保守，目的是减少无效 API 调用频率。如果后续发现响应延迟感明显，可缩短到 150-200ms。

### 2.5 键盘导航与 input 事件冲突处理

键盘上下键导航时会同时修改 `searchValue`，这会触发 `input` 事件，导致 `currSuggestIndex` 被重置。

解决方式：
1. `handleSearchKeydown` 中设置 `isSuggestSelecting = true`，阻止默认光标移动
2. `handleSearchInput` 中通过 `isSuggestSelecting` 标志拦截，只在非键盘导航触发的 input 事件中才重置 index
3. 更新 `searchValue` 后使用 `setTimeout(350ms)` 延迟重置标志，确保覆盖 debounce(300ms) + watcher 执行窗口

```ts
// keydown 中设置 isSuggestSelecting = true
state.isSuggestSelecting = true
state.searchValue = state.suggestList[state.currSuggestIndex].label
// 350ms 延迟覆盖 debounce(300ms) + watcher 执行，防止 watcher 中 isSuggestSelecting 过早被重置
setTimeout(() => {
  state.isSuggestSelecting = false
}, 350)

// input 中通过标志位拦截
if (state.isSuggestSelecting) {
  return
}
state.currSuggestIndex = -1
```

---

## 3. 样式系统

### 3.1 玻璃质感（Glassmorphism）

Search Widget 采用玻璃光感设计，核心元素：

| 层 | 实现 | 作用 |
|----|------|------|
| 容器底色 | `backdrop-filter: blur() saturate(1.4)` | 毛玻璃模糊 + 色彩饱和 |
| `::before` | 渐变内高光 | 左上角玻璃反射光晕 |
| `::after` | 顶部 1px 连接线 | 高光线，增强立体感 |
| 内容区 | `position: relative; z-index: 1` | 确保内容不被高光层遮挡 |

### 3.2 CSS 变量体系

Search Widget 定义了 16 个 CSS 变量（`--nt-s-xxx`），全部由 `getStyleField()` 生成：

```
--nt-s-font-family / font-color / font-size     # 输入框字体
--nt-s-padding                                   # 输入框内边距
--nt-s-width / height                            # 容器总宽度 / 高度
--nt-s-border-radius / border-width / color       # 边框
--nt-s-background-color / background-blur         # 背景
--nt-s-shadow-color                                # 阴影
--nt-s-dropdown-radius / opacity                   # 下拉框
--nt-s-dropdown-font-family / color / size         # 下拉框字体
```

其中 `--nt-s-width` 作用于 `.search__container` 控制容器总宽度，输入框通过 `width: 100%` + flex 自适应剩余空间，下拉框通过 `width: 100%` 与容器对齐。

### 3.3 color-mix 兼容性

下拉背景使用 `color-mix(in srgb, ...)` 动态混合透明度：

```css
background: color-mix(in srgb, rgb(30, 30, 30) calc(var(--nt-s-dropdown-opacity) * 100%), transparent);
```

此特性需 Chrome 115+，本扩展 manifest 最小版本已满足要求，无需 fallback。

### 3.4 CSS 嵌套深度

搜索输入框使用 NTInput 组件，样式覆盖通过 `.reka-input__native` 类，嵌套深度在规范范围内。

### 3.5 深色模式

深色模式下下拉框使用更亮的底色（`rgb(50, 50, 50)` vs 浅色 `rgb(30, 30, 30)`），增强对比度。通过 `:root[data-theme='dark'] &` 选择器覆盖。

---

## 4. 错误处理

### 4.1 搜索建议 API

```ts
try {
  const engine = SEARCH_ENGINE_LIST.find(e => e.label === localConfig.search.urlName)
  const results = await getSearchSuggestion(engine?.label ?? 'Baidu', engine?.suggestUrl, state.searchValue)
  state.suggestList = results.map(label => ({ label, key: label })).slice(0, 6)
} catch {
  state.suggestList = []
} finally {
  state.isSuggestLoading = false
}
```

`finally` 确保无论 API 成功、失败还是超时，`isSuggestLoading` 都会被重置。

### 4.2 搜索引擎 favicon 外部请求

`SEARCH_ENGINE_LIST` 中的图标直接引用外部 favicon URL（如 `https://www.google.com/favicon.ico`）。如果对应网站不可达，图标会显示为空白。Setting 面板中的 `searchSelectRenderLabel` 通过 `display: option.icon ? 'auto' : 'none'` 处理缺失情况。

---

## 5. 常见踩坑点

### 5.1 v-for key 使用 item.key

下拉建议项的 `:key="item.key"` 中 `key` 与 `label` 值相同（均为搜索词文本）。各搜索引擎 suggest API 返回的结果已服务端去重，实际不会出现 key 冲突。

### 5.2 搜索跳转后状态清理

`onSearch` 中新标签页打开后立即清空 `searchValue`，同时设置 `isSearching = true` 显示 loading 状态，600ms 后自动清除。这确保用户切回 newtab 时不会看到残留的搜索词。

### 5.3 拖拽模式下清空输入

`handleSearchInput` 开头检查 `isDragMode`，拖拽模式下直接清空搜索值并 return，防止拖拽过程中输入内容被意外修改。

### 5.4 模板 ref 必须显式声明

在 Vue 3 `<script setup>` 中，模板中的 `ref="xxx"` 必须在 script 中有对应的 `const xxx = ref()` 声明。未声明的模板 ref 会被静默忽略（不报错也不绑定），导致代码阅读者误以为该 ref 可用。

```vue
<!-- ❌ 错误：只有模板属性，没有 script 声明 -->
<template>
  <NTInput ref="inputRef" />
</template>

<!-- ✅ 正确：script 中声明对应 ref -->
<script setup lang="ts">
const inputRef = ref<InstanceType<typeof NTInput> | null>(null)
</script>

<template>
  <NTInput ref="inputRef" />
</template>
```

如果某个 ref 当前不需要使用，应从模板中删除，避免误导。

---

## 6. 搜索引擎列表

当前支持的搜索引擎（定义在 `src/logic/constants/search.ts`）：

| 名称 | 搜索 URL | 建议 API |
|------|----------|---------|
| Baidu | `https://www.baidu.com/s?word={query}` | ✅ sugrec |
| Bing | `https://cn.bing.com/search?q={query}` | ✅ osjson |
| Google | `https://www.google.com/search?q={query}` | ✅ chrome client |
| Github | `https://github.com/search?q={query}` | 回退百度 |
| Qwant | `https://www.qwant.com/?q={query}` | 回退百度 |
| Duckduckgo | `https://duckduckgo.com?q={query}` | ✅ ac |
| Yandex | `https://yandex.com/search?text={query}` | ✅ suggest-ff |
| Yahoo | `https://search.yahoo.com/search?p={query}` | 回退百度 |
| Sogou | `https://www.sogou.com/web?query={query}` | ✅ sugg |
| 360 | `https://www.so.com/s?q={query}` | ✅ sug.so |

自定义搜索引擎需使用 `{query}` 作为查询参数占位符，如 `https://example.com/search?q={query}`，无 suggestUrl 时自动回退百度。
