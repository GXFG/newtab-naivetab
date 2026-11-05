# 图标系统

图标全部通过 `@iconify/vue` 渲染，但**不走 iconify 官方 API**：图标数据在构建期固化进产物，运行时零网络请求。

本模块只覆盖 UI 图标。书签 favicon（`logic/bookmark/api.ts`）和天气图标字体（`styles/qweather-icons.css`）是另外两条链路，不在这里的守卫范围内。

## 为什么要离线

`@iconify/vue` 默认行为是「本地找不到就去 `api.iconify.design` 拉」。对本扩展有三个问题：

- 新标签页是首屏高频页面，每个未注册图标都会多一次网络往返，首屏出现空图标
- 断网或网络受限时界面缺图标
- 一个「纯本地」的新标签页扩展向第三方域名发请求，属隐私与商店审核的扣分项

因此所有图标组件从 `@iconify/vue/offline` 引入（该构建**不含**任何远程加载逻辑），图标数据由 `src/common/iconify.ts` 在启动时注册。

## 唯一来源是常量表

图标名只写在 `src/logic/constants/icons.ts` 的 `ICONS` / `COMMAND_ICONS` 里，产物由这两张表生成。

**不再扫描源码来「猜」用了哪些图标。** 早先的做法是正则扫 `src/**/*.{ts,vue}` 里的字面量，它自带三类误判：

- 注释里带引号的图标名会被打进产物（一个永远用不到的条目）
- 数字开头的图标名（如 360、3d-rotation）扫不到，因为名称段要求字母开头
- 未知前缀要靠一张 30 项的手工白名单挡，而白名单只会越来越长

而这些扫描产出的信息量与常量表**完全一致**（曾经双向比对：产物 159 个图标，常量表去重后也是 159 个，差集为空）。所以判据改为「常量表即输入」，正则退回守卫角色。

## 文件与职责

| 文件 | 职责 |
|------|------|
| `src/logic/constants/icons.ts` | `ICONS` / `COMMAND_ICONS` 图标名常量（唯一允许写图标名的地方），以及 Widget / Setting 的图标尺寸注册 |
| `src/logic/constants/icon-set.json` | **生成产物**：扁平的「图标名 → 图标数据」映射，需提交 |
| `src/logic/constants/icon-set-build.ts` | 整理逻辑：借 `@iconify/utils` 的 `getIconData` 解析别名并合并集合级默认尺寸，字段顺序固定。生成器与单测共用 |
| `src/logic/constants/icon-scan.ts` | 图标名的形式规则 + 源码字面量扫描（只给守卫测试用） |
| `src/common/iconify.ts` | 启动时逐条 `addIcon` 注册（3 个 UI 入口：newtab / popup / options） |
| `scripts/gen-icon-set.ts` | 读常量表 → 交给 `icon-set-build` 解析 → 写产物 |
| `src/logic/__tests__/icon-set.test.ts` | 产物与常量表的一致性、未引用常量、硬编码、可渲染性 |
| `src/logic/__tests__/icon-set-build.test.ts` | 整理逻辑单测：钉住产物形状（键排序、字段顺序）与「别名链断裂/成环/多父级都记为缺失」 |

## 为什么用 addIcon 而不是 addCollection

两条注册路径的健壮性差一个数量级：

| | 行为 |
|---|---|
| `addCollection(data)` | 先整包校验，任何一条别名父级解析不到就**丢掉整个集合**，且返回 `void`，调用方无法察觉 |
| `addIcon(name, data)` | 逐条写入，一个图标的数据有问题只影响它自己 |

因此生成期就把别名摊平成实体图标（`icon-set-build.ts`），产物里只有实体图标、没有 `aliases` 字段，运行时只调 `addIcon`。这消掉的不只是「坏别名废掉整个集合」这一类故障，也让产物格式退化成一张一维表。

## 数据源

数据源是 `@iconify/json` **全量包**，装在 devDependencies 里，路径 `node_modules/@iconify/json/json/<prefix>.json`（281 个集合，安装后约 610MB）。

早期版本刻意不把数据源写进依赖（理由就是这 610MB），代价是产物无法由仓库自身复现 —— 只能靠人记得跑脚本。加入依赖后曾按集合装 36 个 `@iconify-json/*`（约 55MB），现在改回单个全量包：devDependencies 里只留一行，新增图标集不必再改依赖，所有集合共用一个版本号。

体积只落在 `node_modules`：产物 `icon-set.json` 仍只含用到的图标（当前 151 个、约 56KB），不随数据源大小变化。CI 冷缓存会多解压约 610MB（`cache: pnpm` 命中后只付一次），换的是依赖表的一行和「装包」这一步工序的消失。

数据包缺失时脚本报出 `pnpm add -D @iconify/json` 并非 0 退出；前缀在包里找不到时报「前缀不存在」（拼写错误），而不是让人去装一个不存在的包。两种情况都**不写产物**（宁可什么都不变，也不留一份截断的图标集）。

