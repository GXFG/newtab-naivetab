# 键盘系统架构

## 概述

键盘系统负责在 NaiveTab 新标签页中渲染可定制的虚拟键盘，支持 19 种布局、3 种键帽视觉风格、81 个预设配色方案。键盘与书签 Widget（`keyboardBookmark`）和全局命令快捷键共享视觉渲染逻辑。

**业务范围：** 本文档描述通用键盘引擎（布局、渲染、主题、拖拽）。Widget 专属内容（书签绑定、keymap、事件处理）详见 [keyboard-bookmark-widget.md](../widgets/keyboard-bookmark-widget.md)。

---

## 配置命名空间

| 命名空间 | 配置文件 | 用途 |
|----------|----------|------|
| `keyboardCommon` | `src/logic/config/defaults.ts` | 键盘视觉样式（布局、键帽、外壳、配色） |
| `keyboardBookmark` | `src/newtab/widgets/keyboardBookmark/config.ts` | Widget 业务数据（keymap、位置、来源模式） |

另有 `keyboardCommand` 配置在 `src/logic/shortcut/shortcut-command.ts` 中——**不是可视 Widget**，是全局命令快捷键系统。

---

## 键盘布局系统

### 文件

- `src/logic/keyboard/keyboard-layout.ts` — 布局定义与运行时转换（WKL/Mac 替换/空格分割）
- `src/logic/keyboard/keyboard-constants.ts` — 按键默认配置（label/size/textAlign）、强调键集合、`ALL_KEYBOARD_CODES`
- `src/logic/config/defaults.ts` — `KEYBOARD_COMMON_CONFIG` 默认配置
- `src/logic/keyboard/themes/` — 80+ 预设配色方案（4 大系列，6 个文件）
- `src/logic/keyboard/keyboard-options.ts` — UI 选择器选项（键盘类型、空格拆分、键帽类型、禁用按键列表）
- `src/logic/bookmark/api.ts` — 浏览器书签读取 API 封装（`getBrowserBookmark`、`getFaviconFromUrl`）
- `src/logic/bookmark/parser.ts` — 书签解析器（解析 chrome.bookmarks 构建 keymap、`findFolderByPath`）
- `src/logic/bookmark/mutations.ts` — 书签变更操作（`swapBookmarksInSourceFolder`、`removeBookmarkFromSourceFolder`）
- `src/logic/keyboard/bookmark-export.ts` — 书签导出模块（`exportKeymapToBrowser`、`addBookmarkToSourceFolder`）
- `src/logic/keyboard/layouts/` — 19 种键盘布局定义（key33~key104、hhkb），统一导出自 `layouts/index.ts`

### 可用布局（19 种）

`key33`, `key45`, `key47`, `key53`, `key61`, `key64`, `key66`, `key67`（默认）, `key68`, `key80`, `key81a`, `key81b`, `key84`, `key87`, `key96a`, `key96b`, `key98`, `key104`, `hhkb`

### 布局数据结构

```ts
// 单个键位定义（坐标系统）
interface TKeyDefinition {
  code: string            // KeyboardEvent.code（如 'Escape', 'KeyA'）
  x: number               // 水平坐标（以 1u 键宽为单位）
  y: number               // 垂直坐标（以 1u 键高为单位）
  w?: number              // 宽度，默认 1（支持 1.5, 2.25 等分数/小数）
  h?: number              // 高度，默认 1
  label?: string          // 显示标签，回退到 KEYBOARD_CODE_TO_DEFAULT_CONFIG
  textAlign?: 'left' | 'center' | 'right'  // 文字对齐
}

// 完整键盘布局定义
interface TKeyboardDefinition {
  id: string                              // 布局唯一标识（如 'key67'）
  name: string                            // 布局名称（如 '67'）
  keys: TKeyDefinition[]                  // 所有键位的坐标数组
  emphasisOneCodes?: string[]             // 强调色组 1（修饰键、功能键等）
  emphasisTwoCodes?: string[]             // 强调色组 2（Escape、Enter、方向键等）
}
```

**核心变化（v2.3.0）：** 布局从 `list: string[][]`（二维行数组 + flex 渲染）改为 `keys: TKeyDefinition[]`（坐标数组 + 绝对定位）。优势：
- 支持跨行/跨列键位（如 104 键大回车、数字键盘 0 键）
- 每个键独立控制位置、宽高、标签、对齐
- 为未来自定义名牌和拖拽建键盘奠定基础
- 消除 flex 布局的转换层，预设直接手写坐标定义

旧版 `list` 和 `custom` 字段已被移除，所有读取逻辑直接基于 `keys` 数组。

### 运行时转换

