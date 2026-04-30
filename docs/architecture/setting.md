# Setting 面板架构

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/setting/SettingPaneContent.vue` | 设置面板核心内容：NTabs 左侧导航 + 分组分隔线 + 组件渲染 |
| `src/setting/index.vue` | 抽屉模式入口（newtab 右键菜单触发） |
| `src/options/Content.vue` | 全屏模式入口（`chrome://extensions` → 选项） |
| `src/setting/registry.ts` | 面板注册中心：SETTING_GROUPS 分组配置 + 异步组件加载 |
| `src/setting/components/SettingFormWrap.vue` | 面板容器：统一 .setting\_\_pane-content 样式 + 底部重置按钮 |
| `src/setting/components/SettingFormItem.vue` | 表单项原子组件：label + control + Tips 布局 |
| `src/setting/components/SettingFormSection.vue` | 分组容器：section header + body（自动绘制内部分隔线） |
| `src/setting/components/SettingFormInlineRow.vue` | 同行排列容器：多个 SettingFormItem 横向展示 |
| `src/setting/components/SettingHeaderBar.vue` | 面板顶部标题栏：标题 + 预览 + 打开新标签页 + 关闭按钮 |
| `src/setting/components/SettingCollapseSection.vue` | 折叠区域：手动 max-height 过渡 + transitionend 双兜底动画 |
| `src/setting/fields/*.vue` | 表单原子组件：ColorField / FontField / SliderField / SwitchField / ToggleColorField |
| `src/setting/fields/index.ts` | fields 模块统一导出 |
| `src/setting/panes/*/index.vue` | 各 Widget 的具体设置面板实现 |

## 双模式架构

设置面板支持两种展示模式，共享同一套内容组件 `SettingPaneContent.vue`：

| 模式 | 入口 | 容器 | 宽度 |
|------|------|------|------|
| **抽屉模式** | newtab 右键菜单 | `setting/index.vue`（NDrawer 包裹） | 750px |
| **全屏模式** | `chrome://extensions` → 选项 | `options/Content.vue`（页面布局） | 居中自适应 |

`globalState.settingMode` 区分当前模式（`'drawer'` / `'options'`）。

### 模式切换流程

```
┌─────────────┐        ┌──────────────────┐
│  newtab右键  │───────>│  drawer 模式      │
│  "设置"     │        │  NDrawer 悬浮      │
└─────────────┘        │  750px 宽         │
                       └──────────────────┘

┌─────────────┐        ┌──────────────────┐
│ extensions   │───────>│  options 模式     │
│  → 选项      │        │  全屏页面          │
└─────────────┘        │  max-width:1200px │
                       └──────────────────┘
```

两种模式通过 `SettingPaneContent` 的 `layout` prop 区分：
- `layout="drawer"`：需要 ResizeObserver 同步 nav 高度，内容区固定高度滚动
- `layout="page"`：自然流动布局，内容区自适应

### 路由参数传递

options 页面支持 URL 参数定位到指定 tab：
```
dist/options/index.html?tab=general          → 打开 general 面板
dist/options/index.html?tab=clockDate&anchor=clockDigital → 打开 clockDate 并展开对应 section
```

## 面板注册机制

### 分组配置

所有面板在 `registry.ts` 的 `SETTING_GROUPS` 中集中注册：

```ts
export const SETTING_GROUPS: SettingGroup[] = [
  {
    labelKey: 'widgetGroup.global',
    items: [
      { code: 'general', labelKey: 'setting.general' },
      { code: 'focusMode', labelKey: 'setting.focusMode' },
    ],
  },
  // ... keyboardAndBookmark / timeAndDate / tool / other 分组
]
```

- 分组结构与 WIDGET_GROUPS 完全一致
- 从第二个分组开始，其首个 tab 上方自动显示分组标题分隔线
- `labelKey` 是 i18n key，同时在 `SETTING_ICON_META` 中注册对应图标

**图标注册类型安全**：`SETTING_ICON_META` 的类型为 `Record<settingPanes, SettingIconMeta>`，TypeScript 编译时强制要求所有 `settingPanes` 值都必须有对应图标。新增面板时若遗漏注册，TS 会在编译期报错，不会等到运行时空指针。

### 异步加载

每个面板通过 `defineAsyncComponent` 异步加载，目录名默认与 code 一致，不一致时通过 `PANE_DIR_MAP` 映射。加载时打印 `console.time` 便于性能分析。

### 新增面板步骤

