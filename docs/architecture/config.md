# 配置系统架构

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/config/defaults.ts` | 默认配置定义、`useStorageLocal` key 生成、Widget 配置自动扫描 |
| `src/logic/config/merge.ts` | 递归合并函数 `mergeState` |
| `src/logic/config/update.ts` | 版本迁移 `handleAppUpdate`、配置更新 `updateSetting` |
| `src/logic/config/migrate.ts` | 声明式字段迁移 `normalizeLegacyConfig`（导入/升级共用） |
| `src/logic/store.ts` | 三层配置暴露（`localConfig`/`localState`/`globalState`）、`getStyleField` |
| `src/newtab/widgets/**/config.ts` | 各 Widget 默认配置（通过 glob 自动扫描） |
| `src/types/global.d.ts` | `ConfigField` 等类型定义 |

> 存储与同步机制的详细文档见 [storage.md](storage.md)，涵盖：useStorageLocal 实现、防抖写入、Gzip 压缩、版本感知同步、Chrome 配额管理、导入/导出等。

## 三层配置架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          配置三层架构                                    │
├──────────────────┬──────────────────┬───────────────────────────────────┤
│   localConfig    │    localState    │          globalState              │
├──────────────────┼──────────────────┼───────────────────────────────────┤
│ 用途：Widget 和  │ 用途：运行时本地  │ 用途：UI 运行时状态                │
│ 通用功能配置      │ 状态（外观、同步  │ （面板开关、全屏、字体列表等）      │
│                  │ 状态、专注模式）  │                                   │
│ 持久化：是        │ 持久化：是        │ 持久化：否                         │
│ 存储：localStorage│ 存储：localStorage│ 存储：内存（reactive）             │
│ 每个字段独立 key │ 单一 key: l-state │ 组件卸载即消失                     │
│ 云同步：是        │ 云同步：部分       │ 云同步：否                         │
│                  │ (isUploadConfig...)│                                  │
├──────────────────┼──────────────────┼───────────────────────────────────┤
│ general          │ currAppearanceCode│ settingMode                       │
│ keyboardCommon   │ currAppearanceLabel│ isSettingDrawerVisible           │
│ keyboardCommand  │ isUploadConfigStatusMap│ isGuideMode                  │
│ keyboardBookmark │ isFocusMode       │ isFullScreen                      │
│ bookmarkFolder   │                  │ availableFontList                 │
│ calendar         │                  │ isSearchFocused                   │
│ search           │                  │ isInputFocused                    │
│ ... (各 widget)  │                  │ currSettingTabCode                │
└──────────────────┴──────────────────┴───────────────────────────────────┘
```

### localConfig

所有 Widget 和通用功能的配置数据。通过 `reactive(createLocalConfig())` 创建，每个配置字段是独立的 `Ref`，由 `useStorageLocal` 返回。

```ts
// src/logic/store.ts
export const localConfig: typeof defaultConfig = reactive(createLocalConfig())
```

`createLocalConfig` 为每个字段调用 `useStorageLocal`，key 规则：
- `general` → `'c-general'`
- `keyboardCommon` → `'c-keyboardCommon'`
- `keyboardCommand` → `'c-keyboardCommand'`
- 各 Widget → `'c-{widgetCode}'`（如 `'c-keyboardBookmark'`）

### localState

运行时本地状态，单一 `Ref`，key 为 `'l-state'`。包含外观切换、云同步状态跟踪、专注模式开关等。

```ts
// src/logic/store.ts
export const localState = useStorageLocal('l-state', defaultLocalState)
```

`isUploadConfigStatusMap` 是其中的关键子结构，跟踪每个 `ConfigField` 的同步状态：

```ts
interface UploadStatusItem {
  loading: boolean        // 是否正在上传
  syncTime: number        // 云端同步时间戳
  syncId: string          // 云端数据的 MD5 哈希
  localModifiedTime: number // 本地最后修改时间戳
  dirty: boolean          // 本地是否有未同步的修改
}
```

### globalState