1. **强调键注入**：所有布局自动注入 `emphasisOneCodes` 和 `emphasisTwoCodes`（来自 `keyboard-constants.ts`）
2. **WKL 模式**：`localConfig.keyboardCommon.keyboardWklMode` 为 `true` 时，移除最后一行的 Win/Meta 键
3. **Mac 自动替换**：非 WKL 模式且用户为 macOS 时，交换最后一行 `AltLeft <-> MetaLeft` 和 `AltRight <-> MetaRight` 的 x 坐标
4. **空格分割**：`localConfig.keyboardCommon.splitSpace` 为 `'space2'` 或 `'space3'` 时，删除最后一行原有 `Space` 相关键，插入新的 `Space`/`SpaceSplit1`/`SpaceSplit2` 坐标定义

### 核心导出

```ts
/** 当前布局的完整坐标定义（结构化深拷贝，避免修改冻结的默认配置） */
const currKeyboardConfig: ComputedRef<TKeyboardDefinition>
// 返回值示例：
// {
//   id: 'key67',
//   name: '67',
//   keys: [
//     { code: 'Escape', x: 0, y: 0, w: 1, label: 'Esc', textAlign: 'left' },
//     { code: 'Digit1', x: 1, y: 0 },
//     ...
//   ],
//   emphasisOneCodes: [...],
//   emphasisTwoCodes: [...],
// }

/** 当前布局所有按键的 code 数组 */
const keyboardCurrentModelAllKeyList: ComputedRef<string[]>
```

---

## 按键映射与标签

### `KEYBOARD_CODE_TO_DEFAULT_CONFIG`（`keyboard-constants.ts`）

将每个 `KeyboardEvent.code` 映射到 `{ label, textAlign, size }`：

- **OS 感知标签**：Mac 显示小写 `esc`/`delete`/`return`/`caps lock`/`shift`/`control`/`fn`，Windows 显示大写 `Esc`/`Delete`/`Enter`/`Caps Lock`/`Shift`/`Ctrl`/`Fn`
- **Mac 修饰键符号**：`control` → `^`，`MetaLeft` → `⌘`，`AltLeft` → `⌥`
- 部分按键有 `alias` 属性（如 `ShiftLeft.alias = 'LShift'`）
- `size` 表示按键宽度（相对于标准 1u 键）

### 自定义覆盖解析（`useKeyboardStyle.ts`）

```ts
getCustomLabel(code)     // custom[code]?.label ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].label
getCustomTextAlign(code) // custom[code]?.textAlign ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].textAlign
getKeycapWidthValue(code) // custom[code]?.size ?? KEYBOARD_CODE_TO_DEFAULT_CONFIG[code].size
```

### 键盘 Widget 屏蔽的按键

`KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET` 屏蔽修饰键（Shift、Ctrl、Meta、Alt）和 Space，这些键透传给浏览器默认行为。

---

## 键帽渲染系统

### 三层组件架构

```
KeyboardLayout（容器）
  └── KeyboardKeycapWidget（单键包装，使用 useKeyboardStyle）
        └── KeyboardKeycapDisplay（纯展示组件）
```

#### 1. KeyboardKeycapDisplay（纯展示）

`src/components/KeyboardKeycapDisplay.vue`

Props: `keyCode`, `label`, `name`, `visualType`, `iconSrc`, 样式字符串, 可见性开关。

**视觉层次（从外到内）：**
```
row__keycap（基础边框/阴影，按类型差异化：flat/gmk/dsa）
  keycap__stage（顶面，类型差异化渐变/内阴影）
    keycap__label  （键位标识，如 'A' / 'Enter'）
    keycap__img    （favicon）
    keycap__name   （书签名称）
```

#### 2. 三种键帽视觉类型（KeycapVisualType）

| 类型 | 特征 |
|------|------|
| `gmk` | Cherry 轮廓模拟——非对称边框（底部更厚）、多层内阴影、顶面负边距收窄 |
| `dsa` | 球形等高——四面均匀边框、径向渐变顶面、圆角 +2px |
| `flat` | 极简——微妙内渐变、顶部高光线、标准边框 |

**按下动画**：`row__keycap--active` 应用 `translateY(var(--nt-kb-active-translate-y))`（约 4.3%）+ `brightness(0.92)`，GMK 阴影从 3px 降至 1px。

#### 3. KeyboardLayout（容器）

`src/components/KeyboardLayout.vue`

**渲染架构：** 使用绝对定位渲染所有键位。每个键位通过 `getLayoutKeyStyle(keyDef)` 计算 `{ left, top, width, height }`，绑定到 `.keyboard-layout__keycap-wrap` 的 `:style`。