1. 在 `SETTING_GROUPS` 对应分组中添加 `{ code, labelKey }`
2. 创建 `src/setting/panes/{code}/index.vue`
3. 在 `SETTING_ICON_META` 中注册图标
4. 在 `locales/zh-CN.json` 和 `en-US.json` 中添加翻译

## 组件层级结构

```
SettingPaneContent          ← 最外层，NTabs 导航 + 分组逻辑
  └─ NTabPane (per item)
       └─ [pane component]  ← 各 Widget 的具体设置
            ├─ SettingHeaderBar          ← 标题栏（sticky 定位）
            ├─ SettingFormWrap           ← 面板容器（统一样式 + 重置按钮）
            │    ├─ SettingFormSection   ← 分组区域（header + body + 分隔线）
            │    │    ├─ SettingFormItem ← 表单项（label + control + Tips）
            │    │    │    ├─ [Field 组件]
            │    │    │    └─ Tips
            │    │    └─ [其他自定义组件]
            │    └─ 重置按钮区域
            └─ [其他自定义布局]
```

### 特殊面板模式

**clockDate 聚合面板**：通过 `NCollapse` 收纳 5 个子时钟设置组件（DigitalSetting、AnalogSetting、FlipSetting、NeonSetting、DateSetting），每个子组件各自使用 `SettingFormWrap` + 独立的 `widgetCode`。因此外层不包裹 `SettingFormWrap`，避免重复容器。

**keyboardCommon**：在 `SettingFormWrap` 内部嵌套 `NCollapse` 实现可折叠子区域。

**focusMode**：不使用 `SettingFormWrap`，自定义 widget 网格卡片布局。

**general**：包含最复杂的内容，有 `StorageVisualization` 自定义组件、导入/导出按钮组、背景图选择器等。`StorageVisualization` 自行实现了与 `SettingFormItem` 对齐的 label + control 布局，并通过 `storage__row::after` 绘制分隔线。

## Section 分组策略

自 v2.3.1 起，各面板的 Section 分组从「按属性类型」（行为/尺寸/排版/外观）改为「按功能模块」：每个 section 是一个用户可感知的功能块。

| 面板 | Section 结构 |
|------|-------------|
| general | 页面设置 → 焦点与导航 → 语言与时间 → 字体与色彩 → 背景图 → 数据管理 |
| search | 搜索引擎 → 搜索栏外观 → 建议列表 |
| countdown | 计时器显示 → 进度环样式 → 文字排版 |
| calendar | 日历配置 → 今日样式 → 休息日样式 → 工作日样式 → 全局配色 |
| bookmarkFolder | 书签配置 → 容器外观 → 项目样式 → 文字排版 |
| memo | 功能配置 → 外观 → 文字排版 |
| weather | 数据设置 → 文字排版 |
| news | 新闻源 → 外观 → 文字与配色 |
| yearProgress | 左侧文字 → 右侧进度块 → 容器外观 → 文字排版 |

**分组原则**：
- 单个 section 内字段 > 6 个时，使用 `SettingFormInlineRow` 同行排列相关字段，或添加轻量子分组标题
- 相关字段放在一起（如日历的今日/休息日/工作日样式各自独立 section，而非所有颜色挤在一个「外观」section 中）
- 尺寸相关（宽/高/圆角/内边距）仍可以合并在一个「外观」或「尺寸」section 中

## 字段组件（Fields）

| 组件 | 用途 | v-model 绑定 |
|------|------|-------------|
| `SwitchField` | 布尔开关（支持 `#extra` 插槽展开子选项） | `v-model` |
| `NumberField` | 数字输入（可选附带滑块） | `v-model` |
| `ColorField` | 颜色选择（支持双主题色数组） | `v-model` |
| `FontField` | 字体 + 颜色 + 字号三合一 | `v-model:font-family/font-color/font-size` |
| `ToggleColorField` | 开关 + 颜色（+可选宽度） | `v-model:enable/color/width` |

### SwitchField 展开子选项

`SwitchField` 支持 `#extra` 插槽，开关打开后自动显示子控件（用 `setting-slide` Transition 包裹）：

```vue
<SwitchField
  v-model="config.someEnabled"
  :label="$t('some.label')"
>
  <template #extra>
    <NInput v-model:value="config.someValue" size="small" />
  </template>
</SwitchField>
```

### 双主题色处理

`ColorField` 和 `FontField` 的 `fontColor` 接受 `string | string[]`：
- 数组时自动取 `localState.currAppearanceCode` 对应索引值
- 修改时只更新当前主题对应的元素，不影响另一主题
- `ToggleColorField` 同理

