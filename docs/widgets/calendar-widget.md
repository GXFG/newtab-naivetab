# 日历 Widget 数据来源与适配层

> 实现细节见 `src/logic/calendar/index.ts` 与 `src/logic/calendar/subscriptions.ts` 顶部注释；本文只记录"读单个文件看不到"的内容。

## 1. 分层

```
src/newtab/widgets/calendar/index.vue   展示层：布局、样式、交互、加载/失败态
                ↓
src/logic/calendar/index.ts             适配层：全项目唯一依赖日历库的模块
src/logic/calendar/subscriptions.ts     节假日订阅：预设地区 + 自定义地址、拉取、校验、缓存
src/logic/calendar/ics/                 ICS 解析：parse.ts（文本）+ rrule.ts（重复规则）
src/logic/calendar/festivals.ts         通用现代节日表（9 条国际通用规则）
src/logic/calendar/grid.ts              月历网格布局：纯计算，不依赖库与 dayjs
                ↓
tyme4ts                                 农历与黄历（农历月日、宜忌、神煞、干支）
```

**Why：** 节日、节气、休班每年都会变，交给「节假日订阅」（iCalendar）自动更新；tyme4ts 只负责它擅长的历法计算。换库或换订阅源都只改一层。

## 2. 对外 API

| 函数 | 返回 | 消费点 |
|------|------|--------|
| `getDayCell(date, options)` | `{ desc, isFestival, dayType }` | 日期格子、节日倒计时列表 |
| `getDayDetail(date, options)` | `{ weekday, lunar, festivals, constellation, yi, ji, jishen, xiongsha }` | 日期详情 Popover |
| `getFestivalList(startDate, options, days = 365)` | `{ date, offsetDays, desc, dayType }[]` | 节日倒计时列表 |

`options` 为 `ICalendarOptions`：

```ts
{
  subscription: TSubscriptionDayMap | null  // 数据：订阅解析结果；null 表示尚未加载
  includeLocalFestivals: boolean            // 数据：是否补充中文通用节日表
  showLunarTerm: boolean                    // 展示：农历日期与节气
  showAlmanac: boolean                      // 展示：黄历详情（宜、忌、吉神、凶煞）
}
```

`includeLocalFestivals` 由订阅地区决定：只有**中国大陆**（`isMainlandSubscription`）为 true。`festivals.ts` 的条目只有中文名称且多为大陆常用节日，给其它日历补上会很怪；自定义地址同样不补充。

格子与倒计时列表用 `TCalendarCellOptions`（不含 `showAlmanac`）——黄历只出现在详情弹窗，切换黄历开关不会触发格子与列表重算。

由调用方从 `localConfig.calendar.*` + `subscriptionState` 组装传入，**保持适配层为纯函数**。

文案优先级只有适配层这一份实现（格子、详情、倒计时共用）：**订阅节日 → 通用现代节日 → 订阅节气 → 农历月/日**。

`weekday`（0=周日）与 `constellation`（如 `'gemini'`）返回的是**稳定标识**而非中文，由展示层映射到 i18n——避免把库的中文文案泄漏到界面。

`offsetDays` 是距起始日的天数（起始日当天为 0），**不是列表下标**——倒计时列表会跳过无节日节气日期，两者不相等。

## 2.1 三个展示开关

| 开关 | 关掉后 | 默认 |
|------|--------|------|
| 休班标记 `isHolidayMarkVisible` | 格子与倒计时的 休/班 角标消失（节日仍显示）| 开 |
| 农历与节气 `isLunarTermVisible` | 格子第二行在无节日时**留空**（节气日也留空）、详情不显示农历行、倒计时列表不再列出节气 | 开 |
| 黄历详情 `isAlmanacVisible` | 详情弹窗的 宜/忌/吉神/凶煞 四行整体隐藏 | 开 |

设计要点：

- **默认全开**，不与界面语言或其它设置联动——默认值不依赖运行环境，行为可预测、可测试，也不会在升级时改变老用户体验。
- **正交**：订阅管"看哪个日历"，另外三个开关分别管"看不看"。能表达"在美华人 = 要农历 + 订阅美国假日"这类真实组合。
- **格子在文案为空时不会破版**：`.body__item` 是固定正方形 + 垂直居中，空 `<span>` 高度为 0，只有日期数字上移约 0.075vmin。
- **缓存零耦合**：开关只在合成阶段过滤，不影响缓存里的订阅数据。