纯内存状态，不持久化，不云同步。驱动 UI 行为（设置面板开关、全屏状态、可用字体列表等）。

```ts
// src/logic/store.ts
export const globalState = reactive({
  settingMode: 'drawer' as 'drawer' | 'options',
  isSettingDrawerVisible: false,
  isGuideMode: false,
  isFullScreen: !!document.fullscreenElement,
  availableFontList: [] as string[],
  // ...
})
```

### 引用关系

```
localConfig.general.appearance ──watch──▶ localState.currAppearanceCode
localState.currAppearanceCode ──────────▶ getStyleField 颜色读取
localState.isUploadConfigStatusMap ─────▶ sync/core.ts 同步决策
globalState.isSettingDrawerVisible ─────▶ 键盘事件屏蔽
```

## 本地存储与云同步

本地存储使用 `useStorageLocal`（800ms 防抖写入 localStorage），云同步使用 `chrome.storage.sync`（2000ms 防抖 + Gzip 压缩 + 版本感知合并）。详细实现、防抖机制、压缩策略、配额管理、故障恢复、跨标签页同步等均见 [storage.md](storage.md)。

配置修改后的数据流概览：

```
用户在设置面板修改某个字段
         │
         ▼
   localConfig[field].xxx = newValue
         │
         │ (Vue 响应式触发)
         ▼
   ┌─────┴─────┐
   │           │
   ▼           ▼
 localStorage  chrome.storage.sync
  写入          上传流程
 800ms防抖     2000ms防抖
   │           │
   ▼           ▼
 c-{field}   naive-tab-{field}
             SyncPayload{syncTime, syncId, appVersion, data}
```

## 配置扫描与初始化

### Widget 配置自动扫描

```ts
// src/logic/config/defaults.ts
const widgetsDefaultConfig = (() => {
  const modules = import.meta.glob('../../newtab/widgets/**/config.ts', { eager: true })
  const map: Record<string, any> = {}
  for (const key in modules) {
    const m = modules[key]
    if (m && m.WIDGET_CODE && m.WIDGET_CONFIG) {
      map[m.WIDGET_CODE] = m.WIDGET_CONFIG
    }
  }
  return map as WidgetConfigByCode
})()

export const defaultConfig = {
  general: generalConfig,
  keyboardCommon: KEYBOARD_COMMON_CONFIG,
  keyboardCommand: KEYBOARD_COMMAND_CONFIG,
  ...widgetsDefaultConfig,
}
```

**每个 Widget 的 `config.ts` 必须导出：**
- `WIDGET_CODE`：字符串常量，唯一标识
- `WIDGET_CONFIG`：默认配置对象
- `PRESERVE_FIELDS`（可选）：快速重置时需保留的字段

### PRESERVE_FIELDS 机制

用于 Widget 包含**用户自定义数据**（如键盘按键映射、书签文件夹选中列表）的场景。在"快速重置"时保留这些数据，不被默认值覆盖。

```ts
// src/newtab/widgets/keyboardBookmark/config.ts
export const PRESERVE_FIELDS = ['source', 'globalShortcutModifiers', 'keymap']
```

系统通过 `import.meta.glob` 扫描所有 `config.ts` 中的 `PRESERVE_FIELDS`，无需手动注册。

`enabled` 和 `layout` 总是被保留，无需重复声明。

### 配置初始化流程

```
应用启动
  │
  ▼
import.meta.glob 扫描所有 config.ts
  │
  ▼
构建 defaultConfig 对象
  │
  ▼
createLocalConfig()
  ├── useStorageLocal('c-general', defaultConfig.general)
  ├── useStorageLocal('c-keyboardCommon', defaultConfig.keyboardCommon)
  ├── useStorageLocal('c-keyboardCommand', defaultConfig.keyboardCommand)
  └── 遍历 WIDGET_CODE_LIST → useStorageLocal('c-{widgetCode}', defaultConfig[key])
  │
  ▼
reactive() 包装 → localConfig（响应式）
  │
  ▼
useStorageLocal 初始化：
  ├── 读取 localStorage 已有值
  ├── 浅层合并 { ...defaultValue, ...value }
  └── 写入缺失的默认值
```

