# 节假日地区数据

本目录存放各地区的**节假日口径**与**逐年休班安排**。日历 Widget 的「节假日地区」下拉框就来自这里。

## 1. 地区代码

地区代码遵循 **ISO 3166-1 alpha-2**（国际标准，唯一且撤销后不复用），与节假日数据生态（`date-holidays`、Python `holidays` 等库）保持一致。

↓ 顺序即 Widget 设置面板「节假日地区」下拉框顺序：

| 代码 | 地区 | 文件 | 假期口径 | 数据来源 |
|------|------|------|----------|----------|
| `NONE` | 不显示节假日 | `none.json` | 关闭态 | — |
| `CN` | 中国大陆 | 无（用库） | tyme4ts 内置法定假日数据 | 日历库 `LegalHoliday` |
| `HK` | 中国香港 | `hk.json` | 公眾假期（General Holidays） | 香港政府一站通 / [data.gov.hk](https://data.gov.hk/tc-data/dataset/hk-dpo-statistic-cal) |
| `TW` | 中国台湾 | `tw.json` | 政府行政機關辦公日曆表 | 行政院人事行政總處 |

> **CN 为什么没有数据文件**：节日与法定假日都直接使用 tyme4ts 内置数据。只有当库的数据缺失或需要修正时，才补一份 `cn.json` 覆盖（文件优先于库）。

> **NONE 是什么**：不是地区，而是**关闭态**——让非中文地区用户也能去掉大陆口径的节日。它只做排除：保留元旦、妇女节、劳动节（国际通用）与通用现代节日表，排除 7 个大陆特有内置节日、13 个农历传统节日、3 个"全国X日"。农历与节气的显示由 Widget 的展示开关控制，与本项无关。

### 口径说明（重要）

同一个地区可能有多种假期口径，选错就会出现「你标错了」的争议，因此必须写清楚：

- **香港**：有「公眾假期」（17 天，银行及公众适用）与「法定假日」（13 天，《僱傭條例》适用于所有雇员）两套。本项目采用**公眾假期**，`scheme` 记为 `general-holidays`。
- **台湾**：「政府行政機關辦公日曆表」**只適用於公務人員**，勞工（《勞動基準法》）與學校另有規定。`scheme` 记为 `government-office-calendar`。

## 2. 数据格式

字段定义见 [types.ts](./types.ts)，一份数据文件形如：

```jsonc
{
  "region": "HK",                    // 必须与文件名一致
  "scheme": "general-holidays",      // 假期口径
  "exclude": ["建党节"],              // 从内置表 / 通用节日表中排除的节日名
  "add": [                           // 该地区独有节日
    { "name": "佛誕", "rule": { "type": "lunarDay", "month": 4, "day": 8 } }
  ],
  "years": {
    "2026": {
      "source": "《2026 年公眾假期》",
      "sourceUrl": "https://www.gov.hk/…",
      "verifiedAt": "2026-01-15",    // 人工核对日期，必填
      "rest": [{ "date": "2026-01-01", "name": "一月一日" }],
      "work": []                     // 香港无补班；台湾/大陆才有
    }
  }
}
```

### 节日规则 DSL

| type | 参数 | 含义 | 例 |
|------|------|------|-----|
| `solarDay` | `month`, `day`, `offset?` | 固定公历日 | 雙十節 = 10-10 |
| `solarWeek` | `month`, `index`, `week` | 某月第 N 个星期几（`index: -1` = 最后一个） | 母親節 = 5 月第 2 个周日 |
| `lunarDay` | `month`, `day`, `offset?` | 农历日 | 佛誕 = 農曆四月初八 |
| `termDay` | `term`, `offset?` | 节气及其偏移 | 寒食 = 清明前一天 |

`week` 用 `sun`…`sat`，`term` 用节气中文名（如 `"清明"`）——写数据的人不需要知道库的内部索引。

## 3. 更新流程

节假日安排由各地政府逐年公告，**每年需要更新一次**：

1. 打开上表对应的官方页面，核对新一年的安排
2. 在 `years` 中新增一个年度块，填 `source` / `sourceUrl` / `verifiedAt`
3. 逐条录入 `rest` 与 `work`（补班日）
4. 运行 `pnpm exec tsx scripts/check/validate-holidays.ts`，再跑 `pnpm test`

> **宁可缺失，不可猜错**：某年数据没录完就不要录一半——该年不显示休班标记不会误导用户，标错日期会。
> 这也是 `verifiedAt` 必填的原因：任何一条数据都能追溯到「哪天、依据什么核对的」。

## 4. 校验规则

`pnpm exec tsx scripts/check/validate-holidays.ts`（已接入 pre-commit）：

1. 每个数据文件都必须在 [index.ts](./index.ts) 的 `HOLIDAY_REGIONS` 中注册
2. JSON 可解析且符合 schema
3. **同一天不能既在 `rest` 又在 `work`**（最危险的一类错误）
4. `rest` / `work` 内部不重复、日期真实存在、且属于该年份
5. 每个年度块必须有 `source` / `sourceUrl` / `verifiedAt`
6. 年份不得出现空洞
7. **`exclude` 中的节日名必须真实存在于 tyme4ts 内置表或通用节日表**
8. `add` 的规则类型与参数范围合法
9. `add` 不得与内置节日/通用节日重名
10. `region` 字段与文件名一致

第 7 条尤其重要：tyme4ts **曾调整过节日名称**（1.4.5），一旦改名，`exclude` 会静默失效，台湾/香港用户就会看到本该排除的节日。校验脚本会在这种情况下直接报错。

## 5. 相关文件

- [index.ts](./index.ts) — 地区注册表与访问器（带按年缓存）
- [rules.ts](./rules.ts) — 规则 DSL → tyme4ts Event
- [validate.ts](./validate.ts) — 校验逻辑（脚本与单测共用）
- [types.ts](./types.ts) — 类型定义
- `src/logic/calendar/festivals.ts` — 通用现代节日表（对全部地区生效，可被 `exclude` 排除）
- `docs/widgets/calendar-widget.md` — 日历 Widget 整体设计