## 2.2 网格恒定 6 行

格子容器 `.calendar__body__wrap` 的高度是 `格子宽度 × 6`，因此**任何月份都必须铺满 6 行（42 格）**：

- 整 4 周的月份（2 月恰好从一周起始日开始且 28 天，如 2027-02 周一版、2026-02 周日版）只有 28 格
- 整 5 周的月份只有 35 格

两者都要用下月日期补足到 42 格，否则容器底部会空出一到两行。补格逻辑由 [`grid.ts`](../../src/logic/calendar/grid.ts) 的 `getMonthGridPadding()` 统一负责，并有穷举 2020–2035 × 两种周起始的单测锁住不变量。

> 历史坑：早期实现只特判了「35 格 → 补 7」这一种情况，漏了 28 格，导致 2021-02 / 2027-02 底部空两行。

## 2.3 年份范围与跨天校正

**可浏览范围固定 1900–2100**（`newtab/widgets/calendar/config.ts` 的 `CALENDAR_MIN_YEAR` / `CALENDAR_MAX_YEAR`）。箭头翻月、年月下拉、回到今日三条路径共用 `clampYearMonth()`，到端点时箭头置灰（`.item__btn--edge`）；`toYearMonth()` 把年月换算成单调序号，月份传 0 / 13 自动完成 12 进制进位，三处不用各写一遍进位分支。

边界与 `subscriptions.ts` 的 `MIN_PARSE_YEAR` / `MAX_PARSE_YEAR` 相同，由 `calendar-range.test.ts` 锁住——「翻得到的年份」与「可能有节日数据的年份」必须是同一套口径，否则会翻到没有节日、只剩农历的年份，被误认为订阅坏了。

> 下限取 1900 而不是 2000：万年历的高频用途之一是查农历生日，2000 起会挡住 1990 年代及更早出生的人。tyme4ts 在 1900 附近计算正常（实测 1850 / 1900 / 2200 均可返回正确农历），真正的约束是订阅源只覆盖近几年。

**跨天校正**：`todayDayjs` 是 ref 而非 setup 时常量。组件注册 `addDailyTask(WIDGET_CODE, syncToday)`（见 [task.md](../architecture/task.md) 第 5 节），跨天时更新「今天」、重算格子与倒计时。日期比较由 daily 任务统一做，多个 Widget 共享同一次比较，组件自己不再逐秒比日期。

- **为什么不用 `visibilitychange`**：合盖恢复、或标签页一直可见只是窗口失焦时不会触发它，只有共享的 rAF 循环能在恢复后补上这一次。这与下文「刻意不监听 visibilitychange」**不冲突**——那一条针对的是「要不要发网络请求」，这里是「日期基准对不对」
- 用户翻在别的月份时不跟随；只有原本停在「今天所在月」才跟到新的当月
- 禁用时由 `watch(isRender)` 摘掉、组件真被销毁时 `onUnmounted` 兜底，不残留任务

## 2.4 顶栏的年月选择（MonthPicker）

**形态是「标题按钮 + 弹层网格」，不是两个下拉。** 12 个月是固定、已知、无需搜索的集合，下拉最有价值的三件事（选项不定长、省空间、可搜索）一样都用不上；代价却是顶栏最中央的位置被带边框的表单控件占着。改完之后：

- 标题能放大到 `1.15em` 加粗，月份在视觉上成为这一行的主角，而不是「跟年份平级的两个字段」
- 12 个格子位置固定，靠空间记忆点击（跳 11 月就往右下角点），不用在列表里扫字
- 年份从「201 项下拉」变成「12 年一页的网格」。原来从 2026 滚到 1990 要手动划很久，Reka Select 的 typeahead 又只按首字符匹配（年份全以 1/2 开头，等于没有）

**交互模型：立即提交，没有草稿态。** 翻年、点年、点月都直接 `emit('select')`，背后的日历当场跟着变，弹层相当于「遥控器」而不是「选好再确认」的表单。点月份后关闭；点年份后留在弹层里继续选月（年份已提交，月份还要挑）。这样避免了「年份改了但没点月份算不算生效」的二义性。

**边界与键位**：年份网格按 `minYear` 对齐、一页 12 年（与月份同列数），页首页尾按钮置灰；翻年与选择都走 `clampYearMonth()`，与箭头、回到今日共用同一份 1900–2100 边界。键盘用 roving focus：方向键按 4 列移动、Home/End 到首尾，**没有**用 `role="grid"`——那套 ARIA 要求 row/gridcell 的完整结构，半套比不用更糟，这里用 `role="group"` + 格子的 `aria-current`。

