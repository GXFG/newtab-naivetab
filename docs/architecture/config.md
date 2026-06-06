# 配置系统架构

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/config/defaults.ts` | 默认配置定义、Widget 配置自动扫描 |
| `src/logic/config/merge.ts` | 递归合并函数 `mergeState` |
| `src/logic/config/update.ts` | 版本迁移 `handleAppUpdate`、配置更新 `updateSetting` |
| `src/logic/config/migrate.ts` | 声明式字段迁移 `normalizeLegacyConfig` |
| `src/logic/config/state.ts` | `localConfig` / `localState` 响应式创建 |
| `src/logic/config/compress.ts` | gzip 压缩/解压工具 |
| `src/logic/config/version.ts` | 版本号比较 |
| `src/logic/config/reset.ts` | Widget 配置重置（quick/full 模式） |
| `src/logic/store/state.ts` | `globalState` 定义 + UI 操作函数 |
| `src/logic/store/style.ts` | `getStyleField` / `colorMixWithAlpha` |
| `src/logic/store/theme.ts` | 主题、语言、外观模式切换 |
| `src/logic/store/dom.ts` | 全屏同步 / DOM 样式监听 |

> 存储与同步机制详见 [storage.md](storage.md)。

## 三层配置架构

```
┌──────────────────┬──────────────────┬───────────────────────────────────┐
│   localConfig    │    localState    │          globalState              │
├──────────────────┼──────────────────┼───────────────────────────────────┤
│ 用途：Widget 和  │ 用途：运行时本地  │ 用途：UI 运行时状态                │
│ 通用功能配置      │ 状态（外观、同步  │ （面板开关、全屏、字体列表等）      │
│                  │ 状态、专注模式）  │                                   │
│ 持久化：是        │ 持久化：是        │ 持久化：否                         │
│ 存储：localStorage│ 存储：localStorage│ 存储：内存（reactive）             │
│ 云同步：是        │ 云同步：部分       │ 云同步：否                         │
├──────────────────┼──────────────────┼───────────────────────────────────┤
│ general          │ currAppearanceCode│ settingMode                       │
│ keyboardCommon   │ currAppearanceLabel│ isSettingDrawerVisible           │
│ keyboardCommand  │ isUploadConfig…  │ isGuideMode / isFullScreen        │
│ ... (各 widget)  │ isFocusMode       │ availableFontList / drawerStack   │
└──────────────────┴──────────────────┴───────────────────────────────────┘
```

引用关系：`localConfig.general.appearance` → watch → `localState.currAppearanceCode` → `getStyleField` 颜色读取。`globalState` 驱动 UI 行为。

## 配置扫描与初始化

`defaults.ts` 通过 `import.meta.glob` 扫描所有 `widgets/**/config.ts`，动态聚合 `WIDGET_CONFIG` 到 `defaultConfig`。新增 Widget 无需修改此文件。

### PRESERVE_FIELDS 机制

Widget 配置重置时保留的字段（如键盘按键映射）。系统通过 `import.meta.glob` 扫描所有 `config.ts` 中的 `PRESERVE_FIELDS`，无需手动注册。`enabled` 和 `layout` 总是被保留。

### 配置初始化流程

```
import.meta.glob 扫描 → 构建 defaultConfig → createLocalConfig()
  → 遍历字段调用 useStorageLocal → 读取 localStorage + 浅层合并默认值
  → reactive() 包装 → localConfig
```

## 配置迁移系统

详见 `src/logic/config/update.ts` 源码注释（含各版本迁移历史）。

### 核心规则

- `handleAppUpdate` 使用 `if` 而非 `if-else`，确保跨多版本旧用户能依次执行所有迁移
- 末尾的 `updateSetting()` 是异步执行（不 await），整理配置结构但不阻塞首屏渲染
- 每次修改配置结构都**必须同步升 `package.json` 版本号**
- **版本快照**：调用方（App.vue）在 `setupPageConfigSync` 之前通过 `getLocalVersion()` 快照本地版本号，传入 `handleAppUpdate(localVersion)`。避免 `loadRemoteConfig` 合并云端数据后 `localConfig.general.version` 被覆盖为新版本，导致迁移被误跳过

配置迁移最佳实践（含各场景正确/错误做法对照表）详见 [pitfalls-config.md](../../.claude/rules/pitfalls-config.md#配置迁移黄金法则)。

### 配置兼容性快照测试

新增迁移分支后，**必须运行快照测试确认不破坏老用户数据**：

```bash
npx vitest run src/logic/__tests__/config-snapshot.test.ts
```

| 文件 | 职责 |
|------|------|
| `src/logic/__tests__/config-snapshot.test.ts` | 从不同历史版本的用户配置快照出发，运行完整迁移流程，验证核心数据不丢失、结构完整 |
| `test/fixtures/snapshot-v*.json` | 用户配置快照 JSON，可从线上用户 localStorage 导出或手动构造典型配置 |

每个快照覆盖 5 个断言：
1. 迁移不抛出异常
2. 用户核心数据（keymap、颜色、背景图列表）不丢失
3. 迁移后包含当前所有必需字段
4. 旧版字段被正确清理
5. 版本号升级到目标版本

**新增快照**：在测试文件的 `fixtures` 数组中追加配置对象即可自动纳入测试。

## mergeState 合并函数

以 `state`（默认配置）为模板，过滤 `acceptState` 中的未知/废弃字段。完整合并规则（含 keymap 直接替换、数组直接替换等特殊行为）详见 [pitfalls-config.md](../../.claude/rules/pitfalls-config.md#mergestate-合并陷阱)。

## 主题与颜色系统

### 双元素数组驱动

所有颜色字段必须是 `[浅色值, 深色值]` 数组。`currAppearanceCode`（0=浅色，1=深色）驱动自动切换：
- `appearance === 'auto'` 时，跟随系统 `matchMedia('(prefers-color-scheme: dark)')`
- `'light'` / `'dark'` 时，强制指定

### getStyleField

```ts
getStyleField(configCode: ConfigField, field: string, unit?: string, ratio?: number)
```

- 自动处理双元素数组颜色切换
- 数字值可拼接单位（`px`、`vmin`），`vmin` 时自动 ×0.1
- 返回 `computed`，调用时不需要再包 `computed`

### CSS 自定义变量注入

**禁止 `v-bind()`**。动态样式通过 `:style` + `computed` 注入 CSS 变量，CSS 中用 `var()` 引用。

```vue
<script setup>
const cssVars = computed(() => ({
  '--nt-w-font-color': getStyleField(WIDGET_CODE, 'fontColor').value,
}))
</script>
<template>
  <div :style="cssVars">...</div>
</template>
```

### colorMixWithAlpha

```ts
colorMixWithAlpha(color: string, alpha: number): string
// → 'color-mix(in srgb, rgba(58,115,195,1) 50%, transparent)'
```

解决 `rgba()` 的 alpha 通道不支持 `var()` 的问题。

## 常见坑点

详见 [pitfalls-config.md](../../.claude/rules/pitfalls-config.md)。以下为配置系统特有陷阱：

### 页面焦点元素重载守卫

`openPageFocusElement` 非默认值时，浏览器打开新标签页会先聚焦地址栏，`element.focus()` 会被覆盖。解决方案：`App.vue` 中检测 URL 无 `?focus` 参数时重载一次，`handleFocusPage()` 通过 `setTimeout(fn, 0)` 推迟到宏任务。
