# 资讯 Widget：多来源热榜的数据层

> 每个来源的接口、解析选择器和失效原因都写在 `src/newtab/widgets/news/logic.ts` 顶部与各 `get*News` 函数的注释里；本文只记录「读单个文件看不全」的部分。

## 1. 三份状态，三种生命周期

| 状态 | 载体 | 生命周期 | 进云同步？ |
|------|------|----------|-----------|
| `localConfig.news.*` | `c-news`（`useStorageLocal`） | 永久 | 是 |
| `newsLocalState` | `data-news`（`useStorageLocal`） | 直到下次抓取覆盖 | 否 |
| `authErrorSources` / `loadingCounts` | 模块内 `reactive` | 页面生命周期 | 否 |

**Why 缓存不进云同步**：热榜是分钟级数据，同步它既撑大 `chrome.storage.sync` 配额（单字段有硬上限），又会让两台设备互相覆盖对方的抓取结果——A 刚拉完微博，B 的旧数据就把 A 盖掉。反过来**配置必须同步**，否则换台设备要重新勾一遍来源。

这份划分是「配置 / 缓存 / UI 瞬态」三分的具体体现，不是随手的实现选择：把 `newsLocalState` 挪进 `localConfig` 会同时破坏配额和覆盖顺序。

## 2. 来源键的三层白名单

`localConfig.news.sourceList` 是持久化 + 云同步 + 可导入的数组，所以它**一定会**出现当前版本不认识的键：旧版本的实验来源、手工编辑过的配置、别处导入的备份。

唯一真源是 `NEWS_SOURCE_MAP`（`src/logic/constants/urls.ts`），它同时也决定设置面板的默认展示顺序。所有取值点必须先过 `isNewsSource` / `filterValidNewsSources`。

三个必须过滤的位置：

1. `state.currNewsTabValue` 的**初值**——否则首帧就指向一个不存在的 tab，面板空白
2. 渲染 tab 与拉取数据用的 `validNewsSourceList`——直接读 `sourceList` 会在 `newsLocalState.value[source]` 上取到 `undefined`
3. 设置面板的顺序调整

漏掉的后果不是「少一个 tab」，而是**渲染报错 + 未捕获 Promise 拒绝**同时发生：模板读 `undefined.list`，抓取协程读 `undefined.syncTime`。

`normalizeNewsSourceList` 与 `filterValidNewsSources` 的区别在于**要不要写回**：前者只在确有非法键时改写配置（幂等），目的是让修正随云同步传播出去，避免未知键在设备之间来回传染；后者是只读过滤，用在每次渲染的热路径上。两个都要有，不能合并。

## 3. 抓取方式分三类

| 类别 | 来源 | 特点 |
|------|------|------|
| 官方 JSON API | B站、头条、36氪、Hacker News | 字段名稳定，站点改版不受影响 |
| 内部 JSON API | 百度、知乎 | 页面自己用的接口，非公开承诺，相对稳定 |
| HTML 解析 | 微博、V2EX、GitHub Trending | 无可用 JSON 接口，只能用 `DOMParser` |

**Why 没有 cheerio**：2026-07-10（v2.6.3）移除。只为解析三个页面就引入整套选择器实现，而浏览器自带 `DOMParser`，是当时最大的一笔无用依赖。

**代价要记住**：HTML 解析对结构变化零防御——站点改版后 `querySelectorAll` 返回空集合，函数正常返回、`catch` 不触发，结果是**列表静默变空**而不是报错。所以新增来源时优先找 JSON 接口：JSON 有字段名契约，HTML 只有 class 名。这也解释了为什么微博、V2EX 的接口选择在注释里写得很细：那些是「试过官方接口、发现不可用」之后的结论，不是随手抓的页面。

**知乎是唯一依赖用户登录态的源**。它的 JSON 接口需要浏览器里已登录知乎的 Cookie，未登录返回 401/403。代码把 401/403 单独识别成 `authErrorSources` 标记而不是普通失败，界面据此提示「先登录」。这意味着**这个源的可用性本质上由知乎的登录策略决定**，不是本项目能修的——把它当 bug 排查会白费时间。

## 4. 刷新时机：没有轮询

只在三处触发：

1. 组件挂载（`onMounted`）
2. 主开关从关到开（`watch(isRender)`）
3. 来源列表变更（`handleWatchNewsConfigChange`）

没有 `setInterval`、也没有 `addTimerTask`。**Why**：新标签页常驻，定时器不会因为「用户没在看」停下来；而热榜本身在服务端就有缓存，多拉一次只是多消耗一次配额。真要按时间失效，判断放在 `updateNews` 里做——每个源用自己的 `syncTime` 与 `refreshIntervalTime` 比较，**逐源独立**。所以增删来源只会拉缺的那几个，不会全量重抓。

## 5. 反直觉的地方

**tab 顺序曾经不等于 `sourceList` 顺序。** `NTTabs` 的触发器渲染自 `NTTabsPane` 的**注册顺序**（setup 时 push），而 pane 的顺序由调用方 `v-for` 决定。重排时 key 未变的实例被复用、setup 不重跑，注册顺序就停在旧值上（2026-11-04 修）。现在的做法是 `NTTabsPane` 额外渲染一个 `hidden` 的 `[data-nt-pane]` 顺序锚点，`NTTabs` 在 `onUpdated` 里按 DOM 顺序重排。**改 NTTabs 时别把那个 `hidden` span 当冗余删掉**——删掉不报错，只是重排失效，回到「切了顺序没反应」的老 bug。

**loading 用引用计数而不是布尔。** 手动重试与自动刷新可能同时对一个源发起 fetch，布尔标记会被先返回的那个清零，界面出现「加载中 → 空列表 → 突然有数据」的抖动。`loadingCounts` 归零才视为完成。

**36氪按当天日期拼 URL。** 当天榜单未生成时返回 404，属正常现象不是故障；官方接口给的是 24h 榜单，条目数比页面抓取少。这是拿「稳定」换「多」的取舍。

**V2EX 走 HTML 而不是官方 `hot.json`。** 因为该接口固定只返回很少几条，已弃用。同样是「试过才这么选」。

**微博热度里的「爆」没有数字。** 直接取数会产出 `NaNw`，所以先判断是否纯数字，不是就取空格后半段，仍无法解析则跳过该行。

## 6. 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/constants/urls.ts` | `NEWS_SOURCE_MAP`（来源键唯一真源）+ 白名单函数 |
| `src/newtab/widgets/news/logic.ts` | 抓取、解析、缓存、刷新判定、tab 校正 |
| `src/newtab/widgets/news/config.ts` | 默认配置（启用状态、默认来源、刷新间隔） |
| `src/newtab/widgets/news/index.vue` | 渲染、加载/登录提示、重试入口 |
| `src/setting/panes/news/index.vue` | 来源勾选与顺序 |
| `src/components/ui/NTTabs.vue` | tab 顺序锚点重排 |

抓取异常统一 `console.warn` 后返回，不弹 toast：一个源挂掉不该打断用户，静默保留上一次缓存比弹出错误更有用。
