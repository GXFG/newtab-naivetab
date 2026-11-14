# 文档索引与写作约定

本文件是文档目录的**唯一索引**。`CLAUDE.md` 只保留入口指针，不重复维护清单。

## 写之前先选载体

同一件事写在不同地方，腐烂速度差一个数量级。选错载体，再认真也会过期。

| 内容 | 载体 | 腐烂速度 | 判据 |
|------|------|----------|------|
| 有哪些命令/字段/组件、数量、签名 | **代码**：grep、类型、`defaults.ts` | 周级 | 别写进文档，写路径 |
| 怎么完成一次操作 | **`.claude/skills/`** | 月级 | 步骤会随工具链变，按需加载 |
| 为什么这样设计、否决过什么 | **`docs/decisions/`**（ADR） | 年/永久 | 带日期，只增不改 |
| 跨模块的数据流与因果 | `docs/architecture/`、`docs/features/` | 年 | 读单个文件看不出来的部分 |
| 反直觉的坑 | `.claude/rules/pitfalls-*.md` | 年 | 踩过一次、不写会再踩 |

## 硬规则

1. **不写会变的数字**。"49 条命令""97 个主题""39 个字段"一律不写，改写「见 `registry.ts` 的分段」。grep 一行就能得到，而且永远准。
2. **不抄类型、枚举、默认值、配置片段**。指向文件，不复制内容。复制即漂移。
3. **一篇只做一件事**。解释里混参考表，参考表一定先烂，烂了会连累旁边的解释一起被怀疑。
4. **每条"为什么"必须有日期与代价**。没有日期的论断，半年后没人敢信。
5. **改代码时先问一句**：这条信息会不会因为我的改动变成假话？会 → 同一次提交里改掉或删掉。

## 索引

### 架构（解释：跨模块因果）

| 文档 | 回答什么 |
|------|----------|
| [config.md](architecture/config.md) | 三层配置、迁移链、主题与缩放的设计取舍 |
| [storage.md](architecture/storage.md) | 存在哪、压缩阈值、同步冲突、内容指纹 |
| [messaging.md](architecture/messaging.md) | SW / CS / NewTab 如何通信，三层兜底为何这样分 |
| [background-modules.md](architecture/background-modules.md) | SW 内部模块、启动顺序、层切换冷却 |
| [background.md](architecture/background.md) | 背景图来源、双层渲染、幻彩效果 |
| [setting.md](architecture/setting.md) | 设置面板结构、注册方式、drawerStack |
| [task.md](architecture/task.md) | 按键与定时任务的分发、优先级、节流 |
| [moveable.md](architecture/moveable.md) | Widget 拖拽与吸附算法 |
| [icons.md](architecture/icons.md) | 图标为何构建期离线渲染，新增图标流程 |
| [reka-ui.md](architecture/reka-ui.md) | Reka 组件封装规范与设计语言（新增组件前必读） |
| [styles.md](architecture/styles.md) | 样式分层与作用域：三条轨道、widget 为何用 #id、px 与 vmin 双轨 |

### 功能（解释：单一领域的设计）

| 文档 | 回答什么 |
|------|----------|
| [keyboard.md](features/keyboard.md) | 键盘渲染、布局、主题、单位换算 |
| [bookmark.md](features/bookmark.md) | 书签源、同步、层绑定、删除重建顺序 |
| [global-shortcut.md](features/global-shortcut.md) | 命令体系、execEnv 路由、滚动加速模型 |

### Widget

| 文档 | 回答什么 |
|------|----------|
| [widget-dev.md](widgets/widget-dev.md) | Widget 生命周期、WidgetWrap、定时任务 |
| [calendar-widget.md](widgets/calendar-widget.md) | 农历与黄历适配、节假日订阅 |

### 规范

| 文档 | 回答什么 |
|------|----------|
| [development.md](conventions/development.md) | 编码风格、测试架构、快照测试 |
| [ai-collaboration.md](conventions/ai-collaboration.md) | 三层约束模型、架构边界规则 |

### 决策（ADR）

见 [decisions/README.md](decisions/README.md)。每条只记录一次决策，不描述现状。

### 商店文案（面向人，不是工程文档）

| 文件 | 用途 |
|------|------|
| [app-store/store-description-zh.txt](app-store/store-description-zh.txt) | 商店简介（中文） |
| [app-store/store-description-en.txt](app-store/store-description-en.txt) | 商店简介（英文） |
| [app-store/forum-post.md](app-store/forum-post.md) | 社区自荐贴 |

这三份是上架与推广用的成品文案，和代码没有对应关系，因此不适用上面的写作约定——"指向文件、不抄内容"那条针对的是工程知识，文案本身就是最终产物，改了就改了，不需要同步任何地方。