**Shell 尺寸计算：** 容器尺寸 = 键位范围 + 2 × shell padding + 2px（border 补偿），确保开启外壳时键盘整体居中于容器内。
- 键位 left/top 包含 shell padding 偏移，不会紧贴外壳边缘
- Shell 有 1px 四边 border，`box-sizing: border-box` 下 border 吃掉 content-box 空间，需在容器尺寸中补回 2px
- vmin 模式下 padding 和 border 按 `keycapSize` 比例缩放

渲染三层视觉结构：
- **Shell**：外壳，玻璃模糊、渐变高光、顶部高光线、投影
- **Plate**：内板（PCB 底板），在键帽间可见，延伸 `platePadding` 超出键帽边界，`z-index: -1`
- **Keycaps**：通过 `#keycap` 插槽渲染，调用方决定内容

暴露 `#keycap` 插槽，参数 `{ code, rowIndex }`。

#### 4. useKeyboardStyle（可组合函数）

`src/composables/useKeyboardStyle.ts`

```ts
function useKeyboardStyle(unit: 'vmin' | 'px', baseSizeOverride?: number)
```

**返回值：**
| 返回值 | 作用 |
|--------|------|
| `base: ComputedRef<number>` | 根据 `keycapSize` 计算（vmin 模式）或使用覆盖值（px 模式） |
| `keycapCssVars` / `layoutCssVars` | CSS 变量名 → 值的映射对象 |
| `getCustomLabel(code)` | 解析标签文本（优先 `keys[].label`，回退到默认配置） |
| `getCustomTextAlign(code)` | 解析文字对齐（优先 `keys[].textAlign`，回退到默认配置） |
| `getKeycapWidthValue(code)` | 获取键帽宽度原始数值（优先 `keys[].w`，回退到默认 `size`） |
| `getKeycapStageStyle(code)` | GMK/DSA 立体偏移（含纵向扩展键高度适配） |
| `getKeycapTextStyle(code)` | text-align + 条件 padding |
| `getKeycapIconStyle(code)` | justify-content + 条件 padding |
| `getEmphasisGroup(code)` | 返回 0/1/2（普通/强调1/强调2） |
| `getEmphasisStyle(code)` | 强调背景 + 字体颜色内联样式 |
| `getLayoutKeyStyle(keyDef)` | 计算单个键的绝对定位样式 `{ left, top, width, height }` |

**单位转换**：`toUnit(value, unit)` — vmin 模式乘以 0.1，px 模式追加 'px'。约定 `1vmin ~ 10px`（1000px 视口）。

### 纵向扩展键帽渲染（h > 1）

部分布局（如 `key104`、`key96`、`key98`）中小键盘的 `+`、`Enter` 等按键高度为 `h: 2`（占两行）。`getLayoutKeyStyle` 已正确设置 wrapper 高度为 `h × base`，但 `getKeycapStageStyle` 中 GMK/DSA 型别的 stage 高度原本使用固定值（`gmkStageHeightCss` ≈ `0.76 × base`），不会自动跟随 h 倍率。

**处理逻辑：** `getKeycapStageStyle` 通过 `findKey(code)?.h` 检测 `isVerticallyExpanded = true` 时，stage 高度改为 `calc(100% + margin补偿)`，撑满 wrapper 全部高度。宽度计算与普通键一致（保留 GMK/DSA 的立体收窄效果）。

**CSS 变量前缀**：所有键盘变量使用 `--nt-kb-*` 前缀。

**键帽尺寸单位约定**：配置值以 **px 量级**存储（如 `keycapSize: 58`）。vmin 模式下 `value / keycapSize * base * 0.1` 生成比例 vmin 值，确保所有维度随 `keycapSize` 等比缩放。

---

## 键帽主题预设

`src/logic/keyboard/themes/` — 81 个预设主题，分 4 组 6 文件：

| 分组 | 数量 | 示例 |
|------|------|------|
| `KEYCAP_CLASSIC_MAP` | 32 | Light, White on Black, Dolch, Godspeed |
| `KEYCAP_ATMOSPHERE_MAP` | 21 | Nord, Sakura, Mocha, Aurora |
| `KEYCAP_STUDIO_MAP` | 21 | Dracula, Gruvbox, Tokyo Night, Catppuccin |
| `KEYCAP_PREMIUM_MAP` | 7 | Cashmere, Titanium, Obsidian |

每个主题定义 7 个颜色字段：`shellColor`, `mainFontColor`, `mainBackgroundColor`, `emphasisOneFontColor`, `emphasisOneBackgroundColor`, `emphasisTwoFontColor`, `emphasisTwoBackgroundColor`。

**注意：** 主题为单色（非双主题数组）。`PresetThemeDrawer` 设置组件写入双主题数组的 `[0]`（浅色）和 `[1]`（深色）索引。

---

## keyboardCommon 配置字段