**弹层样式要靠变量透传**：Popover 渲染在 Portal 里，拿不到 widget 容器上的 CSS 变量，`pickerPopoverStyle` 显式传字体三件套 + `--nt-cal-customTodayItemBackgroundColor`。最后那个是刻意的：弹层里「当前月」用格子上「今天」的同一支背景色，两张界面才是一套配色。

**标题宽度必须与当前月份无关**：`.title__text` 里堆了 12 条 `visibility: hidden` 的占位串（`8888年1月` … `8888年12月`），全部落在同一个网格单元格上，单元格宽度 = 最宽那条；可见的 `.title__value` 居中放进这个固定宽度里。Chrome 实测：12 个月标题块中线与卡片中线偏差恒为 0，右箭头 x 恒为 174.9；改之前宽度在 97.9–106.9 之间跳，右箭头跟着平移 9px —— 翻月是连点操作，箭头不能在鼠标底下跑。

- 顶栏用三栏 grid（`minmax(0,1fr) auto minmax(0,1fr)`）而不是 flex + `space-between`：中间那组「‹ 年月 ▾ ›」永远落在卡片正中，与两侧内容宽度无关；「回到今日」放第 3 栏 `justify-self: end`
- 用隐藏串而不是给 `min-width` 写死 `em`：字体、字号、语言都可配，写死的数值一定会在某个组合下不够（文字溢出）或留白过多
- 藏的是**整串**而不是只藏月份：`2026年` 前半段也不能动
- 文字居中，代价是位数变化时整串左右微移约 4px（1 月 ↔ 12 月）；标题框与左右箭头不受影响。要彻底消除这点微移只能把月份补零成 `01月`，权衡后不做
- 占位串的年份用 `8888` 而不是真实年份：数字字形里 8 基本最宽，换年（1xxx / 2xxx）时框宽也不会动；再叠一层 `font-variant-numeric: tabular-nums`，`2026 → 2027` 的推进量也一致
- 标题按钮同时带 `:aria-label="titleText"`：可见文本外面还包着 12 条隐藏串，不能让它们进入无障碍名称

