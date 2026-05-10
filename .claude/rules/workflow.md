# 工作流规则

- **不启动 dev server：** 浏览器扩展 CLI 环境无法查看页面，UI 改动 type-check 通过即可，验证由用户负责。
- **不改版本号：** `package.json` 的 version 只能由用户手动修改。
- **不重复造轮子：** 必须使用 Naive UI 已有组件。
- **CLAUDE.md 维护：** 新规律/约定/坑点及时补充，过时描述及时修正。
- **memory 存储位置：** 新增 memory 文件写入 Claude Code 项目级 memory 目录（`~/.claude/projects/-Users-<name>-Code-<project>/memory/`），随 session 持久化。重要规范类记忆同步写入 `.claude/rules/`。
- **问题分析前置：** 每次修改问题前，必须仔细分析**是否真的是问题**。如果是则修复；如果不是（设计如此、框架特性、有意为之等），则在代码中添加清晰注释说明原因，避免下次误以为是 bug。过程中不确定的点与用户确认。修复非 bug 类"问题"后，**必须更新 `docs/` 下对应文档**以补充设计说明。
