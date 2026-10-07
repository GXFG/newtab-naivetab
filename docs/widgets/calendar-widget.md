# 日历 Widget 数据来源与适配层

> 实现细节见 `src/logic/calendar/index.ts` 顶部注释；本文只记录"读单个文件看不到"的内容。

## 1. 分层

```
src/newtab/widgets/calendar/index.vue   展示层：布局、样式、交互
                ↓
src/logic/calendar/index.ts             适配层：全项目唯一依赖日历库的模块
src/logic/calendar/festivals.ts         通用现代节日表：库未内置、由 Event 规则声明式补齐
src/logic/calendar/regions/             节假日地区：注册表 + 逐年休班数据 + 校验
src/logic/calendar/grid.ts              月历网格布局：纯计算，不依赖库与 dayjs
                ↓
tyme4ts                                 数据层
```

**Why：** 把"读库"的代码收口到一层，换库只改这一层；同时把日期语义（本地时间）与地区口径约定集中到一处。

## 2. 对外 API

| 函数 | 返回 | 消费点 |
|------|------|--------|
| `getDayCell(date, options)` | `{ desc, isFestival, dayType }` | 日期格子、节日倒计时列表 |
| `getDayDetail(date, options)` | `{ weekday, lunar, festivals, constellation, yi, ji, jishen, xiongsha }` | 日期详情 Popover |
| `getFestivalList(startDate, options, days = 365)` | `{ date, offsetDays, desc, dayType }[]` | 节日倒计时列表 |

`options` 为 `ICalendarOptions`，三个字段彼此正交：

```ts
{
  region: TRegionCode     // 数据：看哪个地区的节日与休班（NONE / CN / HK / TW）
  showLunarTerm: boolean  // 展示：农历日期与节气
  showAlmanac: boolean    // 展示：黄历详情（宜、忌、吉神、凶煞）
}
```

由调用方从 `localConfig.calendar.*` 组装传入，**保持适配层为纯函数**；传入未注册的地区代码会回退到默认地区（云同步可能带来更高版本写入的值）。

文案优先级只有适配层这一份实现（格子、详情、倒计时共用）：**农历节日 → 阳历节日 → 通用现代节日 → 地区节日 → 当天节气 → 农历月/日**。

`weekday`（0=周日）与 `constellation`（如 `'gemini'`）返回的是**稳定标识**而非中文，由展示层映射到 i18n——避免把库的中文文案泄漏到界面。

`offsetDays` 是距起始日的天数（起始日当天为 0），**不是列表下标**——倒计时列表会跳过无节日节气日期，两者不相等。

## 2.1 三个展示开关

| 开关 | 关掉后 | 默认 |
|------|--------|------|
| 休班标记 `isHolidayMarkVisible` | 格子与倒计时的 休/班 角标消失（节日仍显示）| 开 |
| 农历与节气 `isLunarTermVisible` | 格子第二行在无节日时**留空**（节气日也留空）、详情不显示农历行、倒计时列表不再列出节气 | 开 |
| 黄历详情 `isAlmanacVisible` | 详情弹窗的 宜/忌/吉神/凶煞 四行整体隐藏 | 开 |

设计要点：

- **默认全开**，不与界面语言或其它设置联动——默认值不依赖运行环境，行为可预测、可测试，也不会在升级时改变老用户体验。英文商店描述本身已写明 "Lunar calendar, holidays"，默认值名副其实。
- **正交**：`region` 管"看谁的数据"，两个开关管"看不看"。因此能表达"在美华人 = 要农历 + 不要大陆节假日"这类真实组合。
- **格子在文案为空时不会破版**：`.body__item` 是固定正方形 + 垂直居中，空 `<span>` 高度为 0，只有日期数字上移约 0.075vmin。
- **缓存零耦合**：开关只在合成阶段过滤，不影响底层数据（地区节日表与休班表仍按 region + 年 缓存）。

## 2.2 网格恒定 6 行

格子容器 `.calendar__body__wrap` 的高度是 `格子宽度 × 6`，因此**任何月份都必须铺满 6 行（42 格）**：