> **标题的 `@click` 必须加 `.stop`。** 按钮在 `NTPopover` 的 `PopoverTrigger` 内部，Reka 给触发器绑了 `onClick: onOpenToggle`。真实点击时浏览器会在两个监听器之间做一次 microtask checkpoint，Vue 刚好把 `open = true` 刷进去，事件冒泡到触发器时 Reka 读到 open 已是 true，又翻回 false —— 现象是「弹层闪一下就没了」。从 JS 里 `dispatchEvent` 不会有这次 checkpoint，所以单测只点一次是绿的，只有真人点才复现。详见 [pitfalls-vue.md](../../.claude/rules/pitfalls-vue.md#ntpopover-的-trigger-里再放按钮点击会被-reka-反手关掉)。

**月份标签用短形态**：中文「1月…12月」、英文「Jan…Dec」，语言包 `calendar.month.*` 里直接存短名。中文的「一月」本来就是 month one，写成「1月」零语义损失；英文全名是这一行里最宽的文本（`September` 约 66px），缩写砍掉一半。

> 踩过的坑：`<NTSelect class="…">` 上的 class 曾经**不会落到任何元素**（根节点是 Reka 的 `SelectRoot`，`inheritAttrs: false`）——早先的 `.item__select_year { width: 84px }` / `.item__select_month { width: 105px }` 写了却从未生效，真正生效的一直是 `.reka-select__trigger` 的 `min-width: 90px`。现已修复（NTSelect 显式把 `$attrs` 绑到触发按钮），完整记录见 [pitfalls-vue.md](../../.claude/rules/pitfalls-vue.md#reka-root-不渲染元素时组件的-class-会被静默丢弃)。

## 3. tyme4ts 的关键语义（易错）

tyme4ts 现在**只提供农历与黄历**，它的节日表（`SolarFestival` / `LunarFestival`）已不再使用。

| 语义 | 正确写法 | 说明 |
|------|----------|------|
| 节气 | 优先用订阅里的节气条目；需要自己算时用 `getTermDay().getDayIndex() === 0` | `getTerm()` 返回的是**当天所处的节气**，如 1 月 1 日返回「冬至」；只有 `dayIndex === 0` 才是交节日 |
| 农历年 | `lunarDay.getLunarMonth().getLunarYear().getSixtyCycle()` | 农历年以**正月初一**换年（GB/T 33661-2017）。`lunarDay.getYearSixtyCycle()` 是**立春**换年的八字口径，不是农历年 |
| 农历月名 | `getLunarMonth().getName()` | 返回国标写法「正月 / 十一月 / 十二月」，**自带「月」字**，不要再拼 `${name}月` |
| 农历日名 | `getLunarDay().getName()` | 「初一 / 廿三」；判断初一用 `getDay() === 1` |
| 星期 | `getWeek().getIndex()` | 适配层返回 0=周日…6=周六 的**索引**，由展示层映射到 i18n 星期文案（`getWeek().getName()` 返回的是库的中文字符「二」，不要直接展示）|
| 空集合 | `[]` | 宜忌、吉神、凶煞无内容时返回空数组，不要用占位文案 |
| 吉凶区分 | `god.getLuck().getName()` | 吉神/凶煞都来自 `getGods()`，按 `吉` / `凶` 分组 |

## 4. 通用现代节日表（festivals.ts）

订阅提供的是「某个地区认定的节日与休班」，但 Apple 的中国大陆日历**不含**情人节、母亲节、圣诞这类西方节日，所以这里用规则声明式补一张与地区无关的表：

```ts
Event.builder().solarDay(2, 14, 0)        // 固定公历日
Event.builder().solarWeek(5, 2, SUNDAY)   // 某月第 2 个周日（-1 表示最后一个）
```

**只收 9 条国际通用条目**（情人节、消费者权益日、愚人节、母亲节、父亲节、万圣节、感恩节、平安夜、圣诞节）。大陆特有的安全教育日 / 助残日 / 国防教育日已移除；**世界住房日、万圣节前夜也按产品决定删除，不要按旧的 11 条补回来**。

**只在中国大陆订阅时生效**：条目名称只有中文且多为大陆常用节日，由 `includeLocalFestivals` 控制——订阅中国大陆时补充，订阅中国台湾 / 中国香港 / 美国等其它日历或自定义地址时不补充。

**不使用库的 `EventManager`**：它是全局可变注册表（`static DATA`），且 `Event.all()` 每次调用都会重新解析整张表。`Event` 对象本身是自包含的（`getSolarDay(year)`），按年解析成日期表并缓存即可，全程无全局副作用。

## 4.1 节假日订阅（subscriptions.ts）

与 iOS/macOS 的节假日日历同一套数据：`https://calendars.icloud.com/holidays/<slug>.ics`。用户一次只能订阅**一个**日历（与 Apple 日历的使用心智一致），数据按 URL 缓存；将来放开多订阅时，除了 UI 还要调整 `writeSubscriptionCache` 的“只保留当前订阅”清理逻辑。

| 项 | 取值 |
|---|---|
| 预设 | 46 个地区（CN / HK / TW / JP / KR / SG / MY / TH / VN / ID / PH / IN / US / CA / MX / BR / CL / CO / GB / IE / FR / DE / AT / CH / BE / NL / PT / ES / IT / GR / PL / CZ / HU / RO / UA / RU / TR / IL / AE / ZA / AU / NZ / SE / NO / DK / FI）|
| 未提供 | 澳门（MO）、阿根廷（AR）——Apple 没有这两个日历 |
| 自定义 | 任意 `http(s)` 的 `.ics` 地址；输入只改 draft，点击「验证」成功后才提交 URL 并替换订阅（失败/输入中都不碰当前订阅）；响应超过 5 MB 直接拒绝 |
| 解析窗口 | ICS 里实际出现的年份范围 ∪ `[当前年-1, 当前年+2]`，并限制在 1900–2100；不再固定丢掉源里已有的年份。源本身未覆盖的年份仍只有农历/通用节日（这是数据源限制，不是解析遗漏）|
| 地区名 | 用 `Intl.DisplayNames` 从 ISO 代码生成；中国大陆 / 中国台湾 / 中国香港用自定义 i18n 覆盖（`Intl` 会给出「中国」「台湾」「中国香港特别行政区」）|
| 缓存 | `localStorage`，key 含 URL，TTL 24 小时；结构带版本号（旧 `isTerm` 缓存自动失效）；请求超时 10 秒 |
| 失败降级 | 有过期缓存则继续展示并提示「更新失败，显示缓存数据」；无缓存才停在加载态（**刻意不用 tyme4ts 兜底**，避免两套数据源长期分叉）|

### 刷新时机

| 时机 | 行为 |
|------|------|
| 打开新标签页（widget `onMounted`）| 缓存未过期不请求；过期才拉 |
| 切换预设地区 | 设置面板自动拉取（缓存缺失或过期时），widget 侧监听生效地址变化 |
| 验证自定义地址 | 验证成功并提交后才切换；widget 随之加载新地址 |
| 设置面板「刷新」按钮 | 忽略缓存强制拉取 |
| 加载失败后的「重试」 | 强制拉取（点击 widget 顶栏的状态图标，仅失败时出现）|

**刻意不监听 `visibilitychange`**：新标签页每次打开都会重新挂载，`onMounted` 已经覆盖了主路径；TTL 24 小时而节假日数据一年只变几次，「标签页长期不关」晚一天刷新没有可感知的损失。反过来，缓存跨过 TTL 且网络不通时，切回前台会真的发请求并把 `error` 写进状态，让用户只是 alt-tab 回来就看到顶栏警告图标——这是纯粹的副作用。**不要按"覆盖长期不关的场景"再加回来。**

> 这条只约束**订阅请求**。日期基准的跨天校正另走 `addDailyTask`（见 2.3）：它不发网络请求，且合盖恢复时只有共享的 rAF 循环能发现日期已变。看到这段时不要顺手把 2.3 的定时任务删掉。

同一 URL 的并发加载在 `subscriptions.ts` 里用 in-flight map 合并——设置面板与 widget 同时触发只会发一次请求。`force` 与普通加载使用不同 key（避免强制刷新被缓存命中吞掉），两者并发时可能发两次请求，这是有意的。

不同 URL / `force` 的加载用 token 保护：旧请求晚返回不会覆盖新订阅；开始加载新 URL 时会清空旧 `error`。有旧数据（含过期的 TTL 缓存）时先展示旧数据，刷新期间/失败都不会清空日历。

**widget 侧的失败提示（只在失败时出图标，刷新过程不提示）**：状态位在顶栏 `.options__reset` 槽位里、「回到今日」按钮左侧，与倒数日区完全解耦——关掉节日倒数也能看到，且不会盖住日历或倒数日内容。

**刻意不做刷新提示**：有缓存时数据本来就还在，没有缓存也只是短暂缺节日；转圈图标对这张小卡片的打扰大于信息量，订阅是否成功用「失败图标」这一个反例即可覆盖。

**自动刷新的失败按自然日去重**（`shouldPromptError`）：同一自然日只有**第一次**自动失败会出图标，之后静默，次日恢复提示。理由是数据一年只变几次，网络不稳时每开一个标签页弹一次警告图标不值得。三点约束：

- 标记存在 `localStorage`（`naivetab:calendar:error-prompt-day`）而不是模块变量——新标签页是新的执行上下文，模块变量存不住；键名**刻意不带** `naivetab:calendar:subscription:` 前缀，否则会被 `writeSubscriptionCache` 的「只保留当前订阅」清理逻辑误删
- 只抑制**提示**，不抑制**请求**：后续挂载仍然照常拉取，成功即自愈
- 用户主动点图标重试（`force`）失败**照常提示**，并占用当天的名额——他自己要求的动作必须有反馈，否则点了没反应

`subscriptionState.error` 与 `isErrorVisible` 是两件事：前者是「最近一次失败原因」（设置面板的「更新失败」文案读它，不受去重影响），后者是「这次失败要不要惊动用户」。

| 状态 | 图标 | 颜色 | 交互 |
|------|------|------|------|
| `idle`（含刷新中、缓存命中、当天的重复失败）| 不渲染 | — | — |
| `stale`（`error` + `isErrorVisible` + `status === 'ready'`，旧数据仍可读）| `ICONS.warning` | `--color-warning` | 点击 = 强制刷新 |
| `error`（`error` + `isErrorVisible` + 没有可展示的数据）| `ICONS.warning` | `--color-error` | 点击 = 强制刷新 |

文案退到 `title` / `aria-label`（`calendar.subscriptionStaleTip` / `calendar.subscriptionFailedTip`），hover 才出现；**不要**再往倒数日区叠文字胶囊——那里既有数据又只有一两行，任何常驻文案都会盖住内容，而且胶囊复用的「休」标签绿/红会带出错误的语义。

槽位用 `min-width: 2.2vmin` 而不是固定 `width`：图标出现时向右扩展，`space-between` 的最后一组右边缘固定，「回到今日」不会跳动，只有中间的月份选择会平移半个图标宽（仅「翻到其他月份 + 订阅恰好失败」时可见）。

**设置面板的交互**：地区选择器与 `tip-content` 的灰色说明小字保持和其它设置项一致的形态；选择器与刷新按钮同一行，状态在下方灰色说明里。

- 外层 `.subscription` 是 `width: 100%` 的列容器——选择器的根元素本身是 `width: 100%`，如果套一层无宽度的 `div`，会被控件区的 `justify-content: flex-end` 压成 `min-width: 90px`
- 选择器与刷新按钮同一行：选择器通过 `:deep(.reka-autocomplete) { flex: 1 }` 占满剩余宽度，按钮 `flex-shrink: 0`
- 刷新按钮与面板里其它按钮同款（`type="primary" variant="secondary" round` + 图标 + 文字）；刷新中重复点击在 handler 里忽略，不用 `disabled`（避免禁用态样式切换闪动）
- 状态文案在下方一行，四种状态互斥
- **地区选择器是可搜索的**：`NTAutoComplete`（Reka Combobox）+ `ignore-filter=false` 走本地过滤 + `open-on-click` 让点击输入框就能看到全部候选。候选顺序 =「自定义地址」（动作项）→ **中国大陆 / 中国香港 / 中国台湾（固定置顶）** → 其余地区按当前语言字母序（`orderSubscriptionRegions` + `createRegionLabelComparator`，中文下即拼音序）。置顶规则在 `PINNED_SUBSCRIPTION_REGIONS`：默认地区是 CN，这三项也是中文用户最高频的选择，不该让人滚字母表去找。其余地区切语言自动重排——界面用哪种语言，用户就只会用那种语言的名字去找；中文界面里「德国」若按 Germany 待在 G 段，用户根本定位不到，按拼音它就在 D 段
- 输入框文字（`regionKeyword`）随 `subscriptionRegion` 同步（用户选择、云同步写回都走同一个 watch）；选中项通过 `@select` 写回配置，再由已有的 region watch 触发订阅加载
- 首次选中一个没缓存的地区会自动拉取，不需要用户手动点刷新
- **自定义地址是 draft，不是 config**：输入只改 `draftCustomUrl`，不写 `localConfig`、不触发请求、不影响当前订阅；点击「验证」且成功后，才写入 `customSubscriptionUrl` 并用刚写入的缓存替换订阅（只发一次请求）。编辑 draft 会重置旧的验证提示
- 验证期间切换地区或继续编辑会作废本次结果（token 保护），不会覆盖用户刚选的订阅
- 未配置订阅（选「自定义」但地址为空）时 widget 不显示状态图标（`idle`）

**不做定时轮询**：新标签页每次打开都会重新挂载，`onMounted` + TTL 已覆盖实际使用场景；定时器只会增加无谓的唤醒与请求（Apple 的节假日日历一年也只变几次）。

### ICS 解析要点（易错）

| 坑 | 正确做法 |
|---|---|
| `DTEND` 是**排他**的 | `DTSTART 20231230 / DTEND 20240102` = 12/30、12/31、1/1 三天。按包含处理会每条多日假期多算一天 |
| 多日假期用区间表示 | 展开成逐日，最多展开 `maxRangeDays`（默认 60）天；超出部分忽略（不整条丢弃）|
| 固定节日用 `RRULE` | 支持 `FREQ=YEARLY` + `INTERVAL` + `COUNT` + `BYMONTH` + `BYDAY`（`4TH` / `-1MO`）+ `BYMONTHDAY`；非法数值/其他字段一律返回 null，当"无重复规则"处理（宁可少展开，不可猜错）|
| `COUNT` 语义 | 按 RFC 计**实际产生的日期数**；2 月 29 日、不存在的第 5 个星期几不计数 |
| `RRULE + DTEND` | 真实 Apple 源未出现该组合；目前只展开 DTSTART 的重复日（代码里有注释，不要误以为已完整支持）|
| 休/班标记有两种来源 | `X-APPLE-SPECIAL-DAY: WORK-HOLIDAY / ALTERNATE-WORKDAY`（Apple 大陆日历）或 `SUMMARY` 的「（休）」「（班）」后缀；同日同时出现时「班」优先 |
| 节气与节日可能同名 | 解析器分两步：先找出「无休班标记 + 名称在节气集合里」的事件作为节气日，再把事件拆进 `names` / `termNames`。这样 `清明（休）` 这类多日假期不会被当成节气；HK/TW 的繁体节气名（`驚蟄`/`穀雨`/`小滿`/`芒種`/`處暑`）也在 `SOLAR_TERM_NAMES` 里 |
| 响应是 gzip | 浏览器 `fetch` 会自动解压，不要自己解；用命令行验证时才需要 `--compressed` |

### 为什么运行时拉取，而不是打包进扩展

决策与理由见 [ADR 0009](../decisions/0009-calendar-runtime-subscription.md)。此处只留一条操作提醒：**新增预设源前必须先验证它对普通 `fetch` 的响应**，有 JS 挑战或强 UA 校验的站点不要加。

## 5. 日期语义约定

适配层入参一律传**本地时间日期**。`new Date('YYYY-MM-DD')` 按 UTC 解析，在东八区以西会得到前一天，导致格子的农历/节日数据与休/班标记错位（组件侧用 `dayjs(x).toDate()`）。

## 6. 性能

| 路径 | 现状 |
|------|------|
| 倒计时列表（366 天）| 只查订阅 Map + 本地规则表 + 农历回退；本机实测约 7–12 ms（此前按天问库约 34 ms）|
| 日期格子（42 格）| 同上，约 0.7 ms |
| 订阅解析 | 一次解析约 1–5 ms（CN 246 个事件 → 7 年约 300 余天），结果进缓存，24 小时内不重复 |

## 7. 测试基线

- `src/logic/__tests__/calendar.test.ts`
  - **产品契约**：与库无关（文案优先级、干支年边界、休/班来自订阅、`offsetDays` 语义、时区无关性、订阅为 null 时的降级）
  - **tyme4ts 语义**：国标月名、清明归入传统节日、星座枚举顺序、星期索引
  - **展示开关**：关闭农历与节气后格子留空/详情无农历行/倒计时不含节气；关闭黄历后四行为空
  - **通用节日表**：9 条规则的日期正确、已移除条目（含世界住房日、万圣节前夜）不再出现
- `src/logic/__tests__/calendar-ics.test.ts`：ICS 文本解析与 RRULE 展开（区间排他、`BYDAY`、`BYMONTHDAY`、闰年、折叠行、异常输入、清明多日假期与繁体节气）
- `src/logic/__tests__/calendar-subscriptions.test.ts`：46 个预设地址、地址校验、缓存 TTL/版本、错误映射、缓存优先与失败降级、源年份窗口、刷新保留旧数据、并发竞态、失败提示按自然日去重（同日静默 / 跨日恢复 / `force` 总是提示）
- `src/logic/__tests__/calendar-grid.test.ts`：网格恒定 6 行
- `src/logic/__tests__/calendar-range.test.ts`：年月序号、`clampYearMonth` 端点钳制、可浏览范围与订阅解析窗口一致
- `src/logic/__tests__/calendar-config-compat.test.ts`：2.6.x 旧配置的向前兼容（浅合并前提、已废弃的 `holidayRegion` 不干扰新字段）
- `src/newtab/widgets/calendar/__tests__/month-picker.test.ts`：年月选择器的状态机（标题文案、展开 12 格并标出当前月、选月提交后关闭、选年后回到月面板、方向键移动焦点、1900/2100 端点置灰、年份尾页裁到 maxYear、disabled 时不展开）

## 8. 依赖库现状

| | lunar-typescript | tyme4ts |
|---|---|---|
| 官方定位 | 「后续不再增加新特性，仅修复 bug」，建议改用 Tyme | 官方继任者，长期支持 |
| 采用情况 | 已于本次迁移移除 | 当前使用 1.5.4（`^1.5.4`）|
| 职责 | — | 只提供农历与黄历；节日/节气/休班来自订阅 |

**风险**：tyme4ts 仍在演进（1.4.5 调整节日名称、1.4.6 废弃 `FestivalType`、1.5.0 移除）。它现在只影响农历与黄历，节日名称来自订阅源；升级时跑 `calendar.test.ts` 即可。
