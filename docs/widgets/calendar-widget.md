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
| 标签页重新可见（`visibilitychange`）| 同"过期才拉"，覆盖"标签页长期不关"的场景 |
| 设置面板「刷新」按钮 | 忽略缓存强制拉取 |
| 加载失败后的「重试」 | 强制拉取（点击 widget 顶栏的状态图标，仅失败时出现）|

同一 URL 的并发加载在 `subscriptions.ts` 里用 in-flight map 合并——设置面板与 widget 同时触发只会发一次请求。`force` 与普通加载使用不同 key（避免强制刷新被缓存命中吞掉），两者并发时可能发两次请求，这是有意的。

不同 URL / `force` 的加载用 token 保护：旧请求晚返回不会覆盖新订阅；开始加载新 URL 时会清空旧 `error`。有旧数据（含过期的 TTL 缓存）时先展示旧数据，刷新期间/失败都不会清空日历。

**widget 侧的失败提示（只在失败时出图标，刷新过程不提示）**：状态位在顶栏 `.options__reset` 槽位里、「回到今日」按钮左侧，与倒数日区完全解耦——关掉节日倒数也能看到，且不会盖住日历或倒数日内容。

**刻意不做刷新提示**：有缓存时数据本来就还在，没有缓存也只是短暂缺节日；转圈图标对这张小卡片的打扰大于信息量，订阅是否成功用「失败图标」这一个反例即可覆盖。

| 状态 | 图标 | 颜色 | 交互 |
|------|------|------|------|
| `idle`（含刷新中、缓存命中）| 不渲染 | — | — |
| `stale`（`error` + `status === 'ready'`，旧数据仍可读）| `ICONS.warning` | `--color-warning` | 点击 = 强制刷新 |
| `error`（`error` + 没有可展示的数据）| `ICONS.warning` | `--color-error` | 点击 = 强制刷新 |

文案退到 `title` / `aria-label`（`calendar.subscriptionStaleTip` / `calendar.subscriptionFailedTip`），hover 才出现；**不要**再往倒数日区叠文字胶囊——那里既有数据又只有一两行，任何常驻文案都会盖住内容，而且胶囊复用的「休」标签绿/红会带出错误的语义。

槽位用 `min-width: 2.2vmin` 而不是固定 `width`：图标出现时向右扩展，`space-between` 的最后一组右边缘固定，「回到今日」不会跳动，只有中间的月份选择会平移半个图标宽（仅「翻到其他月份 + 订阅恰好失败」时可见）。

**设置面板的交互**：地区下拉与 `tip-content` 的灰色说明小字保持和其它设置项一致的形态；下拉与刷新按钮同一行，状态在下方灰色说明里。

- 外层 `.subscription` 是 `width: 100%` 的列容器——`NTSelect` 的触发器本身是 `width: 100%`，如果套一层无宽度的 `div`，会被控件区的 `justify-content: flex-end` 压成 `min-width: 90px`
- 下拉与刷新按钮同一行：下拉通过 `:deep(.reka-select__trigger) { flex: 1 }` 占满剩余宽度，按钮 `flex-shrink: 0`
- 刷新按钮与面板里其它按钮同款（`type="primary" variant="secondary" round` + 图标 + 文字）；刷新中重复点击在 handler 里忽略，不用 `disabled`（避免禁用态样式切换闪动）
- 状态文案在下拉下方一行，四种状态互斥
- 首次选中一个没缓存的地区会自动拉取，不需要用户手动点刷新
- **自定义地址是 draft，不是 config**：输入只改 `draftCustomUrl`，不写 `localConfig`、不触发请求、不影响当前订阅；点击「验证」且成功后，才写入 `customSubscriptionUrl` 并用刚写入的缓存替换订阅（只发一次请求）。编辑 draft 会重置旧的验证提示
- 验证期间切换地区或继续编辑会作废本次结果（token 保护），不会覆盖用户刚选的订阅
- 未配置订阅（选「自定义」但地址为空）时 widget 不显示状态图标（`idle`）

**不做定时轮询**：新标签页通常每次打开都会重新挂载，TTL + 可见性检查已覆盖实际使用场景；定时器只会增加无谓的唤醒与请求（Apple 的节假日日历一年也只变几次）。

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

- 打包等于再分发 Apple 的数据，条款上更暧昧；运行时由用户设备订阅公开日历，与任何日历 App 行为一致。
- 扩展本身已有 `host_permissions: ['*://*/*']`，**不需要新增权限、不会弹授权**。
- 单次传输约 9 KB（gzip），失败可从缓存继续。

> Cloudflare 防护：有些第三方中文日历源（如 oneo.me）在 Cloudflare 的人机验证后面，命令行的完整浏览器请求头也会被 403；扩展内 `fetch` 无法执行 JS 挑战，除非用户已在浏览器里拿到 `cf_clearance`，因此不能作为内置预设。

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
- `src/logic/__tests__/calendar-subscriptions.test.ts`：46 个预设地址、地址校验、缓存 TTL/版本、错误映射、缓存优先与失败降级、源年份窗口、刷新保留旧数据、并发竞态
- `src/logic/__tests__/calendar-grid.test.ts`：网格恒定 6 行

## 8. 依赖库现状

| | lunar-typescript | tyme4ts |
|---|---|---|
| 官方定位 | 「后续不再增加新特性，仅修复 bug」，建议改用 Tyme | 官方继任者，长期支持 |
| 采用情况 | 已于本次迁移移除 | 当前使用 1.5.4（`^1.5.4`）|
| 职责 | — | 只提供农历与黄历；节日/节气/休班来自订阅 |

**风险**：tyme4ts 仍在演进（1.4.5 调整节日名称、1.4.6 废弃 `FestivalType`、1.5.0 移除）。它现在只影响农历与黄历，节日名称来自订阅源；升级时跑 `calendar.test.ts` 即可。
