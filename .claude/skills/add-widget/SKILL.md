---
name: add-widget
description: NaiveTab 浏览器扩展的 Widget 开发指南。当用户要在 newtab-naivetab 项目中新增 Widget 组件、添加新功能组件时使用。涵盖需要修改的完整文件清单、配置规范、类型注册等，防止遗漏关键步骤。
---

# NaiveTab Add Widget

新增 Widget 需按顺序完成以下步骤。完整模板参考见 [reference.md](reference.md)。

> 完整注册点索引见 [REGISTRY-MAP.md](src/newtab/widgets/REGISTRY-MAP.md)，新增时对照检查。

## 必须修改的 6 个文件

### Step 1 — `src/common/widget-constants.ts`：代码列表与分组

**`WidgetCodes` 不再手动维护联合类型，而是从 `WIDGET_CODE_LIST` 用 `typeof` 自动推导。** 只需在列表数组中追加 code 即可。

`WidgetConfigByCode` 类型映射也在 `src/common/widget-constants.ts` 中（Step 6 处说明）。本 Step 处理以下三项：

**1-A：添加到 `WIDGET_CODE_LIST`**
```ts
export const WIDGET_CODE_LIST = [
  // ...
  'myWidget',   // 顺序决定组件库抽屉中的排列顺序
] as const
```

**1-B：（可选）若新 Widget 与其他 Widget 共用同一个 setting pane，需维护 `WIDGET_SETTING_PANE_MAP`**
```ts
export const WIDGET_SETTING_PANE_MAP: Partial<Record<WidgetCodes, settingPanes>> = {
  // ...
  myWidget: 'clockDate',   // ← 指向对应的 pane code
}
```
> 未在此 Map 中的 Widget，右键菜单会默认用自身 code 查找 pane（`myWidget` → pane `myWidget`）。

**1-C：添加到 `WIDGET_GROUPS` 对应分组**（用于组件库抽屉和专注设置按分类展示）
```ts
export const WIDGET_GROUPS: Array<{
  labelKey: string
  codes: WidgetCodes[]
}> = [
  {
    labelKey: 'widgetGroup.timeAndDate',
    codes: ['clockDigital', ... , 'myWidget'], // ← 追加到对应分组（time/bookmark/tool 三选一）
  },
]
```
**必须添加**否则不会显示在组件库列表中。

### Step 2 — 新建 `src/newtab/widgets/myWidget/config.ts`

```ts
export const WIDGET_CODE = 'myWidget'
export const WIDGET_CONFIG = {
  enabled: false,
  layout: { xOffsetKey: 'left', xOffsetValue: 50, xTranslateValue: -50,
            yOffsetKey: 'top',  yOffsetValue: 50,  yTranslateValue: -50 },
  // 颜色字段统一用双元素数组：[浅色值, 深色值]
  fontColor: ['rgba(255,255,255,1)', 'rgba(0,0,0,1)'],
  // ... 其他配置
}
export type TWidgetConfig = typeof WIDGET_CONFIG
```

### Step 3 — 新建 `src/newtab/widgets/myWidget/index.vue`

- 用 `WidgetWrap` 作为根容器，直接子元素必须有 `myWidget__container` 的 class
- 样式块外层 selector 为 `#myWidget`，容器需 `position: absolute`
- 用 `getStyleField(WIDGET_CODE, 'fieldName')` 读取配置（自动处理颜色双数组/单位换算）
- 用 `getIsWidgetRender(WIDGET_CODE)` + `watch` 控制定时任务生命周期

### Step 4 — 新建 `src/newtab/widgets/myWidget/index.ts`

```ts
import Index from './index.vue'
import { WIDGET_CODE, WIDGET_CONFIG } from './config'
import { WIDGET_ICON_META } from '@/logic/constants/icons'

export default {
  code: WIDGET_CODE,
  component: Index,
  config: WIDGET_CONFIG,
  iconName: WIDGET_ICON_META[WIDGET_CODE].iconName,
  iconSize: WIDGET_ICON_META[WIDGET_CODE].widgetSize,
  widgetLabel: 'setting.myWidget',   // i18n key
}
```

### Step 5 — `src/logic/constants/icons.ts` ⚠️ 需修改两处，缺一不可

