# 样式架构

> 本文只解释「为什么这样分层、为什么有些看着像 bug 的写法不能改」。
> 具体有哪些 token、哪些选择器，去代码里 grep，不在这里抄。

## 一、入口与层叠顺序

`src/styles/index.css` 是 newtab 与 options 的样式入口，`@import` 的顺序就是层叠顺序：

| 顺序 | 文件 | 职责 | 谁在用 |
|------|------|------|--------|
| 1 | `reset.css` | 清 UA 默认样式 | newtab / options / popup |
| 2 | `tokens.css` | 唯一的颜色与尺寸来源 | newtab / options / popup |
| 3 | `global.css` | `body` 全屏基线、文字色、图标工具类 | newtab / options |
| 4 | `animations.css` | 共享关键帧 | newtab / options |
| 5 | `reka/index.css` | Reka 组件样式，一组件一文件 | newtab / options / popup |
| 6 | `font.css` | `@font-face` 与 body 字体栈 | newtab（options 引了但被覆盖，见下） |
| 7 | `driver.css` · `qweather-icons.css` · `setting-utils.css` | 第三方与模块专用样式 | 各自使用方 |

**顺序有意义，别随手调**：`font.css` 在 `global.css` 之后，所以 newtab 的 body 字体权威定义在 `font.css`，不在 `global.css`（后者原先那条 `arial, sans-serif` 是死规则，已删）。但**别把 `font.css` 当成全局唯一的 body 字体开关**：`options/App.vue` 和 `popup/App.vue` 各有一份中文优先的 body 字体覆盖，它们通过组件 `<style>` 注入、在产物里排在索引 CSS 之后，所以 options 页最终是 App.vue 赢，`font.css` 那条对 options 是死的。要改 options 的 body 字体，去改 `options/App.vue`——它用中文优先栈是因为设置面板字号小、中文占比高，与 newtab 的 Arial 栈是**刻意不同**，不是漏改。

`reka/` 在 `global.css` 之后，所以两边出现同名选择器时一定是 Reka 赢——`global.css` 里曾有一条 `.reka-input--disabled .reka-input__native { cursor: move }`，就是这样被 `reka/input.css` 永久覆盖的，已删。要覆盖 Reka，请在 `reka/` 内写更高特异性，不要赖加载顺序。

### popup 为什么只引三层

`popup/main.ts` 只引 reset + tokens + reka，**刻意不引 `global.css`**：那里的 `body` 是 `100vw/100vh/overflow:hidden` 的全屏规则，套在扩展弹窗上会把弹窗撑成满屏。

代价是 popup 必须自己补 body 属性。目前补在 `popup/App.vue` 的 `<style>` 里，其中 `color` **不能删**——但理由要写对：`NTCard`（`.reka-card`）只设 `background-color` 不设 `color`，标题和原生 `<input>` 都从 body 拿颜色；不过删掉也**不会**变成深底黑字，`tokens.css` 的 `color-scheme` 已经让 UA 默认色跟着主题走（深色下 UA 默认白字）。真正不能删的原因是**跟用户配置对齐**：用户改过页面文字色，弹窗要跟着变，且与设置面板共用同一个基线色来源。

取名沿用 `--nt-text-color-main`（用户页面文字色），**不是** `--nt-text-primary`。这是全库既有约定：

- 卡片不自己定基线文字色，继承 body —— `.setting-board` 和 `.reka-card` 都没有 `color` 声明。
- `--nt-text-primary / -secondary / -tertiary` 是用在**具体文字**上的层级 token（标题、标签、提示），不是卡片基线。
- 改成 `--nt-text-primary` 会让弹窗和设置面板的文字色来源分叉，用户自定义文字色在弹窗里失效。

## 二、三条作用域轨道

| 轨道 | 写法 | 适用 | 为什么 |
|------|------|------|--------|
| 全局组件 | `<style scoped>` | `src/setting/`、`src/components/` 里的大多数组件 | 默认选择，能拦住就拦住 |
| 全局样式块 | `<style>`（非 scoped） | 需要打到 Reka 内部、或样式必须全局唯一的组件 | 例如 `WidgetWrap` 的拖拽态类名要作用到 widget 容器上 |
| widget | `<style>` + `#widgetCode` 作根 | 所有 `src/newtab/widgets/*/index.vue` | 见下 |

### widget 为什么用 `#id` 而不是 `scoped`

widget 的根元素 `#widgetCode` 是 **`WidgetWrap` 渲染的**，不在 widget 自己的模板里：

```
.widget__wrap            ← WidgetWrap 模板
  └ .widget__root  #calendar   ← 仍是 WidgetWrap 模板，只有 WidgetWrap 的 scopeId
      └ .calendar__container   ← slot，才是 widget 自己的模板
```

Vue 只把父组件的 `scopeId` 加到子组件的**根**元素上，而 widget 的根是 `WidgetWrap`，`#calendar` 在它内部。所以 widget 写 `<style scoped> #calendar {}` 会被编译成 `#calendar[data-v-xxx]`，**永远匹配不到**——而且不报错。

### 由此产生的两件"看着该清理、其实不能动"的事

**1. `WidgetWrap` 里那批 `!important` 是承重的。** 编辑态类名（`.widget-active` / `.widget-dragging` / `.widget-delete`）挂在 widget 自己的容器上，而 widget 样式用 `#id` 起头：

```
#calendar .calendar__container  → (1,1,0)
.widget-active                  → (0,1,0)
```