- 整 4 周的月份（2 月恰好从一周起始日开始且 28 天，如 2027-02 周一版、2026-02 周日版）只有 28 格
- 整 5 周的月份只有 35 格

两者都要用下月日期补足到 42 格，否则容器底部会空出一到两行。补格逻辑由 [`grid.ts`](../../src/logic/calendar/grid.ts) 的 `getMonthGridPadding()` 统一负责，并有穷举 2020–2035 × 两种周起始的单测锁住不变量。

> 历史坑：早期实现只特判了「35 格 → 补 7」这一种情况，漏了 28 格，导致 2021-02 / 2027-02 底部空两行。

## 3. tyme4ts 的关键语义（易错）

| 语义 | 正确写法 | 说明 |
|------|----------|------|
| 节气 | `getTermDay().getDayIndex() === 0` | `getTerm()` 返回的是**当天所处的节气**，如 1 月 1 日返回「冬至」；只有 `dayIndex === 0` 才是交节日 |
| 农历年 | `lunarDay.getLunarMonth().getLunarYear().getSixtyCycle()` | 农历年以**正月初一**换年（GB/T 33661-2017）。`lunarDay.getYearSixtyCycle()` 是**立春**换年的八字口径，不是农历年 |
| 农历月名 | `getLunarMonth().getName()` | 返回国标写法「正月 / 十一月 / 十二月」，**自带「月」字**，不要再拼 `${name}月` |
| 农历日名 | `getLunarDay().getName()` | 「初一 / 廿三」；判断初一用 `getDay() === 1` |
| 星期 | `getWeek().getIndex()` | 适配层返回 0=周日…6=周六 的**索引**，由展示层映射到 i18n 星期文案（`getWeek().getName()` 返回的是库的中文字符「二」，不要直接展示）|
| 空集合 | `[]` | 宜忌、吉神、凶煞无内容时返回空数组，不要用占位文案 |
| 吉凶区分 | `god.getLuck().getName()` | 吉神/凶煞都来自 `getGods()`，按 `吉` / `凶` 分组 |

## 4. 通用现代节日表（festivals.ts）

tyme4ts 内置的是国家级与传统节日（`SolarFestival` 10 个 + `LunarFestival` 13 个），不含情人节、母亲节这类现代节日。这些用库的 `Event` 规则补齐：

```ts
Event.builder().solarDay(2, 14, 0)        // 固定公历日
Event.builder().solarWeek(5, 2, SUNDAY)   // 某月第 2 个周日（-1 表示最后一个）
```

**不使用库的 `EventManager`**：它是全局可变注册表（`static DATA`），且 `Event.all()` 每次调用都会重新解析整张表。`Event` 对象本身是自包含的（`getSolarDay(year)`），按年解析成日期表并缓存即可，全程无全局副作用。

本表对**所有地区**生效；某地区不适用的条目由该地区数据文件的 `exclude` 排除。

## 4.1 节假日地区（regions/）

休班标记与地区性节日按地区区分，地区代码遵循 **ISO 3166-1 alpha-2**（国际标准，唯一且撤销后不复用；与 `date-holidays`、Python `holidays` 等节假日数据库的约定一致）：

↓ 顺序即设置面板下拉框顺序：

| 代码 | 地区 | 休班数据来源 | 假期口径 |
|------|------|--------------|----------|
| `NONE` | 不显示节假日 | 无 | 关闭态：只留国际通用节日 |
| `CN` | 中国大陆 | tyme4ts 内置 `LegalHoliday` | 法定节假日（含调休）|
| `HK` | 中国香港 | `regions/hk.json` | 公眾假期（17 天）|
| `TW` | 中国台湾 | `regions/tw.json` | 政府行政機關辦公日曆表 |

`NONE` 不是地区，而是**关闭态**——每个轴都该有"关"，否则非中文地区用户无法去掉大陆口径节日（`isHolidayMarkVisible` 只能隐藏休/班角标，隐藏不了节日名）。它保留元旦、妇女节、劳动节（国际通用）与通用现代节日表，排除 7 个大陆特有内置节日、13 个农历传统节日、3 个"全国X日"。