**5-A：在 `ICONS` 对象中定义图标常量**（图标来自 [Iconify](https://icon-sets.iconify.design/)，需验证图标名存在）：

```ts
export const ICONS = {
  // ... 已有图标 ...
  myWidget: 'mdi:some-valid-icon',   // ← 先在这里定义
}
```

**5-B：在 `WIDGET_ICON_META` 中引用（使用 `ICONS.myWidget`，禁止硬编码字符串）：**

```ts
export const WIDGET_ICON_META: Record<WidgetCodes, WidgetIconMeta> = {
  // ... 已有条目 ...
  myWidget: { iconName: ICONS.myWidget, widgetSize: 30 },  // ← 引用常量
}
```

> ❌ 错误示范：`iconName: 'mdi:some-icon'`（硬编码字符串绕过了 `ICONS` 常量，难以统一维护）

**设置面板中引用图标也必须使用 `ICONS.xxx`，新增专属 setting 面板时还需在 `SETTING_ICON_META` 中注册。**

### Step 6 — `src/common/widget-constants.ts` 类型映射

```ts
// 在 WidgetConfigByCode 类型中追加一行（使用动态 import() 语法，无需单独 import）
myWidget: import('@/newtab/widgets/myWidget/config').TWidgetConfig
```

> 只需追加一行 key-value，**不再需要单独的 import 语句**。

### Step 7 — i18n：`src/locales/zh-CN.json` 和 `en-US.json`

```json
"setting": {
  "myWidget": "我的组件"
}
```

---

## 可选：添加专属设置面板

自 v2.0.0 起，所有设置面板统一管理在 `src/setting/` 目录下。新增专属设置面板步骤：

### 步骤 1 — 新建面板文件

新建目录 `src/setting/panes/myWidget/`，并创建 `index.vue`：

```vue
<template>
  <SettingFormWrap>
    <!-- 在这里使用原子组件（ColorField, FontField, SliderField, etc.）构建表单 -->
    <SwitchField
      v-model="localConfig.myWidget.enabled"
    />
    <ColorField
      v-model="localConfig.myWidget.fontColor"
      :label="$t('common.color')"
    />
    <!-- ... 更多表单项 -->
  </SettingFormWrap>
</template>

<script setup lang="ts">
import { SettingFormWrap } from '@/setting/components/SettingFormWrap'
import { SwitchField, ColorField } from '@/setting/fields'
import { localConfig } from '@/logic/config/state'
</script>
```

**所有表单项必须使用 `src/setting/fields` 中提供的原子组件。**

### 步骤 2 — 注册设置面板

在 `src/setting/registry.ts` 中注册：

在 `SETTING_GROUPS` 对应的分组（通常是 `widget`）的 `items` 数组添加配置项：
```ts
{ code: 'myWidget', labelKey: 'setting.myWidget' },
```

### 步骤 3 — 添加设置图标元数据

在 `src/logic/constants/icons.ts` 的 `SETTING_ICON_META` 中注册：

```ts
export const SETTING_ICON_META: Record<settingPanes, SettingIconMeta> = {
  // ...
  myWidget: { iconName: ICONS.myWidget, settingSize: 20 },
}
```

**所有图标必须通过 `ICONS` 常量引用，禁止硬编码字符串。**

### 步骤 4 — 建立 Widget 与 Setting Pane 的映射

在 `src/common/widget-constants.ts` 的 `WIDGET_SETTING_PANE_MAP` 中添加：

```ts
export const WIDGET_SETTING_PANE_MAP: Partial<Record<WidgetCodes, settingPanes>> = {
  // ...
  myWidget: 'myWidget',   // Widget code 对应到 setting pane code
}
```

---

## 无需手动修改（自动处理）

| 文件 | 机制 |
|------|------|
| `src/logic/config/defaults.ts` | `import.meta.glob('**/config.ts')` 自动扫描收集 |
| `src/logic/config/state.ts` | 遍历 `WIDGET_CODE_LIST` 动态创建 storage |
| `src/logic/config/sync/` | 遍历 `defaultConfig` 处理云同步/导入导出 |
| `src/newtab/Content.vue` | 遍历 `widgetsList` 动态渲染 |
| `src/newtab/draft/DraftDrawer.vue` | 遍历 `widgetsList` 展示组件库 |
| `src/newtab/widgets/registry.ts` | `import.meta.glob` 自动扫描 widget index.ts 元信息 |