## 配置迁移系统

### 版本比较工具

```ts
// src/logic/util.ts
export const compareLeftVersionLessThanRightVersions = (left: string, right: string): boolean => {
  // '1.20.0' < '1.21.0' → true
  // '2.0.0' < '1.27.0' → false
}
```

按语义版本号逐段比较（Major.Minor.Patch），缺失段补 0。

### handleAppUpdate 迁移流程

```ts
// src/logic/config/update.ts
export const handleAppUpdate = () => {
  const version = getLocalVersion()
  if (!compareLeftVersionLessThanRightVersions(version, window.appVersion)) {
    return  // 已是最新版本，无需迁移
  }

  // 按版本号依次执行迁移分支
  if (compareLeftVersionLessThanRightVersions(version, '1.20.0')) { /* ... */ }
  if (compareLeftVersionLessThanRightVersions(version, '1.21.0')) { /* ... */ }
  if (compareLeftVersionLessThanRightVersions(version, '2.2.2')) { /* ... */ }

  // 迁移完成后更新版本号
  localConfig.general.version = window.appVersion
  updateSetting()  // 异步整理配置结构
}
```

**注意：使用 `if` 而非 `if-else`**，确保跨越多个版本的旧用户能依次执行所有迁移。

### 迁移历史梳理

| 版本 | 变更 | 类型 |
|------|------|------|
| `1.20.0` | `keyboardBookmark.source` 初始化、`defaultExpandFolder` 新增 | 新增字段 |
| `1.21.0` | `search.isNewTabOpen` 新增 | 新增字段 |
| `1.23.1` | `clockDigital.width` 计算新增、`letterSpacing` 删除 | 新增+删除字段 |
| `1.24.0` | `general.timeLang` 从 `lang` 拆分、`yearProgress` 整体初始化 | 字段拆分+嵌套初始化 |
| `1.24.3` | `general.backgroundColor` 重置为默认值（修复颜色结构） | 嵌套重置 |
| `1.25.9` | `calendar.festivalCountdown` 新增 | 新增字段 |
| `1.27.0` | 专注模式架构重构：`isFocusMode` 新增、`focusVisibleWidgetMap` 初始化、`backgroundBlur` 多 Widget 新增、`bookmarkFolder.enabled` 新增 | 大规模新增字段 |
| `2.0.0` | `clockFlip.enabled` 新增 | 新增字段 |
| `2.2.0` | `keyboardBookmark.isGlobalShortcutEnabled` 从旧字段迁移、全局快捷键架构变更通知、Arial→system 字体迁移 | 字段重命名+值迁移 |
| `2.2.2` | `focusVisibleWidgetMap` 重置、`keyboard`→`keyboardBookmark` 数据迁移、`commandShortcut`→`keyboardCommand` 迁移、`isFocusMode` 从 localConfig 迁移到 localState | 大规模字段重命名+跨层迁移 |

### 嵌套对象迁移 vs 扁平字段迁移

**扁平字段新增**（简单）：直接赋值即可，浅合并会自动补全。
```ts
localConfig.search.isNewTabOpen = false
```

**嵌套对象新增**（需要手动）：浅合并不处理嵌套层，必须显式赋值整个嵌套结构。
```ts
// yearProgress 整体是嵌套对象，旧用户可能完全没有这个 key
localConfig.yearProgress = defaultConfig.yearProgress
```

**字段重命名**（必须迁移旧值）：
```ts
// general.timeLang 从 general.lang 拆分
localConfig.general.timeLang = localConfig.general.lang
```

**跨层迁移**：
```ts
// isFocusMode 从 localConfig.general（云同步）迁移到 localState（仅本地）
const oldFocusMode = (localConfig.general as any).isFocusMode
if (oldFocusMode !== undefined) {
  localState.value.isFocusMode = oldFocusMode
  delete (localConfig.general as any).isFocusMode
}
```

