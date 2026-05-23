# 项目踩坑记录

本文档是唯一踩坑规则来源。CLAUDE.md 和 `docs/` 不再重复这些规则。

---

## CSS & 样式

### `&--modifier` 禁止

`postcss-preset-env` 不支持 `&--xxx` BEM 拼接，modifier 必须写完整类名。`&` 只允许用于伪类/伪元素或嵌套完整类名。

**Why：** 编译产物中 modifier 类名不会被正确展开，导致样式完全不生效。

**How to apply：** 始终写完整类名，如 `.widget__container--active` 而非 `&--active`。详见 [development.md](docs/conventions/development.md#编码风格)。

### 禁止 `v-bind()`

**Why：** Vue 的 `v-bind()` 在 `<style>` 中动态绑定会导致样式计算性能问题，且与项目 CSS 变量方案冲突。

**How to apply：** 动态样式使用 `:style` + `computed` + `var()` 注入。

### Flexbox `min-width: 0`

flex 链路上每一层都要有 `min-width: 0`，否则 `min-width: auto` 会以内容固有宽度为收缩底线。

**Why：** flex 子元素默认 `min-width: auto`，内容宽度会阻止 flex 收缩，导致溢出。

**How to apply：** 在 flex container 内的直接子元素上添加 `min-width: 0`。

### 禁止在 scoped CSS 中直接使用 Naive UI 的 `--n-*` CSS 变量

**Why：** Naive UI 的 CSS 变量在 setting panel 等通过 `to` teleport 渲染的 Drawer 上下文中不可靠，可能不存在或拿到错误值。

**How to apply：** 完整对照表和注入模式见 [development.md](docs/conventions/development.md#编码风格) CSS 小节。

### `NInput[autosize]` + 大量 DOM 挂载触发 ResizeObserver loop 警告

Naive UI 的 `NInput type="textarea"` 使用 `autosize` 时，会通过 `vueuc` 的共享 `ResizeObserver` 监听 textarea 尺寸。同一帧内若有大量 DOM 变更（如键盘布局渲染 60+ 键帽元素），ResizeObserver 同步回调触发 → autosize 调整高度 → 再次布局 → 浏览器检测到循环，控制台报 `ResizeObserver loop completed with undelivered notifications`。

**Why：** `vueuc`（Naive UI 底层依赖）的 `ResizeObserverDelegate` 是同步回调，无 rAF 防抖。任何时候 ResizeObserver 回调导致需要新一轮通知的布局变更时，都会触发此警告。键盘面板同时具备"海量 DOM 挂载"和"autosize textarea"两个条件，是唯一触发场景。

**How to apply：** 非必须场景用固定 `:rows` 替代 `:autosize`。参考 [UrlBlacklistInput.vue](src/components/UrlBlacklistInput.vue)。

### CSS `rgba()` 不支持 `var()`

alpha 通道必须写字面量。

**Why：** CSS `rgba()` 的 alpha 参数不接受 CSS 变量。

**How to apply：** 使用 `color-mix(in srgb, var(--color) 50%, transparent)` 或 `rgb(var(--color-rgb) / 0.5)` 替代。

---

## Vue 组件

### WidgetWrap style 注入限制

`widget__wrap` div 的 style 由 `WidgetWrap` 组件自动注入（用于拖拽定位的绝对坐标），禁止再对该 div 进行 `:style` 绑定。

**Why：** `WidgetWrap` 内部已经通过 `:style` 注入 `xOffset`/`yOffset`/`translate` 等定位属性。外层再 `:style` 绑定会覆盖定位样式导致拖拽失效。

**How to apply：** 如需自定义样式，作用于 `WidgetWrap` 内部子元素（如 `*__container`），而非 `WidgetWrap` 本身的根 div。

### 禁止在 `<Icon>` 上直接绑定事件

`@iconify/vue` 的 `<Icon>` 组件默认渲染 `<svg aria-hidden="true" role="img">`，禁止在其上直接绑定 `@click`、`@mousedown` 等交互事件。

**Why：** Chrome 会将绑定了事件的 `<svg>` 视为可交互元素，点击后 `<svg>` 获得焦点，与自身的 `aria-hidden="true"` 产生无障碍冲突，控制台报错：`Blocked aria-hidden on an element because its descendant retained focus`。

**How to apply：** 必须用 `<button type="button">` 包裹 Icon，将事件绑定在 `<button>` 上，并在 button 上添加 `:aria-label` 提供无障碍描述。按钮样式需重置浏览器默认 `padding/border/background`。示例：

```vue
<!-- 错误 -->
<Icon :icon="ICONS.info" class="foo" @click.stop="onAction" />

<!-- 正确 -->
<button type="button" class="foo" :aria-label="$t('common.action')" @click.stop="onAction">
  <Icon :icon="ICONS.info" />
</button>
```

---

## 配置系统

### 配置迁移黄金法则

任何持久化配置结构修改都**不能破坏老用户数据**。改配置结构时必须：升 `package.json` version → `handleAppUpdate` 新增迁移分支。

**Why：** 老用户 localStorage 中有旧结构的配置，新版本直接读取会崩溃或表现异常。`handleAppUpdate` 通过版本比较确保旧用户能执行迁移。

**How to apply：**

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 新增扁平字段 | 在 `handleAppUpdate` 中赋值 | 只改 `defaultConfig` |
| 新增嵌套对象 | 整体赋值 `defaultConfig.xxx` | 只依赖浅合并 |
| 重命名字段 | 新字段=旧字段值 → delete 旧字段 | 直接改字段名 |
| 删除字段 | 先 `delete` 旧值 → 再删 `defaultConfig` | 直接从 `defaultConfig` 删 |
| 修改类型 | 新增替代字段 + 迁移 | 直接改类型 |

**关键注意：** `handleAppUpdate` 使用 `if` 而非 `if-else`，确保跨越多个版本的旧用户能依次执行所有迁移。详见 [config.md](docs/architecture/config.md#配置迁移系统)。

### mergeState 合并陷阱

`mergeState(state, acceptState)` 以 `state`（默认配置）为模板过滤 `acceptState` 中的未知/废弃字段。

**关键规则：**

| 条件 | 行为 |
|------|------|
| `acceptState` 为空 | 使用 `state` |
| 类型不同 | 使用 `state` |
| keymap 对象（Key*/Digit*/Numpad*） | **直接替换**，不深合并 |
| 数组 | **直接替换**，不深合并 |
| 普通对象 | 递归合并，**只保留 `state` 中定义的字段** |

**Why：** keymap 和数组直接替换是有意设计，避免破坏键盘映射结构和数组顺序。

**How to apply：**
- 需要增量更新数组时，必须在业务逻辑中处理，不能依赖 `mergeState`
- 嵌套对象新增字段不能依赖浅合并自动补全，必须在 `handleAppUpdate` 中手动赋值
- 修改 `keymap` 时直接替换整个对象，不要试图只添加/删除单个 key

### popup 修改配置后必须 flushSync

popup 修改书签等配置后**必须调用 `flushConfigSync`** 强制同步，否则 popup 销毁后防抖回调不会执行，配置丢失。

### checkWriteRate 必须在 MD5 去重之后调用

`checkWriteRate` 记录的是实际 `chrome.storage.sync.set` 调用次数，必须在 MD5 去重、大小检查**之后**、`set` 调用**之前**执行。

**Why：** 如果在函数入口调用，被 MD5 去重拦截的调用、被大小检查拦截的调用也会虚增计数器，导致用户收到假的"写入速率即将超限"警告。

**How to apply：** 确保 `checkWriteRate` 在所有可能提前 return 的检查之后执行。

### syncId 必须在 set 调用前设置

`uploadConfigFn` 中 `syncId` 必须在 `chrome.storage.sync.set` **调用前**设置，不能写在回调中。

**Why：** `chrome.storage.sync.set` 写入完成后，`chrome.storage.onChanged` 事件可能在 `set` 回调执行前就触发（事件分发与回调调度是独立的 microtask）。如果 syncId 尚未更新，`setupKeyboardSyncListener` 的 syncId 守卫会失效，导致自己上传的配置又触发本地配置被覆盖 → Vue watch → 第二次上传。

**How to apply：** 修改上传逻辑时，`syncId`/`syncTime` 赋值必须放在 `chrome.storage.sync.set` 调用之前，回调中只保留错误处理和 `dirty` 清理。

---

## 快捷键系统

### 无修饰键模式必须检查 keymap 绑定

`matchShortcut` 在 `noModifierMode=true` 时，对 `ALLOWED_SET` 中所有键都返回 `e.code`（包括方向键、字母、数字、功能键等）。但 keymap 中可能**没有实际绑定**该键的命令或书签。

**Why：** 如果只看 `matchShortcut` 返回值就调用 `preventDefault()` + `stopPropagation()`，会吞掉页面原生的按键行为。例如视频网站的方向键控制进度、F 键全屏等。

**How to apply：** 在 `handleKeydown` 中，`matchShortcut` 返回后必须**额外检查 keymap 中是否存在对应绑定**（`commandKeymap[code]?.command` / `bookmarkKeymap[code]?.url`），只有真正绑定了才发送消息和拦截事件。Content Script 和 newtab executor 两端都要遵守。

### 输入框检测：`activeElement` 优先 + `composedPath()` 兜底

`isInInputElement(e)` 采用双路径检测：

| 检测源 | 覆盖场景 |
|--------|---------|
| `document.activeElement`（优先） | 焦点转移竞态：点击输入框后立即按键，focus 事件先于 keydown，`activeElement` 已更新 |
| `e.composedPath()`（兜底） | Shadow DOM 穿透：当 `activeElement` 指向 Shadow Host 时，`composedPath` 包含 Shadow Root 内实际 input |

**Why：**
- 仅用 `composedPath()`：点击输入框后立即按键时，keydown 事件的 target 可能仍是旧元素，漏判
- 仅用 `activeElement`：Shadow DOM 内输入框可能指向 host 而非实际 input
- Vimium C 以 `activeElement` 为主要检测手段（`findNewEditable`），原始 Vimium 同时检查 `event.target` 和 `activeElement`

**How to apply：**
- 检测 `contenteditable` 时使用 `element.isContentEditable`（DOM 只读属性，自动处理继承链），而非 `getAttribute('contenteditable')`
- `<input>` 必须区分 type：`button`/`checkbox`/`radio`/`file`/`hidden`/`image`/`submit`/`reset`/`color`/`range` 不属于可编辑输入
- 额外检测 `<embed>` 和 `<object>`（可聚焦的嵌入式内容）

---

## 后台脚本

### Service Worker 异步

`onChanged` 监听器必须返回 `Promise`，否则 Service Worker 可能在异步 resolve 前休眠。

**Why：** Chrome MV3 的 Service Worker 空闲后会被回收，如果监听器不返回 Promise 等待异步完成，异步操作会被截断。

### `chrome.tabs.move` 跨窗口不保留 pinned 状态

`chrome.tabs.move` 跨窗口移动 tab 时，**`pinned` 属性和 pinned 索引都会丢失**，tab 在目标窗口变成普通 tab。

**Why：** Chrome API 的行为，`move` 只保证 tab 转移到目标窗口，不保证 pinned 状态。

**How to apply：**
- 跨窗口移动前必须保存 `tab.pinned` 状态
- 如果是 pinned tab，还需记录在当前窗口的 pinned 索引（必须在 `move` **之前**查询，移动后 tab 已不在源窗口）
- 移动完成后通过 `chrome.tabs.update(tabId, { pinned: true })` 恢复状态
- 如需恢复 pinned 索引位置：设 pinned 后再次 `chrome.tabs.move(tabId, { index: pinnedIndex })`
- `chrome.windows.create({ tabId })` 创建新窗口同样丢失 pinned 状态
- `mergeAllWindows` 等批量跨窗口移动的命令也要逐个恢复

**位置恢复策略：** 用内存 Map（`pinnedPositionCache`）记录 `{ tabId → { originalWindowId, pinnedIndex } }`。移出时记录，移回原窗口时恢复，其他窗口追加末尾。

---

## 工作流

### 新增 Widget 检查 `@@@@`

全局搜索 `@@@@` 确认无遗漏（`registry.ts`、`update.ts`），共用 Setting 面板时维护 `WIDGET_SETTING_PANE_MAP`。

### 问题分析：先验证上下文，再下结论

接到代码质量问题（如 lint 报告、扫描工具输出、"看起来有问题"的模式）时，**必须先验证上下文再判定是否是真问题**。

常见"伪问题"模式：

| 伪问题 | 为什么不是问题 |
|--------|---------------|
| config 层 import store 层 | `handleAppUpdate` / `manage.ts` 是顶层编排器，`globalState` 是跨层共享状态总线，非纯工具函数 |
| 迁移代码中大量 `as any` | 废弃字段已不在类型系统中，迁移代码天然需要绕过类型检查 |
| `res: any` + 末尾 `as Type` | Builder 模式，中间对象用 any，边界处收敛类型，常见且安全 |
| `innerHTML = CONSTANT` | 内容是硬编码常量，非用户输入拼接，不存在 XSS 风险 |
| catch 块只有 `console.warn` | 请求已成功的解析兜底，不是网络错误处理，静默降级合理 |
| `log()` 无 `__DEV__` 守卫 | 项目结构化日志系统，100+ 调用点，有意保持生产环境可用 |
| 数据结构的"重复"定义 | 14 个 widget 的 layout 结构相同但值不同，是数据不是逻辑，抽取工厂函数属于过度工程 |

**Why：** 不区分真问题和伪问题会导致：修复"非 bug"引入新 bug、增加不必要的抽象层、代码注释和实际行为不一致。

**How to apply：** 判定问题前必须回答三个问题：
1. 这段代码的实际运行时行为是什么？（读代码，不猜）
2. 如果"修"了，会影响哪些消费者？
3. 现有代码中是否有注释说明这是有意设计？


---

## ESC 逐层关闭 Drawer

Setting 面板打开时按 ESC 需逐层关闭子 Drawer 再关主面板。完整实现（`drawerStack` 栈结构、`useDrawerStack` composable、关闭路径、已注册子 Drawer 列表）详见 [setting.md](../docs/architecture/setting.md#drawer-stack-架构)。
