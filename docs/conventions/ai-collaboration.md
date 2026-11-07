# AI 协作开发治理方案

> 目标：让 AI 参与新增模块的开发，**不降低现有模块的可信度**。
> 适用阶段：Claude Code 作为唯一 AI 编码工具。未来接入其他工具时见 [§8](#8-未来演进)。

## 实施状态

| 项 | 状态 | 落地位置 | 验证方式 |
|----|------|----------|----------|
| P0-1 架构边界检查 | ✅ 已落地 | `scripts/check/check-boundaries.ts`，接入 pre-commit 与 CI | 故意在 `logic/` 引入 `.vue` 会被拦下（退出码 1） |
| P0-2 CI 校验 | ✅ 已落地 | `.github/workflows/pr-check.yml` | `--no-verify` 提交后 CI 仍然拦得住 |
| P0-3 覆盖率门槛 | ✅ 已落地 | `vite.config.ts` → `test.coverage.thresholds` | 阈值临时提到 99% 时以退出码 1 阻断 |
| P1-1 新模块测试骨架 | ✅ 改为内嵌进技能（不写独立生成器） | `skills/add-widget` Step 8、`skills/config-migration` Step 3 | 新增 Widget 必带 `__tests__/config.test.ts` |
| P1-3 影响面分析工具 | ✅ 已落地 | `scripts/check/impact.ts`（`pnpm impact <文件|目录>`），与边界检查共用 `lib/import-graph.ts` | 对 `memo/config.ts` 能识别出「0 个相关测试」 |
| P1-2 PR 影响面模板 | 待评估 | — | 单人直接提交场景下价值有限 |
| P2 组件契约测试 / e2e | 待评估 | — | — |

**覆盖率基线（2026-11 实测，被统计 86 个文件）**：全局 lines 74.8 / branches 63.8 / functions 76.4；`src/logic` lines 74.9 / branches 65.4 / functions 77.6。阈值取基线以下约 4 个百分点。

## 1. 为什么现有规范还不够

项目已有 `.claude/rules/` 一整套行为规则、`docs/` 一批架构文档、pre-commit 多道校验。这套东西对"人"足够，对 AI 有三个结构性缺陷：

| 缺陷 | 具体表现 |
|------|----------|
| **规则会被稀释** | 规则是提示词上下文。任务越长，早期规则在上下文中的权重越低。改到第 30 个文件时，"修改共享代码必须验证 4 个上下文"很可能已经不在 AI 的注意力里 |
| **违规不可见** | "必须验证 4 个上下文"这类要求没有产出物证明它被执行了。AI 说"已验证"和真的验证了，从 diff 上看不出区别 |
| **失效模式不同** | 人的失误多是"不敢改、改错地方"；AI 的失误多是"顺手改"——改造范围失控比改错更常见，而且 diff 太大时 review 会失效 |

还有一条容易忽视的：`simple-git-hooks` 是**本地钩子**，AI 遇到钩子报错时，加 `--no-verify` 的动机比人强得多。

**结论：能机器验证的，就不要只写成规则。** 规则层只保留无法自动判断的部分（方案设计、是否真是 bug、架构取舍）。

## 2. 现状盘点（2026-11 快照）

> 本节是当时的能力快照，不是现状。P0 落地后拦截能力已变化，判断当下请直接查 `scripts/check/`、`.github/workflows/` 与 `vite.config.ts`。

| 能力 | 位置 | 覆盖 | 局限 |
|------|------|------|------|
| 行为规则 | `.claude/rules/` | 编码习惯、禁硬编码、文档同步、踩坑 | 纯提示词，无强制力 |
| 架构文档 | `docs/` | 配置、存储、消息、Widget、Setting | 同上 |
| 结构校验 | `scripts/check/validate-registries.ts` | Widget 注册、命令一致性、i18n 同步、新闻源 | 只覆盖"注册点"，不覆盖"依赖方向" |
| 模式校验 | `scripts/check/check-patterns.ts` | CSS 模式（`v-bind`、`&--modifier`、`:deep`、z-index） | 只扫样式，不扫 TS import |
| 类型检查 | `pnpm typecheck` | 全量 | 无法发现跨上下文 API 误用（类型上都合法） |
| 回归测试 | `src/logic/__tests__/` | 配置迁移链、同步、日历、键盘、书签 | `components/` 与 `setting/` 基本无覆盖 |
| 提交闸门 | `simple-git-hooks` pre-commit | lint → typecheck → test → registries → patterns | 可被 `--no-verify` 绕过 |
| CI | `.github/workflows/pr-check.yml` | 与 pre-commit 对齐，另加覆盖率与 Chrome 构建 | — |

## 3. 风险模型

只列真正会造成线上问题、且当前拦不住的。按「发生概率 × 破坏力」排序：

| ID | 风险 | 典型表现 | 破坏力 | 当前拦截 |
|----|------|----------|--------|----------|
| R1 | **跨上下文依赖泄漏** | SW 里 import 了 `.vue`；CS 里用了 `localStorage`；`logic/` 反向依赖 `newtab/` | 高。dev 阶段不报错，只在特定上下文运行时崩，且难复现 | ❌ 无 |
| R2 | **持久化配置结构破坏** | 改了 `TWidgetConfig` 字段但没追加 `MIGRATION_STEPS` | 极高。老用户数据丢失，不可逆 | ⚠️ 部分（迁移链测试 + 3 个 snapshot 存在，但靠人记得写） |
| R3 | **注册点遗漏** | 新 Widget 未登记 `REGISTRY-MAP`、Setting 未进 `SETTING_GROUPS` | 中。功能静默失效 | ✅ 已拦截 |
| R4 | **改动半径失控** | 实现一个功能顺带重构了 5 个无关模块 | 中高。review 失效，回滚困难 | ❌ 无 |
| R5 | **新模块无回归网** | 新增 500 行逻辑，零测试；覆盖率无门槛 | 中。当期不影响，未来每次改动都在裸奔 | ❌ 无（覆盖率无阈值） |
| R6 | **硬编码** | 图标写死、文本未 i18n | 低 | ✅ 已拦截 |

R1 和 R4 是 AI 引入的新风险——人写代码时对"我在哪个上下文"有肌肉记忆，AI 每次都要重新推断。

## 4. 三层约束模型

```
L1 规则层  告诉 AI 怎么做        →  提示词，软约束，会被稀释
L2 检查层  机器判定是否违规      →  脚本 + CI，硬约束，不可绕过
L3 流程层  限制改动的形状        →  缩小单次改动的破坏面
```

三层缺一不可：只有 L1 会漂移，只有 L2 会催生"为过检查而写代码"，只有 L3 会依赖人的执行力。

**L1 的边界原则**：规则只写"机器判不了"的事。比如"这次改动是不是真的必要""该不该抽成通用组件"——这些必须留在规则里；而"import 方向对不对"必须从规则里移出去，交给脚本。

## 5. 落地清单

### P0 — 让约束真正生效

#### P0-1 架构边界检查 `scripts/check/check-boundaries.ts`

**防 R1。** 4 个执行上下文的隔离目前只写在 CLAUDE.md 的一句话里（"修改共享代码必须逐一验证 4 个上下文"），没有任何机制。

规则表（**已在现有代码上验证：全部零违规**，可零例外清单接入）：

| 源目录 | 禁止 import | 理由 |
|--------|------------|------|
| `src/logic/**` | `@/newtab`、`@/components`、`@/setting`、`@/popup`、`@/options` | logic 必须上下文无关。一旦反向依赖 UI，SW 引入即崩 |
| `src/background/**` | 任何 `.vue`、`@/components`、`@/setting`、`@/newtab`、`@/popup`、`@/options` | SW 无 DOM |
| `src/contentScripts/**` | `@/newtab`、`@/popup`、`@/options`、`@/setting`、`@/components` | 注入宿主页面，体积和 DOM 环境均受限 |
| `src/contentScripts/**` | 直接使用 `localStorage` | 宿主页面环境，应走 `chrome.storage` |
| `src/components/**` | `@/newtab`、`@/popup`、`@/options` | 通用组件不得依赖页面 |
| 全局 | 循环依赖 | 构建期难排查，运行期顺序不确定 |

**实现要点**：

- 用 TS AST 提取 import 说明符，先把 `@/` 别名还原成绝对路径前缀，再做前缀匹配。不要用正则直接 match 源码文本——注释和字符串会误报。
- **必须区分运行时依赖与类型依赖（实测踩坑）**：`import type { X } from './x'` 和类型位置的 `import('./x').X` 编译后都会被擦除，不构成真实耦合。`ts.preProcessFile` 无法区分这两类，会把类型位置的 `import()` 当成动态导入——实测在 `common/widget-constants.ts`（用 `import('@/newtab/...').TWidgetConfig` 做类型映射）和 `logic/config/migrations.ts`（`import type`）上产生了两个假环。必须走完整 AST；`.vue` 先用 `@vue/compiler-sfc` 拆出 `script` / `scriptSetup` 再分别解析，行号按块起始行换算。
- 输出必须可执行：`文件:行号 → 违规说明 → 正确做法`。报错信息里带上 `docs/conventions/ai-collaboration.md#p0-1` 锚点，让 AI 被拦下时能自己查。
- 接入点：追加到 `package.json` 的 pre-commit 链尾，同时进 CI。
- 顺带产出：脚本可输出一份模块依赖摘要，用于 review 时快速判断影响面。

**为什么不写成 ESLint 规则**：目录级跨文件约束用 `no-restricted-imports` 的 overrides 也能做，但通配路径的报错信息很糟，且项目已有 `scripts/check/` 的惯例，保持一致。

**验收标准**：故意在 `src/logic/utils/` 里写 `import X from '@/components/NtButton.vue'`，pre-commit 必须失败，且报错能指出正确做法。

#### P0-2 CI 校验 `.github/workflows/pr-check.yml`

**防"绕过本地钩子"。** 触发条件：`pull_request` + `push` 到主分支。步骤与本地 pre-commit 对齐，并补两项本地不跑的：

```yaml
- pnpm lint
- pnpm typecheck
- pnpm test -- --run
- pnpm exec tsx scripts/check/validate-registries.ts
- pnpm check-patterns
- pnpm exec tsx scripts/check/check-boundaries.ts   # P0-1 落地后加
- pnpm build:chrome                                  # 抓构建期问题（manifest 生成、i18n 编译）
```

**实现要点**：`pnpm install --frozen-lockfile`（防止 AI 顺手改 lockfile 掩盖依赖问题）；`BROWSER=chrome` 只构建一个目标即可，Firefox 差异主要在 manifest，CI 阶段不必要。

**验收标准**：开一个故意失败的 PR，CI 必须红；`git commit --no-verify` 之后 CI 仍然拦得住。

#### P0-3 覆盖率门槛

**防 R5。** 现在 `vite.config.ts` 里 `coverage` 只配了 `reportsDirectory`，没有 `thresholds`——新增 500 行零测试和新增 500 行全覆盖，检查结果完全一样。

**策略：只防倒退，不逼补历史。**

1. 先跑一次 `pnpm test:coverage` 取基线。**统计口径很关键**：当前未设 `coverage.include`，只统计被测试触达的文件（实测 86 个），测试文件本身不计入分母。代价是「从未被任何测试 import 的新文件」不进分母；但实际新增模块必然被注册点 import，仍会以 0 覆盖进入分母，门槛依然有效。
2. 阈值设为「基线 − 4~5 个百分点」，给正常波动留余量。
3. **只对 `src/logic/**` 设阈值**（纯逻辑、测试成本低、回归价值最高）。`components/` 和 `setting/` 暂不设——对 UI 强推覆盖率只会产出为了达标而写的废测试。
4. 阈值写进 `vite.config.ts` 的 `test.coverage.thresholds`，CI 用 `pnpm test:coverage`。

**验收标准**：新增一个 200 行、零测试的 `src/logic/xxx/` 模块，CI 覆盖率步骤必须失败。

### P1 — 让新模块天生合规

#### P1-1 新模块生成器 `pnpm new:widget`

**防 R3 + R5 在源头发生。** 现在 `/add-widget` 技能能生成骨架，但"带不带测试""i18n key 有没有建"依赖生成时的自觉。生成器应默认产出：

```
src/newtab/widgets/<name>/
├── index.vue              # WidgetWrap 包裹 + 空 state
├── config.ts              # 默认配置项
└── __tests__/config.test.ts   # 空壳 + 一条能跑通的断言
```

并自动完成：`REGISTRY-MAP.md` 登记、`SETTING_GROUPS` 占位、`zh-CN.json` / `en-US.json` 双语 key 占位、`ICONS` 常量占位。

**核心理由**：让"记得写测试"从人的自律变成脚手架的默认产物。空壳测试文件哪怕只有一条 `expect(config).toMatchSnapshot()`，也会在有人删改配置时立刻报错。

#### P1-2 PR 影响面模板 `.github/pull_request_template.md`

**防 R2 + R4。** 勾选式，不求全但要拦住最贵的错：

```markdown
## 改动类型
- [ ] 仅单个上下文（newtab / CS / SW / popup / options）
- [ ] 触及共享层（logic/config、keyboard、shortcut、utils）→ 需逐一验证 4 个上下文
- [ ] 修改持久化配置结构 → 已在 MIGRATION_STEPS 追加步骤 + 新增 snapshot
- [ ] 新增 Widget / Setting → 已过注册表校验

## 影响面
- 受影响模块：
- 新增/变更的测试：
- 已知未覆盖的风险：
```

**为什么这条重要**：AI 生成 PR 描述时会照着模板填，等于强制它做一次影响面自检。这是把"注意力"问题转成"格式"问题的低成本手段。

#### P1-3 影响面分析工具 `pnpm impact <文件|目录>`

**这是唯一帮 AI「做对」而非「拦错」的工具。** 前面几道防线都在事后拦截，它在动手前回答三个问题：谁依赖它、波及哪些执行上下文、哪些测试会覆盖它。

```text
▸ 直接依赖者（2）
  src/newtab/widgets/memo/index.ts
  src/newtab/widgets/memo/index.vue

▸ 受影响模块（1）
  newtab(2)

▸ 涉及执行上下文（1/4）  newtab

▸ 相关测试（0）
  （无——改动没有回归网保护，建议先补测试）

▸ 风险提示
  ⚠ 有依赖者但无相关测试：这类改动没有任何自动化保护，必须先补用例
```

**实现要点**：

- 与 `check-boundaries.ts` 共用 `scripts/check/lib/import-graph.ts`。两份脚本必须看到同一张图，否则「边界检查拦的」和「影响面显示的」会漂移。
- 「相关测试」用反向闭包算出：某个测试文件的 import 链里出现目标文件即算命中，不依赖人工维护映射表。
- 依赖者统计排除测试文件，与「相关测试」分开计数，避免同一批文件被算两遍。
- 风险提示来自 `.claude/rules/` 与踩坑文档里的已知高风险区（config 迁移、keyboard 缓存、shortcut 跨上下文等），不是通用套话。

### P2 — 补真正的盲区

#### P2-1 `components/ui` 契约测试

`@vue/test-utils` 已在依赖里但零使用。不需要全量覆盖，只给 `src/components/ui/` 下的原子组件加"props → 渲染结果"的契约测试（约 10 个组件）。价值在于：AI 改通用组件时，能立刻知道哪些用法被破坏。

#### P2-2 Playwright 扩展冒烟

加载构建产物 → 打开新标签页 → 断言关键路径（键盘渲染、Widget 可见、Setting 可开、书签可读）。成本最高，价值也最直接，但建议等 P0 稳定运行一段时间、且确实出现"typecheck 通过但页面白屏"的问题后再做。

## 6. 建议新增的规则条文

可直接合并进 `.claude/rules/workflow.md`。这些是**机器判不了**的部分，才值得占规则的位置：

```markdown
- **改动半径：** 单次任务限定在 1 个模块及其直接依赖。跨 3 个以上顶层目录（`newtab`/`logic`/`components`/`setting`/`background`/`contentScripts`）的改动必须先拆成多个任务并说明拆分理由。禁止"顺手重构"——发现的无关问题只记录，不动手。
- **基线先行：** 修改共享层（`logic/config`、`keyboard`、`shortcut`、`utils`）前，先跑 `pnpm test` 记录基线，改完再跑一次对比。禁止在未确认基线的情况下改动共享层。
- **新增行为先有失败用例：** 新增功能逻辑必须有对应测试文件。先写一个会失败的断言，再实现到通过——不接受"实现完再看要不要补测试"。
- **影响面声明：** 每个任务结束时输出：改动文件清单、是否触及共享层、受影响的执行上下文、新增/变更的测试。没有这份声明不得标记任务完成。
- **检查失败不绕过：** 任何 pre-commit / 检查脚本报错，必须修根因。禁止 `--no-verify`、禁止注释掉检查、禁止把规则加进 ignore 列表来"通过"。
```

## 7. 生效路径

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | P0-1 边界检查 + P0-2 CI | ✅ 已完成 |
| 二 | P0-3 覆盖率阈值（已随阶段一落地） + P1-2 PR 模板 | 阈值已完成，PR 模板待做 |
| 三 | P1-1 生成器 + §6 规则条文 | 待做 |

**不要一次全上。** 一次加太多约束，AI 会在实现功能时被反复打断，产出质量反而下降；而且分不清是哪条约束起了作用。

## 8. 未来演进

**接入第二个 AI 工具时**再引入 `AGENTS.md`：把通用规则集中在 AGENTS.md，`CLAUDE.md` 只保留 Claude Code 特有配置并引用前者。当前只有 Claude Code，提前引入只会变成两份会漂移的事实源。

**共享模块的契约测试**：如果 `logic/config` 的迁移风险继续升高，可以给 `test/fixtures/` 里的历史 snapshot 加"回放"测试——把每个历史版本的配置喂进迁移链，断言输出结构合法。目前 `migration-chain.test.ts` 已覆盖部分，值得评估是否覆盖到全部 snapshot。

## 9. 明确不做

划清边界，避免治理本身变成负担：

| 不做 | 原因 |
|------|------|
| Bundle 体积预算 | `workflow.md` 已判定：浏览器扩展产物在本地磁盘，以减小体积为目的的优化无意义 |
| 全量 UI 快照测试 | 样式高频变动，快照维护成本远高于收益 |
| 强行拉高覆盖率数字 | 覆盖率是防倒退的护栏，不是 KPI |
| 放开自动 Git 操作 | 维持"AI 不得自行 commit/push"，小步提交由人执行 |
| 引入 AGENTS.md | 单工具阶段属于重复事实源，见 §8 |

## 10. 规则自身的漂移（实战发现）

2026-11 审计的最大收获：风险不只是「AI 不遵守规则」，还有**规则本身是错的**。而 AI 对文档的信任度高于怀疑度，错误的规则会被精确执行。

| 位置 | 问题 | 后果 |
|------|------|------|
| `skills/config-migration` | 仍教在 `handleAppUpdate` 写 `if` 迁移分支，与 CLAUDE.md 的 `MIGRATION_STEPS` 直接冲突；默认配置路径误写为 `state.ts`（实际在 `defaults.ts`） | AI 照做会写出走不到导入路径的迁移，老用户数据静默丢失 |
| `skills/add-widget` | `REGISTRY-MAP.md` 的链接相对路径错误 | AI 打不开注册点索引 |
| `skills/add-widget` | 8 个步骤里没有测试步骤 | 新 Widget 天生没有回归网 |

**结论：重构后同步文档，范围要包含 `.claude/rules/` 与 `.claude/skills/`，不只是 `docs/`。**

一次性扫描即可发现这类问题：提取规则/技能中出现的 `src/**`、`scripts/**` 路径与 Markdown 相对链接，逐个校验存在性（本次共发现 4 处，其中 1 处是既有失效链接）。建议后续固化为检查脚本，纳入 CI——成本约 0.1 秒，收益是"文档里写的路径一定打得开"。

---

**相关文档**：[development.md](development.md)（编码风格与测试架构）、[widget-dev.md](../widgets/widget-dev.md)（Widget 生命周期）、[.claude/rules/workflow.md](../../.claude/rules/workflow.md)（现有工作流规则）