**旧 key 数据迁移到新 key**（如 `c-keyboard` → `c-keyboardBookmark`）：
```ts
const localKeyboardData = localStorage.getItem('c-keyboard')
if (localKeyboardData) {
  const localKeyboardConfig = JSON.parse(localKeyboardData)
  const keyboardBookmarkFields = Object.keys(defaultConfig.keyboardBookmark)
  for (const field of keyboardBookmarkFields) {
    localConfig.keyboardBookmark[field] = localKeyboardConfig[field]
  }
  localStorage.removeItem('c-keyboard')
}
```

### 配置迁移最佳实践

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 新增扁平字段 | 在 `handleAppUpdate` 中赋值 | 只改 `defaultConfig` |
| 新增嵌套对象 | 整体赋值 `defaultConfig.xxx` | 只依赖浅合并 |
| 重命名字段 | 新字段=旧字段值 → delete 旧字段 | 直接改字段名 |
| 删除字段 | 先 `delete` 旧值 → 再删 `defaultConfig` | 直接从 `defaultConfig` 删 |
| 修改类型 | 新增替代字段 + 迁移 | 直接改类型 |
| 数组配置补全 | 迁移中补齐缺失元素 | 不处理 |

**黄金法则：** 每次修改配置结构都必须同步升 `package.json` 版本号，并在 `handleAppUpdate` 中写迁移逻辑。

## mergeState 合并函数

```ts
// src/logic/config/merge.ts
export const mergeState = (state: unknown, acceptState: unknown): unknown
```

**合并规则（按优先级）：**

| 规则 | 条件 | 行为 |
|------|------|------|
| 1 | `acceptState` 为空 | 使用 `state`（默认值） |
| 2 | 类型不同 | 使用 `state`（处理类型变更） |
| 3 | 基础类型 | 直接使用 `acceptState` 的值 |
| 4 | 数组等非纯 Object | 直接使用 `acceptState` 的值 |
| 5 | keymap 特殊对象 | 直接使用 `acceptState` 的值（Key*/Digit*/Numpad* 键名检测） |
| 6 | 普通对象 | 递归合并，**只保留 `state` 中定义的字段** |

**核心设计目标：**
- 以 `state`（默认配置）为模板，过滤掉 `acceptState` 中的未知/废弃字段
- 保留 `state` 中新增字段的默认值
- 安全处理特殊数据结构（如 `keymap`）

## 主题与颜色系统

### 双元素数组驱动

所有颜色字段必须是双元素数组 `[浅色值, 深色值]`：

```ts
fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)']
//          ↑ index 0: 浅色              ↑ index 1: 深色
```

`currAppearanceCode`（0=浅色，1=深色）驱动自动切换：
- `localConfig.general.appearance === 'auto'` 时，跟随 `useOsTheme()`
- `'light'` / `'dark'` 时，强制指定

```ts
// 外观变化监听（src/logic/store.ts）
watch([osTheme, () => localConfig.general.appearance], () => {
  if (localConfig.general.appearance === 'auto') {
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[osTheme.value]
  } else {
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[localConfig.general.appearance]
  }
}, { immediate: true })
```

### getStyleField 完整用法

```ts
// src/logic/store.ts
export const getStyleField = (configCode: ConfigField, field: string, unit?: string, ratio?: number) => {
  return computed(() => {
    const fieldList = field.split('.')
    let targetValue = fieldList.reduce((r, c) => r[c], localConfig[configCode])

    if (Array.isArray(targetValue)) {
      // 颜色：自动取当前主题对应值
      return targetValue[localState.value.currAppearanceCode]
    }
    if (typeof targetValue !== 'number') return targetValue

    if (ratio) targetValue *= ratio
    if (unit) {
      if (unit === 'vmin') targetValue *= 0.1  // px → vmin 转换
      targetValue = `${targetValue}${unit}`
    }
    return targetValue
  })
}
```

**用法示例：**

