# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)：
**MAJOR** 大版本（可交付的完整系统）· **MINOR** 模块更新（新增模块或功能）· **PATCH** 修正（测试中发现的缺陷）。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [v0.2.0] — model 模块

### Added
- 图形类层次（Composite）：`Shape` → `LeafShape` → `RectShape` / `CircleShape` / `EllipseShape` / `LineShape` / `TextShape`；`GroupShape` 同时实现 `Container`。
- 几何量 `Geometry` + 轴策略 `HorizontalAxis` / `VerticalAxis` / `SizeAxis`（Strategy）：平移、缩放、非负校验无需按属性名分支。
- 备忘录 `GeometryMemento` / `CompositeMemento`：move / scale 精确撤销。
- 属性三分：几何/文本（自身属性）、`PresentationStyle`（fill/stroke/stroke-width）、透传属性（读入时保留）。
- `SvgDocument`：画布尺寸、id 索引、`attach` / `detach` / `relocate` 三个结构修改入口（id 冲突原子失败）。
- `ShapeFactory`（类型名 → 图形类注册表）、`ShapeClass` 静态协议、`ShapeParams`、`ElementSource`。
- `NumericText`：严格数字解析与去噪格式化。
- 69 个单元测试；测试辅助 `DocumentInvariants`（id 索引 ⇔ 树、父指针）。

### Changed
- 依赖规则 R8 细化为 R8a（禁止运行时循环）与 R8b（禁止跨模块循环），见 README 过程记录 P2。

## [v0.1.0] — 工程骨架与指导文档

### Added
- 工程骨架：`package.json`（TypeScript 5.9 / tsx / vitest / dependency-cruiser / @xmldom/xmldom）、`tsconfig.json`、`vitest.config.ts`。
- `doc/GUIDE.md`：开发指导文档（范围、技术选型、编码约定、未定细节的 17 项决定、版本里程碑、测试策略）。
- `doc/README.md` 第一部分"架构方案"：模块划分（含 PlantUML 包图）、设计模式、依赖方向规则 R1–R8、变化点假设 V1–V9。