**地区影响三件事**，不只是"加节日"：

1. **排除**：tyme4ts 内置的阳历节日是大陆口径（建党节、建军节、国庆节、儿童节 6-1、教师节 9-10…），台湾/香港用户需要排除其中不适用或日期不同的条目
2. **新增**：该地区独有节日（雙十節、佛誕…），用与 `festivals.ts` 相同的 `Event` 规则表达
3. **休班**：逐年由政府公告的休息日与补班日

休班标记的优先级是 **地区数据文件 → tyme4ts 内置（仅 CN）→ 不显示标记**。这里刻意选择"宁可缺失，不可猜错"：某年数据没录入时用户看不到标记（最多觉得不够及时），而标错日期会让用户误事。

数据格式、口径说明、年度更新流程与校验规则见 [regions/README.md](../../src/logic/calendar/regions/README.md)。

## 5. 日期语义约定

适配层入参一律传**本地时间日期**。`new Date('YYYY-MM-DD')` 按 UTC 解析，在东八区以西会得到前一天，导致格子的农历/节日数据与休/班标记错位（组件侧用 `dayjs(x).toDate()`）。

## 6. 性能

适配层按天查询（每天都在问库"这天特殊吗"），列表路径需要遍历 366 天：

| 路径 | tyme4ts | lunar-typescript（迁移前）|
|------|---------|--------------------------|
| 倒计时列表（366 天，切换地区或农历/节气开关时重算一次）| ~34 ms | ~10 ms |
| 日期格子（42 格，每次切换月份）| ~5 ms | ~3 ms |

瓶颈是 `LunarFestival.fromYmd`：它每天都要遍历 13 个节日名并逐个构造 `Event`。可选的优化方向是改用库的索引枚举（`LunarFestival.fromIndex` / `SolarTerm.fromIndex` / `SolarFestival.fromIndex`）按年预生成日期表——实测该枚举本身不到 1 ms，但需要处理农历年/节气年与公历年的错位，故暂未采用。**若后续需要，只需改 `src/logic/calendar/index.ts`。**

## 7. 测试基线

- `src/logic/__tests__/calendar.test.ts`
  - **产品契约**：与库无关，换库也必须成立（文案优先级、干支年边界、休/班、`offsetDays` 语义、时区无关性、通用现代节日日期规则）
  - **tyme4ts 语义**：记录相对旧库 lunar-typescript 的有意变化（国标月名、清明归入传统节日、新增上巳节/中元节/冬至节、凶煞返回中文）
  - **节假日地区**：CN 走库、TW/HK 无数据时不标记、地区排除生效、历法信息不随地区变化、未注册代码回退
  - **展示开关**：关闭农历与节气后格子留空/详情无农历行/倒计时不含节气；关闭黄历后四行为空；两开关互不影响
  - **NONE**：不显示任何休班标记、排除大陆口径与农历传统节日、保留国际通用与通用现代节日、历法信息仍可用
- `src/logic/__tests__/calendar-regions.test.ts`：注册表、规则 DSL 解析、校验器（坏数据必须被发现）

## 8. 依赖库现状

| | lunar-typescript | tyme4ts |
|---|---|---|
| 官方定位 | 「后续不再增加新特性，仅修复 bug」，建议改用 Tyme | 官方继任者，长期支持 |
| 采用情况 | 已于本次迁移移除 | 当前使用 1.5.3 |

**风险**：tyme4ts 仍在演进（1.4.5 调整节日名称、1.4.6 废弃 `FestivalType`、1.5.0 移除），升级时务必跑 `calendar.test.ts` 与 `validate-holidays.ts`（后者会在节日改名导致 `exclude` 失效时报错）；另外它没有 lunar 那种 `HolidayUtil.fix()` 的公开假日数据补充 API（`LegalHoliday.DATA` 是 public static，必要时可覆盖但非文档化），大陆的次年法定假日数据依赖作者发版——这也是其他地区自带数据文件的原因。
