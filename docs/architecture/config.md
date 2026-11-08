# 配置系统架构

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/config/defaults.ts` | 默认配置定义、Widget 配置自动扫描 |
| `src/logic/config/merge.ts` | 递归合并函数 `mergeState` |
| `src/logic/config/update.ts` | 版本迁移 `handleAppUpdate`、配置更新 `updateSetting` |
| `src/logic/config/migrate.ts` | 结构归一 `normalizeStructure` + 迁移引擎 `runMigrations` |
| `src/logic/config/migrations.ts` | 版本迁移步骤表 `MIGRATION_STEPS`（唯一一份迁移知识） |
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

迁移知识只有一处：`src/logic/config/migrations.ts` 的 `MIGRATION_STEPS`（按版本严格升序）。
两个入口共用这条链：

| 入口 | mode | 差异 |
|------|------|------|
| `handleAppUpdate`（启动升级，newtab 与 options 两个页面入口都会调） | `upgrade` | 注入 host：旧 localStorage 键、localState、更新公告 |
| `importSetting`（导入备份） | `import` | 不注入 host：不碰本机存储与运行时状态、不弹公告；更高版本导出的文件直接拒绝 |

引擎（`migrate.ts`）分两段：

1. `normalizeStructure(raw)` —— 只做键名归一（`bookmark → keyboardBookmark` 等），版本无关、幂等，**必须**先跑
2. `runMigrations(ctx, fromVersion, toVersion)` —— 只执行 `fromVersion < step.version <= toVersion` 的步骤，不写版本号

**为什么归一必须独立于版本**：步骤都按新键名寻址。若把改名做成某个版本的步骤，更早版本的步骤会写到还不存在的键上，静默丢数据。

### 步骤写法约定

- 只读写 `ctx.config`，禁止 import `localConfig` / `localState`；本机副作用走 `ctx.host`（导入模式下 host 不存在，逻辑自动跳过）
- 不写版本号、不弹 toast、不记统计 —— 属于入口收尾
- 缺字段不赋值，交给 `updateSetting` 的 `mergeState`；只有「必须与默认值解耦」的字段才显式写默认值
- 删除字段必须 `delete`，漏掉的老字段会被当作合法数据继续传播
- 已知的按模式分支只有一处：`focusVisibleWidgetMap` 的整表重建只在 `upgrade` 执行（旧数据用的是旧 widget code；导入的备份已归一过键名，重置会抹掉用户的专注模式可见性设置）

### 核心规则

- 末尾的 `updateSetting()` 是异步执行（不 await），整理配置结构但不阻塞首屏渲染
- 每次修改配置结构都**必须同步升 `package.json` 版本号**
- **版本快照**：调用方（`newtab/App.vue`、`options/Content.vue`）在 `setupPageConfigSync` 之前通过 `getLocalVersion()` 快照本地版本号，传入 `handleAppUpdate(localVersion)`。避免 `loadRemoteConfig` 合并云端数据后 `localConfig.general.version` 被覆盖为新版本，导致迁移被误跳过。**任何新建的页面上下文只要会写配置，都必须补这两步**，否则该入口会以「旧结构 + 新版本号」把字段推到云端

配置迁移最佳实践（含各场景正确/错误做法对照表）详见 [pitfalls-config.md](../../.claude/rules/pitfalls-config.md#配置迁移黄金法则)。

### 配置兼容性快照测试

新增迁移分支后，**必须运行快照测试确认不破坏老用户数据**：

```bash
npx vitest run src/logic/__tests__/config-snapshot.test.ts
```

| 文件 | 职责 |
|------|------|
| `src/logic/__tests__/config-snapshot.test.ts` | 从不同历史版本的用户配置快照出发，运行完整迁移流程，验证核心数据不丢失、结构完整；并对最终 `localConfig` 打 golden 快照，字段级漂移会直接暴露 |
| `src/logic/__tests__/migration-chain.test.ts` | 链条本身的不变量：步骤升序、目标版本门限、`import` 与 `upgrade` 等价（`focusVisibleWidgetMap` 除外）、`import` 不碰本机存储、幂等 |
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
- `ratio` 参数在单位转换前应用，用于相对缩放（如 `fontSize × 0.9` 作为副标题字号）

#### 缩放设计：vmin / px 三层分类

Widget 尺寸属性按视觉语义分为三层：

| 层级 | 属性 | 单位 | 原因 |
|------|------|------|------|
| **主体尺寸** | fontSize, width, height, padding, blockSize | `vmin` | 定义 Widget 视觉体量，随屏幕等比缩放 |
| **比例属性** | borderRadius, blockMargin | `vmin` | 与主体尺寸保持比例关系，换屏幕不失调 |
| **物理细节** | borderWidth, backgroundBlur, cardGap, glowIntensity | `px` | 1px 边框永远是 1px，模糊永远是 N 像素 |

**0.1 系数**：选择 0.1 是为了让 config 值在 1080p 屏幕上 ≈ px（`fontSize: 18 → 1.8vmin ≈ 19px`），使配置值对人类直觉友好，同时 Widget 随屏幕等比缩放。

少数例外有其理由：`weather` 的 fontSize 信息密集故用 px；`countdown` 的 labelFontSize（标签文字）用 px 保持可读；`clockFlip`/`clockNeon` 的 borderRadius 是精密视觉元素用 px。

#### scaleMode 缩放模式

用户可通过 `general.scaleMode` 切换全局缩放策略：

| 模式 | 行为 | 设计哲学 | 适用场景 |
|------|------|----------|----------|
| `'auto'`（默认） | vmin 随屏幕等比缩放 | Dashboard/海报——屏幕越大元素越大 | 展示型 Widget（时钟、日历） |
| `'fixed'` | vmin 自动转为 px，所有屏幕统一 | App/文档——屏幕越大留白越多 | 文本密集型场景 |

- px 单位**不受** scaleMode 影响（物理细节永远固定）
- 切换 scaleMode 时无需修改各 Widget 配置，`getStyleField` 内部透明处理
- 老用户默认 `'auto'`，保持既有体验

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
