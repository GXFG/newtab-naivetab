# Setting 面板架构

设置面板有抽屉与全屏两种形态，共用同一套内容组件。本文写结构与注册方式；新增面板的逐步操作见 `.claude/skills/add-setting-pane/SKILL.md`。

## 双模式

| 模式 | 入口 | 容器 | 宽度 |
|------|------|------|------|
| 抽屉 | newtab 右键菜单 | `setting/index.vue`（NTDrawer 包裹） | 750px |
| 全屏 | `chrome://extensions` → 选项 | `options/Content.vue` | 居中，max 1200px |

`globalState.settingMode` 区分当前模式（`'drawer'` / `'options'`）。

两种模式共享 `SettingPaneContent.vue`，靠 `layout` prop 分叉：
- `layout="drawer"`：需要 ResizeObserver 同步 nav 高度，内容区固定高度滚动。
- `layout="page"`：自然流动，内容区自适应。

**不写两套面板**是这条架构的核心收益：设置项的逻辑与样式只存在一份，模式差异被压缩到布局层。

options 页支持 URL 参数定位：`options/index.html?tab=general`，加 `&anchor=clockDigital` 可展开对应 section。

## 组件层级

```
SettingPaneContent          最外层：左侧导航 + 分组逻辑 + 固定 HeaderBar
  ├─ nav
  │    └─ NTScrollArea → nav items（分组分隔线）
  └─ 内容区（flex column）
       ├─ SettingHeaderBar        固定在顶部，不参与滚动
       └─ NTScrollArea            flex: 1
            └─ KeepAlive → [pane]
                 ├─ SettingFormWrap         面板容器：统一样式 + 重置按钮
                 │    ├─ SettingFormSection 分组：header + body + 分隔线
                 │    │    └─ SettingFormItem   单项：label + control + Tips
                 │    └─ 重置按钮区
                 └─ [自定义布局]
```

`SettingHeaderBar` 由 `SettingPaneContent` 统一渲染（标题按 `currSettingTabCode` 从 registry 查 `labelKey`），各 pane **不要自己渲染**。例外：`general` 与 `keyboardCommon` 内的 Drawer 组件（`BackgroundDrawer`、`PresetThemeDrawer`）仍挂在自己 pane 内。

## 面板注册

三处注册，缺一不可：

| 位置 | 作用 |
|------|------|
| `SETTING_GROUPS` | 分组结构与顺序（与 `WIDGET_GROUPS` 一致） |
| `SETTING_ICON_META` | 图标，类型 `Record<settingPanes, SettingIconMeta>` |
| `PANE_MAP` | 组件映射，类型 `Record<settingPanes, Component>` |

后两处的 key 类型都是 `settingPanes` 联合类型，**漏注册会在 `vue-tsc` 阶段直接报错**，不会拖到运行时。这是刻意的：把「记得注册」从自律变成编译错误。

所有 pane 静态 import，不做 `defineAsyncComponent`——扩展文件都在本地磁盘，代码分割没有收益。理由与被否方案见 [ADR 0005](../decisions/0005-static-setting-registry.md)。

从第二个分组起，其首个 tab 上方自动显示分组标题分隔线。

## 特殊面板形态

- **clockDate**：聚合面板，用 `NTAccordion` 收纳各类时钟（数字/模拟/翻牌/霓虹/日期）的设置，每个子组件自带 `SettingFormWrap` 与独立 `widgetCode`。因此外层**不再套** `SettingFormWrap`，否则容器重复。
- **keyboardCommon**：在 `SettingFormWrap` 内部嵌套 `NTAccordion`，给表单提供可折叠子区域。
- **focusMode**：不用 `SettingFormWrap`，是自定义的 widget 网格卡片布局。
- **general**：内容最杂，含 `StorageVisualization` 自定义组件、导入导出按钮组、背景图选择器。`StorageVisualization` 自行实现了与 `SettingFormItem` 对齐的 label + control 布局，并用 `storage__row::after` 画分隔线。

折叠的取舍：内容 2–3 个 section 直接平铺；4 个以上或需要聚合多个子设置时才用 `NTAccordion`。折叠本身有成本——用户看不见的选项等于不存在。