```
keyboardCommon 配置（约 30 个字段）：
├── 布局类
│   ├── keyboardType          // 布局类型
│   ├── splitSpace             // 空格分割 ('space1' | 'space2' | 'space3')
│   ├── keyboardWklMode        // WKL 无 Win 键模式
│   └── keycapType             // 键帽视觉风格 ('gmk' | 'dsa' | 'flat')
├── 键帽类
│   ├── keycapPadding / keycapSize / keycapBorderRadius
│   ├── isKeycapBorderEnabled / keycapBorderWidth / keycapBorderColor
│   └── keycapBackgroundBlur
├── 外壳类
│   ├── isShellVisible
│   ├── shellVerticalPadding / shellHorizontalPadding / shellBorderRadius
│   ├── shellColor
│   └── isShellShadowEnabled / shellShadowColor
├── 内板类
│   ├── isPlateVisible / platePadding / plateBorderRadius
│   ├── plateColor / plateBackgroundBlur
├── 内容类
│   ├── isCapKeyVisible / keycapKeyFontFamily / keycapKeyFontSize
│   ├── isNameVisible / keycapBookmarkFontFamily / keycapBookmarkFontSize
│   ├── isFaviconVisible / faviconSize
│   └── isTactileBumpsVisible
├── 颜色类（双模式数组 [浅色, 深色]）
│   ├── mainFontColor / mainBackgroundColor
│   ├── emphasisOneFontColor / emphasisOneBackgroundColor
│   └── emphasisTwoFontColor / emphasisTwoBackgroundColor
└── 覆盖类
    └── emphasisKeyOverrides: Record<string, 0 | 1 | 2>  // 用户自定义强调分组
```

**PRESERVE_FIELDS** = `['keyboardType', 'keycapType', 'emphasisKeyOverrides']`

---

## moveable 拖拽系统

详见 [moveable.md](../architecture/moveable.md)。

---

## 重要设计模式与避坑

1. **计算属性深拷贝**：`currKeyboardConfig` 使用 `structuredClone(target)` 避免修改冻结的默认配置。直接修改返回值无效。

2. **Mac 自动替换的条件执行**：Alt/Meta 交换仅在非 WKL 模式下执行。WKL 模式下直接移除 Win 键，不触发交换。已设 `isMacOS: true` 的布局（如 `hhkb` 中特殊键位定义）跳过交换。

3. **CSS 变量 TDZ**：`--nt-kb-*` CSS 变量由 `useKeyboardStyle` 的计算引用驱动，必须在键帽组件挂载前可用（在 setup 时调用 composable 保证）。

4. **强调覆盖优先级**：`emphasisKeyOverrides`（用户自定义）优先于布局定义的 `emphasisOneCodes`/`emphasisTwoCodes`。

5. **空格分割坐标替换**：启用 `splitSpace` 时，删除最后一行原有 Space 相关键（`Space`/`SpaceSplit1`/`SpaceSplit2`），从 Space 原始 x 起点依次插入变体键。变体键的 x 坐标由运行时累加计算，非预设值。

6. **KeyboardLayout 内板渲染**：内板 div（`keyboard-layout__keycap-plate`）渲染在每个 `__keycap-wrap` 内部，而非单个横跨元素。因此仅覆盖单个键帽区域。

7. **拖拽坐标系统**：Widget 位置使用 `vw`/`vh` 百分比，非像素。这使它们对视口变化具有响应性。

8. **KeyboardKeycapDisplay 是纯组件**：所有样式通过 CSS 变量和内联样式传入。不包含业务逻辑（URL 获取、事件分发）。

9. **键帽尺寸单位约定**：配置值以 px 等效整数存储（如 `keycapSize: 58`）。`toUnit()` 转换：`58 * 0.1 = 5.8vmin`。1000px 视口下 5.8vmin = 58px。修改 `keycapSize` 会等比缩放所有派生维度（padding、border-width、font-size 等）。

10. **绝对定位 + shell padding 居中**：仅外壳可见时，键位 left/top = `坐标 × base + padding 偏移`；外壳隐藏时 padding 偏移为 0。容器宽度 = `键位范围 + 2 × padding（外壳可见时） + 2px border 补偿`。vmin 模式下 padding 和 border 补偿需按 `keycapSize` 比例缩放，避免 `parseFloat` 剥离单位导致的尺寸偏差。

11. **纵向扩展键帽（h > 1）stage 高度**：小键盘 `+`/`Enter` 等 `h: 2` 键的 wrapper 高度为 `2 × base`，但 GMK/DSA 的 stage 原本使用固定高度（`0.76 × base` / `0.694 × base`），不会自动撑满。`getKeycapStageStyle` 中通过 `findKey(code)?.h` 检测纵向扩展键，将高度改为 `calc(100% + margin补偿)`。宽度计算与普通键一致，保留立体收窄效果。