### disabled 状态处理

**注意**：`SettingFormItem` 不接受 `disabled` prop（根元素是 div，不支持 disabled 属性）。禁用状态应由内部 Field 组件各自处理。`FontField` 和 `ToggleColorField` 内部已将 `disabled` 传递给所有子组件（`CustomColorPicker`、`NSelect`、`NInputNumber`、`NSwitch`）。

## 布局约定

### SettingFormSection 分隔线

`SettingFormSection` 的 body 容器有 `border: 1px solid var(--gray-alpha-08)` 外边框，内部每个 `SettingFormItem` 通过 `::after` 伪元素绘制底线，最后一个不显示。

### header 与 form 间距

`SettingHeaderBar` 使用 `sticky` 定位贴在顶部。使用 `SettingFormWrap` 的面板由 `pane-content` 的 padding 自然产生间距。不使用 `SettingFormWrap` 的面板（如 clockDate）需要手动补偿 `margin-top`。

### Transition 动画

面板中使用统一的 `setting-slide` Transition（垂直高度变化 + 透明度渐变）：

```css
.setting-slide-enter-active,
.setting-slide-leave-active {
  transition: opacity var(--transition-base), max-height var(--transition-base);
  overflow: hidden;
  max-height: 200px;
}
```

用于开关展开子选项、条件显示额外内容等场景。`SwitchField` 的 `#extra` 插槽已自动包裹此 Transition。

### SettingCollapseSection 折叠动画安全机制

`SettingCollapseSection` 使用手动 `max-height` 过渡实现展开/收起动画，**不依赖 CSS `height: auto`**（浏览器不支持 transition 到 auto）。

```
onEnter:  maxHeight: 0 → scrollHeight
onLeave:  maxHeight: scrollHeight → 0  (在 rAF 中执行)
```

**双兜底机制**：`transitionend` 监听 + `setTimeout` 超时兜底。
- 正常情况：CSS transition 完成后 `transitionend` 触发，调用 `done()`
- `prefers-reduced-motion` 场景：transition 被系统跳过，`transitionend` 永不触发，`setTimeout` 在动画时长 + 50ms 后调用 `done()`，防止 Vue Transition 卡死

超时时间：enter 350ms / leave 300ms，对应 CSS transition 时长 300ms / 250ms。

### SettingFormItem 多控件模式

`multiControl` prop 用于开关控制子选项显隐的场景：
- control 区域使用 `flex-direction: row-reverse` 让 Tips 固定在最左侧
- 子元素通过 Transition 展开收起时不会跳动

## 重置机制

每个使用 `SettingFormWrap` 的 Widget 面板底部都有重置按钮：

| Widget 类型 | 重置行为 |
|-------------|---------|
| 有 `PRESERVE_FIELDS` | NDropdown 提供"快速重置"和"完全重置"两个选项 |
| 无 `PRESERVE_FIELDS` | NPopconfirm 确认后执行完全重置 |

**i18n key 约定**：reset 按钮文案拼接 `setting.{widgetCode}`，新增 Widget 时须在 locales 文件的 `setting` 命名空间下添加对应翻译。

**成功提示安全性**：`SettingFormWrap.vue` 中重置成功提示由 `v-if="hasCode"` 守卫保护，只有 `widgetCode` 在 `defaultConfig` 中时才渲染按钮。因此成功消息触发时 `resetWidgetConfig` 必定执行成功，不存在"无操作却提示成功"的竞态。

## 预览功能

`SettingHeaderBar` 的预览按钮通过 hover 事件切换 `document.body` 的 `setting-preview-active` 类。对应 CSS 在 `styles/global.css` 中：
- 抽屉透明度设为 0
- 遮罩背景变为透明

用户可实时看到下方 newtab 页面的效果，鼠标离开后自动恢复，不影响任何配置数据。

## NCollapse 使用模式

各 pane 对 `NCollapse` 的使用不统一：

| 面板 | 用法 | 原因 |
|------|------|------|
| clockDate | 顶级容器，收纳 5 个子设置 | 聚合面板，子组件各自用 SettingFormWrap |
| keyboardCommon | SettingFormWrap 内部嵌套 | 在表单内提供可折叠子区域 |
| search/memo 等 | 不使用 | 内容量适中，直接平铺即可 |

建议：内容较少（2-3 个 section）的面板直接平铺；内容多（4+ 个 section）或需要聚合多个子设置时使用 NCollapse。