## Section 分组原则

自 v2.3.1 起，分组依据从「按属性类型」（行为/尺寸/排版/外观）改为「按功能模块」：每个 section 是一个用户能感知的功能块。

- 单 section 字段超过 6 个时，用 `SettingFormInlineRow` 把相关字段并排，或加轻量子分组标题。
- 相关字段放一起（日历的今日/休息日/工作日样式各自成 section，而不是把所有颜色塞进一个「外观」）。
- 尺寸类（宽/高/圆角/内边距）仍可合并在一个 section。

## 字段组件

规则只有一条：**先在 `src/setting/fields/` 里找现成的，不要在 pane 里自建输入控件。** 以该目录的 `index.ts` 导出为准，本文不列清单——列了必然会漏。

需要新增原子组件时，同时更新 `fields/index.ts` 与本节提到的约定。

### 双主题色

颜色字段的值是 `string | string[]`：数组时按 `localState.currAppearanceCode` 取对应索引；写入时只改当前主题那一项，不覆盖另一主题。转换逻辑集中在 `fields/useDualThemeColor.ts`，新增颜色类字段时复用它，不要各自实现。

### disabled 状态

`SettingFormItem` 的根元素是 div，**不接受 `disabled` prop**。禁用态由内部 Field 自己处理——例如 `FontField` 与 `ToggleColorField` 会把它透传给内部的 picker / select / number / switch。需要禁用时，把 `disabled` 传到字段组件，不要传到 `SettingFormItem`。

## 布局约定

- `SettingFormSection` 的 body 有 1px 外边框，内部每个 `SettingFormItem` 用 `::after` 画底线，最后一个不画。
- `SettingHeaderBar` 在滚动区之外。用 `SettingFormWrap` 的面板靠 `pane-content` 的 padding 自然产生间距；不用 `SettingFormWrap` 的面板（如 clockDate）需要自己补 `margin-top`。
- 展开/收起统一用 `setting-slide` Transition（高度 + 透明度）。`SwitchField` 的 `#extra` 插槽已自动包裹。

## 预览功能

HeaderBar 的预览按钮切换 `document.body` 上的 `setting-preview-active`，对应 CSS 在 `styles/setting-utils.css`，把 `#setting .reka-drawer` 的 opacity 置 0。纯视觉，不碰任何配置数据。

## 重置机制

| Widget 类型 | 行为 |
|-------------|------|
| 有 `PRESERVE_FIELDS` | NTDropdown 提供「快速重置」与「完全重置」 |
| 无 `PRESERVE_FIELDS` | NTPopconfirm 确认后完全重置 |

- 文案 key 拼 `setting.{widgetCode}`，新增 Widget 要在 locales 的 `setting` 命名空间下补翻译。
- 成功提示由 `v-if="hasCode"` 守卫：只有 `widgetCode` 在 `defaultConfig` 中才渲染按钮。因此提示出现时 `resetWidgetConfig` 必然执行成功，不存在「没操作却提示成功」的竞态。

## Drawer Stack

按 `Escape` 要逐层关闭：先关最上层子 Drawer（背景图、书签选择器、主题预设），再按一次才关主面板。

`globalState.drawerStack` 记录打开顺序，`task/` 拦截 `Escape`：栈长 >1 时 `closeTopDrawer()`，=1 时 `closeSettingDrawer()`。相关函数在 `src/logic/store/state.ts`。

子 Drawer 用 `useDrawerStack(code, showRef, onClose)` 自动注册/注销，组件不必感知栈：

```ts
useDrawerStack('background-drawer', toRef(props, 'show'), onCloseModal)
```

关闭路径有四条，都要经过栈，否则会残留：ESC 走 `closeTopDrawer`；X 按钮调 `openDrawer` 返回的 `close`；内部选择后 emit `update:show=false` 由 watch 触发 `close`；外部强制关闭 Setting 走 `closeSettingDrawer` 清栈。`code` 必须全局唯一。

## 相关决策

[0005 设置面板静态注册](../decisions/0005-static-setting-registry.md)