同一元素上 ID 选择器必胜。换成 `[data-widget=x]` 也没用（(0,2,0) 仍大于 (0,1,0)），只有 `!important` 能保证"编辑态视觉压过用户自定义配色"。要清掉它们，得先把 widget 作用域根降到 (0,1,0) 以内（如 `:where(#calendar)`），属于一次性重构。

**2. 前缀撞车由检查脚本兜底。** widget 的变量名是命名空间（`--nt-{prefix}-{name}`），两个 widget 共用前缀时，后加的同名变量会互相覆盖，且没有报错。`pnpm check-patterns` 会拦新增的撞车；`cd`（clockDigital / countdown）是历史遗留，已列入白名单（白名单项内部再撞车，脚本救不了）。

### 变量前缀

约定：`--nt-{prefix}-{kebab-name}`，`prefix` 全库唯一、**别只用一两个字母**（`d` / `n` / `s` / `w` 这种被新 widget 撞上的概率很高，撞了只会得到一条报错，得靠改名解决）。缩写取 widget 名的首字母组合，如 `yp`=yearProgress、`cal`=calendar、`cf`=clockFlip。

本文不维护前缀清单——清单会腐烂（`docs/README.md` 硬规则 1）。要查现在就有的：

```bash
grep -rhoE "'--nt-[a-z][a-z0-9]*-" src/newtab/widgets | sort -u
```

已知的例外，看到别当 bug：

- `cd` 同时属于 clockDigital 与 countdown（历史遗留，白名单）。
- weather 的父组件用 `w`、子组件 `NowWeather.vue` 用 `wn`。**一个 widget 允许多前缀**（脚本按目录聚合，不按文件），但新增时优先沿用父级的那个。

## 三、尺寸单位双轨

| 区域 | 单位 | 机制 |
|------|------|------|
| newtab 页面、设置面板、共享组件 | `px` + `--space-*` / `--text-*` | 固定网格，随 `general.fontSize` 缩放字号 |
| widget 内部 | `vmin` | `getStyleField(code, field, 'vmin')` 直接返回带单位字符串，注入 `--nt-{prefix}-*` |

widget 不用 `px` 是刻意的：widget 之间要按比例共存、随视口整体缩放，拖拽缩放改的其实是配置里的 `vmin` 数值而不是 CSS。所以 widget 内的 `px` 只出现在边框、模糊这类"不该跟着长大"的属性上。

## 四、Token 与运行时注入

`tokens.css` 只放静态值，按"这个值在深色模式下会变吗"分三区：Primitives / Colors Light / Colors Dark。深色只覆盖差异值，不重复声明。

运行时注入的变量**不在 tokens.css 里**，grep 不到是正常的，完整清单见该文件头部注释。要点：

- `--nt-bg-main` / `--nt-text-color-main` / `--nt-primary-color` → 由 `logic/store/dom.ts` 写到 `document.body`
- `--nt-font-*`（8 级）→ 由 `dom.ts` 写到 `document.documentElement`
- `--nt-app-font-family` / `--nt-app-font-size` → 由 `newtab/App.vue` 写到 `#container`
- `--nt-{widget}-*` → 由各 widget 的 `:style` 写到自己的容器

因为 `body` 上的变量写在 `document.body` 而不是 `:root`，**Reka Portal 内容（下拉、弹窗、Tooltip）挂在 body 下，能继承到；但不会被 `#container` 上的字体变量覆盖**，所以 Portal 内容用的是 `font.css` 的 body 字体栈。这是当前的双字体栈现状，改动需同时看 `font.css` 和 `App.vue`。

另外 `tokens.css` 声明了 `color-scheme`（浅色 `light`、深色区 `dark`）。它只管**浏览器原生部分**：UA 画布底色（body 没设背景色时露出来的那层——popup 深色下圆角处发白就是它）、默认滚动条、文本选区高亮、原生控件的默认配色。它**不**管我们 CSS 里的文字与背景色，那些仍然是 token 的事。改主题时两件事都要看，但别指望其中一个替另一个干活。

## 五、已知取舍（不是 bug，先别当 bug 修）

1. **设置面板字号是混着的**：一部分用 `var(--text-*)`、一部分写死 `px`。方向未定——如果认定"面板不随用户字号缩放"，那要收敛的是 `--text-*` 那部分；反过来就要改死 `px` 那部分。改之前先定方向。
2. **`--text-*` 只暴露 5 级**，JS 侧生成 8 级。缺的 3 级变量是存在的（`var(--nt-font-xl)`），只是还没有第二个使用方，所以没有对应的 `--text-*` 别名。
3. **z-index 没有统一 token**：widget 用 `--nt-z-index`（`WidgetWrap` 按交互顺序算），Reka Portal 用固定层级（表单下拉 3000 / 菜单 4000 / Popover 9999 / Tooltip 10000，见 [reka-ui.md](reka-ui.md)）。两套值域不同，是刻意的：widget 之间要相对排序，Portal 要盖住一切。
4. **`reka-template.css` 不参与编译**，它是新增 Reka 组件时复制的模板。放在 `src/styles/` 里是为了和实际组件挨着，禁止 `@import`。
5. **Portal 内容仍继承页面文字色**。下拉、弹窗、Tooltip 挂在 body 下，拿到的是 `--nt-text-color-main`（用户壁纸文字色）。默认配置下深浅模式都正常，只有用户把页面文字色改成极端值时才可能撞色。popup 走的是**同一个** `--nt-text-color-main`（§一 解释了为什么不用 `--nt-text-primary`），所以它和 newtab 是同一个风险、不是已解决项。要彻底解决得给每个 `__content` 单独定基线，选择器列表容易漂，暂不动。