```ts
// 颜色（自动取当前主题）
const fontColor = getStyleField('clockDigital', 'fontColor')
// → 'rgba(44, 62, 80, 1)' 或 'rgba(255, 255, 255, 1)'

// 数字 + px 单位
const borderRadius = getStyleField('search', 'borderRadius', 'px')
// → '4px'

// 数字 + vmin 单位（自动 ×0.1）
const fontSize = getStyleField('clockDigital', 'fontSize', 'vmin')
// fontSize=14 → '1.4vmin'

// 嵌套字段
const unitSize = getStyleField('clockDigital', 'unit.fontSize', 'vmin')

// 倍率
const gap = getStyleField('clockDigital', 'fontSize', 'vmin', 0.2)
// fontSize×0.2×0.1 → vmin
```

### CSS v-bind 注入

在 `<style>` 中通过 `v-bind()` 引用 `computed` 变量：

```vue
<script setup lang="ts">
import { getStyleField } from '@/logic/store'

// ⚠️ v-bind 变量必须放在最顶部（TDZ 陷阱，见 CLAUDE.md）
const WIDGET_CODE = 'clockDigital'
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
</script>

<style scoped>
#widgetCode .clockDigital__container {
  font-size: v-bind(customFontSize);
  color: v-bind(customFontColor);
}
</style>
```

### 主题色派生色

通过 `customPrimaryColor`（来自 `@/logic/store`）正则替换 alpha 通道生成半透明版本：

```ts
export const customPrimaryColor = getStyleField('general', 'primaryColor')
```

`colorMixWithAlpha` 工具函数生成 `color-mix` 表达式：

```ts
export const colorMixWithAlpha = (color: string, alpha: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
```

## 常见坑点与注意事项

### 1. TDZ 陷阱：CSS v-bind 变量声明顺序

所有 CSS `v-bind()` 引用的变量，必须声明在 `<script setup>` 最顶部（imports 之后、任何逻辑代码之前）。生产模式下 Vue SFC 编译器在顶部生成 `useCssVars()` 同步调用，变量未声明会触发 `ReferenceError`。

### 2. 浅合并不处理嵌套对象

`useStorageLocal` 初始化只浅层合并 `{ ...defaultValue, ...value }`。嵌套对象中新增字段**不会自动补全**，必须在 `handleAppUpdate` 中手动赋值。

### 3. 删除字段的正确顺序

**不能**直接从 `defaultConfig` 删除字段。必须先：
1. 在 `handleAppUpdate` 中 `delete` 老用户的旧值
2. 再从 `defaultConfig` 中移除字段定义

否则老用户本地仍有旧 key，但新版本没有默认值，迁移逻辑无法判断。

### 4. 版本号必须同步升级

任何配置结构变更都必须升 `package.json` 的 `version`，并写迁移逻辑。否则老用户不会执行迁移，新用户也不会拿到正确的默认值。

### 5. keymap 不被深合并

`mergeState` 检测到 `Key*`/`Digit*`/`Numpad*` 键名模式时，直接替换整个对象，不递归合并。这是有意设计，避免破坏键盘映射结构。

### 6. 数组类型直接替换

`mergeState` 对数组不做深合并，直接替换。如需增量更新数组，必须在业务逻辑中处理。

### 7. 页面焦点元素重载守卫

设置面板中有「打开新标签页时聚焦元素」选项（`openPageFocusElement`），非默认值时需要在页面加载后将焦点转移到指定元素。

**问题：** 浏览器打开新标签页时会先聚焦地址栏，`element.focus()` 会被覆盖。

**方案：** `src/newtab/App.vue` 中实现重载守卫：
1. 检测到非默认配置且 URL 不含 `?focus` 参数时，设置 `location.search = '?focus'`
2. 浏览器以新 URL 重载页面，`v-if="!shouldReloadForFocus"` 静默中断当前渲染
3. 重载后 `?focus` 参数存在，组件正常初始化
4. `handleFocusPage()` 通过 `setTimeout(fn, 0)` 推迟到宏任务，确保浏览器完成地址栏聚焦后再转移焦点
