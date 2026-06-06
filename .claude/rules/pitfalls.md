# 项目踩坑索引

本文档是踩坑规则的统一入口。各领域详情见对应文件：

| 领域 | 文件 | 触发场景 |
|------|------|----------|
| CSS & 样式 | [pitfalls-css.md](pitfalls-css.md) | 编辑 `.vue` / `.css` / `.scss` 文件 |
| Vue 组件 | [pitfalls-vue.md](pitfalls-vue.md) | 编辑 `.vue` 组件文件 |
| 配置系统 | [pitfalls-config.md](pitfalls-config.md) | 修改 `config/`、`config/sync/`、配置结构 |
| 快捷键系统 | [pitfalls-keyboard.md](pitfalls-keyboard.md) | 修改 `keyboard/`、`shortcut/`、按键处理 |
| 后台脚本 | [pitfalls-background.md](pitfalls-background.md) | 修改 `background/`、Service Worker 相关 |

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

---

## 跨上下文影响分析

项目运行在 4 个独立上下文：**newtab**（Vue 页面）、**CS**（Content Script 注入普通网页）、**SW**（Service Worker 后台）、**popup**（扩展弹窗）。修改共享代码时必须逐一验证：

| 共享模块 | 影响范围 | 验证要点 |
|----------|----------|----------|
| `config/` 配置结构 | 4 个上下文 | newtab 的 `localConfig`、CS 的 `loadConfig()` + `onChanged`、SW 的 `cache.ts` 缓存、popup 的 flushSync |
| `keyboard/` 键盘逻辑 | newtab + CS + SW | keymap 缓存、bookmark-state 的持久化、systemKeymap 的 storage.local |
| `shortcut/` 快捷键匹配 | newtab + CS + SW | `matchShortcut` 参数传递、Port 消息、sendMessage 降级 |
| `utils/` 工具函数 | 取决于调用方 | 确认所有调用方的上下文限制（如 CS 不可用 `localStorage`、SW 不可用 DOM API） |

**Why：** 不同上下文的 API 可用性和数据加载方式不同。例如 `chrome.storage.sync.get` 在 CS 中可用（~5-20ms），但在 SW 中初始缓存来自 `defaultConfig` 的内存副本——如果只改 newtab 端而漏了 SW 缓存加载路径，SW 会拿到旧结构。

**How to apply：** 改完代码后，对每个受影响的上下文自问：这个上下文如何加载该数据？初始值是什么？旧数据缺失新字段时行为是否正确？