**版本号必须写精确值（`"2.2.553"`，不带 `^`）**：`check:icons` 的承诺是「产物能由仓库现场复现」，而上游每次发版都会微调图标路径。留 `^` 时，任何人 `pnpm update` 一次就会让产物 diff 出现，与本意无关的 PR 变红 —— 那时锁住产物的其实只是 lockfile，而不是这条检查。升级 Iconify 需要一次显式的提交：改版本号 → `pnpm gen:icons` → 连同产物一起提交。

## 新增 / 更换图标

```bash
# 1. 在 icons.ts 里加常量（禁止在模板里硬编码图标名）
# 2. 重新生成图标集
pnpm gen:icons
# 3. 提交 icon-set.json 的变更
```

新增图标集**不需要动依赖**：全量包已经包含 Iconify 上所有已发布的集合，直接在常量表里写 `prefix:name` 即可。前缀拼错时生成脚本会以「前缀不存在」报出引用它的常量。

**删了常量但忘了重跑：** 产物里的死条目会被「产物里没有常量表以外的图标」这条断言拦下，提示跑 `pnpm gen:icons`。
**加了常量但没人用：** 「没有未被引用的常量」会失败。常量表是产物唯一输入，一条没人用的常量 = 一个永远用不到的图标被打进包里。
**忘了重跑：** 产物缺图标，「常量表里的图标都已收录」失败。

## 生成脚本的行为

- 输入是 `ICONS` + `COMMAND_ICONS`，按 `prefix:name` 分组，不扫源码
- 别名交给 `@iconify/utils` 的 `getIconData` 解析（Iconify 官方工具包，解析规则与 `@iconify/vue` 运行时一致，但两者是各自独立的实现）：可指向别名、`rotate` 相加取模 4、翻转异或、合并集合级默认 `width`/`height`/`left`/`top`（`addIcon` 不做这层合并，缺失会退回 Iconify 的 16 栅格）
- **多父级别名（`parent` 为数组）判为缺失** —— 运行时同样解析不了它；全量包 281 个集合里 0 例，不要为它写自定义合并
- 产物只保留渲染字段（`hidden` 不参与渲染，丢弃），字段顺序固定为 `body` → `left`/`top`/`width`/`height` → `rotate`/`hFlip`/`vFlip`
- 产物键按名称排序，保证 diff 稳定
- **退出码 1**：常量值格式非法、缺数据包（含安装不完整读不到集合文件）、图标集前缀不存在、图标名不存在（含别名链断裂）。这几种情况都**不写产物**

## 守卫覆盖什么

| 症状 | 谁来拦 |
|------|--------|
| 加了常量没跑 gen | 测试「常量表里的图标都已收录」 |
| 删了常量没跑 gen | 测试「产物里没有常量表以外的图标」 |
| 常量没人用 | 测试「没有未被引用的常量」 |
| 模板里硬编码图标名 | 测试「除 icons.ts 外没有图标名字面量」 |
| 产物被手改 / 生成逻辑出错（空 body、坏数据） | 测试「每个图标都能渲染出内容」 |
| 产物与常量表不一致（含忘了跑、手工编辑） | CI / pre-commit `pnpm check:icons`：现场重生成 + `git diff --quiet` |

最后一条是确定性校验：静态比对只能保证「名字集合对得上」，保证不了「产物就是生成器此刻会写出的内容」。

## 为什么 `logic/` 不能用 `~icons/*`

`~icons/*`（unplugin-icons）把每个图标编译成一个 Vue 组件。它很适合普通应用，但本项目的图标名是**跨上下文的数据**而不是编译期常量：`logic/shortcut/shortcut-command.ts` 里的命令 `iconName` 被 `background/messaging/port-manager.ts` 和 `contentScripts/index.ts` 直接 import。让 `logic/` 依赖图标组件，等于把 Vue 组件树拖进 SW 与 CS 的产物。

因此 `check-boundaries` 有一条 `no-virtual-component` 规则：`logic/`、`background/`、`contentScripts/` 禁止引入 `~icons/*` 这类构建期虚拟组件模块。UI 层不受限。要迁移到 unplugin-icons 之前，先读这条 —— 它会导致架构越界，不是换个写法就能绕过的。

## 踩过的坑

- **`mdi:shadow` / `mdi:format-text-shadow` 在 MDI 中不存在**，曾长期渲染空白。生成脚本的「图标名不存在」报告就是为此加的，写图标名后看一眼输出。
- **不要从 `@iconify/vue` 引入 `Icon`**：那会把远程加载逻辑带回产物。全部用 `@iconify/vue/offline`。目前没有 lint 规则强制这一点，靠 review。
- **`icon-scan.ts` 自身也会被守卫扫描**：注释里不能写出带引号的前缀冒号名称，否则会被当成真实引用报错。
- **别给前缀加黑名单**：`hh:mm`、`update:show`、`https://` 这类字面量用「前缀是否出现在常量表里」过滤即可，维护黑名单永远追不上源码里出现的下一个写法。
- 图标集合变化后 `icon-set.json` 会整体重写，评审时看「图标数量是否合理」即可，不必逐行 diff SVG 路径。
