# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)：
**MAJOR** 大版本（可交付的完整系统）· **MINOR** 模块更新（新增模块或功能）· **PATCH** 修正（测试中发现的缺陷）。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [v0.1.0] — 工程骨架与指导文档

### Added
- 工程骨架：`package.json`（TypeScript 5.9 / tsx / vitest / dependency-cruiser / @xmldom/xmldom）、`tsconfig.json`、`vitest.config.ts`。
- `doc/GUIDE.md`：开发指导文档（范围、技术选型、编码约定、未定细节的 17 项决定、版本里程碑、测试策略）。
- `doc/README.md` 第一部分"架构方案"：模块划分（含 PlantUML 包图）、设计模式、依赖方向规则 R1–R8、变化点假设 V1–V9。
