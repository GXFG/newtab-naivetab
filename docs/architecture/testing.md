# 测试架构

## 概述

NaiveTab 使用 **Vitest + jsdom** 作为测试框架，核心模块已建立单元测试覆盖。

### 测试入口

```bash
pnpm test              # 交互模式（监听文件变化，开发时使用）
pnpm test -- --run     # 执行一次后退出（CI/PR 时使用）
```

### 配置文件

| 文件 | 职责 |
|------|------|
| `vite.config.ts` | 配置 `test: { globals: true, environment: 'jsdom', setupFiles: ['../test/setup.ts'] }` |
| `test/setup.ts` | 全局测试环境初始化：Chrome API mock、全局注入、浏览器 polyfill |

### 目录结构

```
src/logic/__tests__/
├── config-merge.test.ts    # 配置合并策略（纯函数，零 mock）
├── util.test.ts            # 工具函数：版本比较、URL、日志、sleep、createTab
├── compress.test.ts        # 压缩/解压：往返测试、前缀检测
├── task.test.ts            # 定时任务系统：keydown、timer、visibility、pageFocus
├── config-update.test.ts   # 配置更新与版本迁移逻辑
├── store.test.ts           # Store 可独立验证的导出
├── sync-flow.test.ts       # loadRemoteConfig 同步流程分支
├── sync-merge.test.ts      # 版本感知合并策略
├── upload-and-recovery.test.ts  # 上传链路、故障恢复、监听器
├── handle-app-update.test.ts    # handleAppUpdate 所有版本迁移分支
└── storage.test.ts         # 导入/导出功能、历史数据迁移
```

### 测试策略

测试按**依赖复杂度**分层，从纯函数到重度 mock 模块：

| 层级 | 模块 | Mock 程度 | 价值 |
|------|------|----------|------|
| **纯函数** | config/merge、util（版本比较） | 零 mock | 最高，核心逻辑正确性 |
| **轻量 mock** | compress、task | 最少 mock（store globalState） | 高，可独立验证 |
| **Vue 依赖** | config/update、store | mock reactive 对象 | 中高，覆盖版本迁移 |
| **重度 mock** | sync/core、sync/manage | mock 整个依赖树 | 中，覆盖同步/导入导出流程 |

### 测试环境 Polyfill

`test/setup.ts` 提供以下环境模拟：

- **Chrome Extension API**：`chrome.storage`（sync/local）、`chrome.tabs`、`chrome.runtime`、`chrome.permissions`、`chrome.menus`、`chrome.commands`
- **全局 API 注入**：`window.$t`（i18n）、`window.$message`、`window.$notification`、`window.appVersion`
- **浏览器 polyfill**：`Blob`（Node 原生，支持 `.stream()`）、`CompressionStream` / `DecompressionStream`（`node:stream/web`）
- **每次测试前清理**：`localStorage.clear()`、`vi.restoreAllMocks()`、清空 `chrome.storage.sync` mock 数据

### 自动运行

项目配置了 **pre-commit hook**，每次 `git commit` 时自动执行：

```bash
pnpm lint-staged && pnpm test -- --run
```

lint 或测试任一失败都会中断提交。可通过 `SKIP_SIMPLE_GIT_HOOKS=1` 临时跳过。

### 新增测试指南

#### Mock 策略

1. **优先测试纯函数/近纯函数**，不需要 mock 依赖
2. **使用 `vi.doMock()` + `vi.resetModules()`** 避免 mock 污染（需要重新 import 模块时）
3. **使用 `vi.mock()` 内联对象字面量** 时注意 hoisting，避免 TDZ 问题
4. **需要可变 mock 状态时**，在 `beforeEach` 中重置或使用 `globalThis` 传递

#### 命名规范

- 测试文件放在 `src/<模块>/__tests__/<文件名>.test.ts`
- `describe` 使用模块名或函数名
- `it` 描述预期行为（`returns true when...`、`handles ... gracefully`）

#### 避免的陷阱

- **`Blob.stream()` 在 jsdom 中不可用**：`test/setup.ts` 已将 `globalThis.Blob` 替换为 Node.js 原生 `Blob`
- **`vi.mock()` 的 hoisting**：mock 工厂函数不能引用外部变量，使用 `globalThis` 中转
- **mock 数据跨测试污染**：`beforeEach` 中调用 `vi.clearAllMocks()` 或 `vi.restoreAllMocks()`
- **Vue SFC 的 TDZ 问题**：测试组件时 `v-bind()` 变量必须在 `<script setup>` 最顶部声明
