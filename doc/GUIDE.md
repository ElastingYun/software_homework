# 开发指导文档（GUIDE）

> 本文档是动手写代码之前的"施工图"：说明要做什么、按什么规则做、分几步做、每一步怎么验收。
> 架构方案（模块划分 / 设计模式 / 依赖规则 / 变化点）见 [`README.md`](README.md)，本文不重复，只引用。
> 需求来源：`phase_cli_1.md`（Lab1 Phase 1：SVG 编辑器 CLI），以下简称"说明文档"。

## 1. 目标与范围

| 项 | 内容 |
|---|---|
| 交付物 | 一个可运行的命令行 SVG 编辑器：`npm run cli` 进入 `svg>` REPL |
| 必须实现 | 说明文档第 2～5 节全部命令：init / read / save / canvas / create（rect、circle、ellipse、line、text、g + `in` 子句）/ delete / move / scale / set / group / ungroup / addto / front / back / tree / show / help / undo / redo |
| 明确不做 | `box` 复合图形（4.4，插件化阶段目标）——本阶段 `create box` 报 `unknown shape type`；结构路径寻址（XPath 式）|
| 质量门槛 | `npm run check` 全绿：TypeScript 严格模式类型检查 + 依赖方向规则检查 + 全部自动化测试；说明文档第 6 节两段 transcript 逐行复现 |

## 2. 技术选型（均选"通用、主流"的方案）

| 关注点 | 选择 | 理由 |
|---|---|---|
| 语言 / 运行时 | TypeScript 5.9（`strict`）+ Node.js ≥ 22，ESM | 说明文档要求 TS；5.x 是目前生态兼容性最好的稳定线 |
| 直接运行 TS | `tsx` | `npm run cli` 无需先编译；`npm run build` 另提供 tsc 产物 |
| XML 解析 | `@xmldom/xmldom` | W3C DOM 标准 API，纯 JS 无原生依赖；序列化由我们自己写（输出格式要可控） |
| 测试 | `vitest` + `@vitest/coverage-v8` | TS 原生支持、零配置，覆盖率开箱即用 |
| 依赖规则检查 | `dependency-cruiser` | 把 README 中的"依赖方向规则"写成可执行的规则，CI 式自动检查 |
| 版本管理 | git + 语义化版本 tag `vMAJOR.MINOR.PATCH` | 见第 5 节 |

## 3. 编码约定（对应说明文档 2.1"实现范式"）

1. **一类一文件，文件名 = 类名**（`RectShape.ts` 里只有 `class RectShape`）。接口同理（`Command.ts`）。入口 `main.ts` 仅一行启动代码。
2. **面向对象**：类层次 + 多态 + 字段私有化。禁止"公共数据袋 + 自由函数 + `switch(tag)`"。
   - 图形差异（几何属性、显示摘要、移动回显）全部通过**子类多态**表达；
   - 序列化、树形显示只调用 `Shape` 的抽象接口，**不判断具体类型**。
3. **按名字分派只允许两处**：`cli/CommandRegistry`（命令名 → 解析器）与 `model/ShapeFactory`（类型名 → 图形类）。两处都用"注册表"实现而非 `switch`，并在架构方案中标注为"待重构（插件化阶段改为插槽）"。
4. **Composite 统一操作**：`move / scale / set / delete` 对 `g` 与叶子一视同仁，命令代码不区分容器与叶子。
5. **命令失败不改变任何状态**：每个编辑命令"先全部校验、再修改"；错误统一抛 `EditorError`，由 CLI 层加 `error:` 前缀输出。
6. **IO 隔离**：只有 `io/` 可以碰文件系统与 XML 库；只有 `cli/`、`app/` 可以碰 stdin/stdout。命令返回"输出行"而不是直接打印。
7. 数字输出统一经 `NumericText.format`（整数原样、小数最多 6 位、去掉多余 0），避免 `0.30000000000000004` 之类的浮点噪声。

## 4. 说明文档中未写死之处——本项目的决定

说明文档给出了主干语义，下列细节由本项目自行决定（均写入测试，作为行为规格）：

| # | 问题 | 决定 | 理由 |
|---|---|---|---|
| D1 | IO 命令后 undo 栈怎么办 | init / read / save / canvas(改尺寸) 是**历史屏障**：清空 undo、redo 栈并上锁；下一条编辑命令解锁，但只能撤销到屏障为止 | init/read 换了文档，旧命令已无意义；save/canvas 统一处理，语义最简单 |
| D2 | `undo` 栈空 / `redo` 栈空 | `error: nothing to undo` / `error: nothing to redo`；上锁时 redo 报 `error: redo not allowed after io command` | 与 undo 对称 |
| D3 | `save x.svg` 之后再 `save` | 保存到最近一次 read **或** save 的路径（"另存为"语义）；init 后从未指定路径时 `save` 报 `error: no file path. use 'save <file.svg>'` | 主流编辑器惯例 |
| D4 | `group` 新容器放在哪里、成员顺序 | 新容器放在**文档序第一个成员**原来的位置；成员按**文档序**排列 | 说明文档 transcript：`group markers c1 box` 后 markers 恰在 c1 的原位置 |
| D5 | `move` / `scale` 作用于容器 | **递归作用于每个子孙的几何属性**（不改写 `transform`） | 与 scale 的"同乘全部几何属性"语义一致；先 move 再 scale 结果可预期 |
| D6 | 读入的 `<g transform>`、未知属性（`font-size`、`text-anchor`、`data-*`…） | **原样保留**并在保存时写回（round-trip 不丢数据），但不可 `set` | 白名单只约束"可编辑"，不应毁坏外部文件 |
| D7 | 读入不支持的元素（`path`、`defs`…） | 跳过并警告 `warning: skipped unsupported element <path>` | 本阶段只内置 6 种类型；不静默丢弃 |
| D8 | 读入重复 id | 第一个保留，后续按"标签名+序号"重新分配并警告 | id 必须唯一 |
| D9 | 读入的 viewBox 与 `0 0 w h` 不一致 | 警告并以 `0 0 w h` 为准 | 编辑器坐标模型是 1 用户单位 = 1 px |
| D10 | `init w` / `canvas w` 只给一个参数 | 只改宽度，高度取默认（init）或保持不变（canvas）；尺寸必须为正 | `[w] [h]` 的自然解读 |
| D11 | 尺寸类几何量（width/height/r/rx/ry）为负 | `error: <attr> must be non-negative` | SVG 规范中负尺寸是错误 |
| D12 | `ungroup` 带属性（`transform`、`fill` 等）的容器 | 允许，但这些属性不会转移给子图形：先输出 `warning: attributes of g#x are not kept: transform, fill` | 说明文档未禁止；如实提示可能的外观变化 |
| D13 | `addto` 把容器放进自己或子孙 | `error: cannot move a container into its own descendant: <id>` | 防止成环 |
| D14 | tree 的摘要列对齐 | 所有行的摘要从同一列开始：`max(前缀+标签宽度) + 2`，过长时至少 1 空格 | 与说明文档主 transcript 逐字一致 |
| D15 | 说明文档未给出的回显（scale、addto、front、undo create…） | 统一句式 `<tag>#<id> <动词短语>`，见 `test/` 中的期望输出 | 与已给出的回显风格一致 |
| D16 | 非交互（管道/重定向）输入 | 回显 `svg> <命令>`，注释行原样回显，便于把脚本回放成 transcript | 说明文档提示"命令序列存成脚本回放" |
| D17 | 退出 REPL | `exit`（或 EOF / Ctrl-D） | REPL 常规需求，作为普通命令注册 |

## 5. 版本与里程碑（git tag）

语义化版本：**MAJOR**（大版本：可交付的完整系统）. **MINOR**（模块更新：新增一个模块或一组功能）. **PATCH**（修正：测试中发现的错误）。
每个里程碑 = 若干小提交 + 一个 tag；每个 tag 都满足"类型检查通过 + 已有测试全绿"。

| 版本 | 内容 | 验收 |
|---|---|---|
| v0.1.0 | 工程骨架、本指导文档、架构方案（README 第 1 部分）、CHANGELOG | 文档评审 |
| v0.2.0 | `model/`：图形类层次、几何、属性、容器、`SvgDocument`、`ShapeFactory`、备忘录 | model 单元测试 |
| v0.3.0 | `io/`：SVG 写出、读入（自动补 id / 警告）、文件存储 | io 单元测试 + round-trip |
| v0.4.0 | `view/`：tree、show 渲染 | 与说明文档 5.1 / 5.2 样例逐字比对 |
| v0.5.0 | `command/`：Command 接口、历史栈、全部编辑/文档/显示/历史命令 | 命令单元测试（含 undo/redo、失败不改状态） |
| v0.6.0 | `cli/` + `app/`：分词、参数解析、命令注册表、REPL；首个可运行版本 | CLI 单元测试 + 手工冒烟 |
| v0.7.0 | 系统测试：说明文档 transcript 端到端回放、依赖规则检查、覆盖率 | `npm run check` |
| v0.x.y | 测试中发现的缺陷修正（每个缺陷一个 PATCH，CHANGELOG 记录"现象 → 原因 → 修正"） | 回归测试 |
| v1.0.0 | 交付：README 补全过程记录、一致性自查、质量保证；打 `final` tag | 全部检查通过 |

## 6. 测试策略

| 层次 | 位置 | 内容 |
|---|---|---|
| 单元测试 | `test/model`、`test/io`、`test/view`、`test/command`、`test/cli` | 每个模块独立测试，依赖用内存替身（如 `InMemoryStorage`） |
| 规格测试 | `test/spec` | 逐条覆盖说明文档：4.2 错误信息表每一行、4.3 undo 粒度、5.x 显示格式 |
| 端到端 | `test/e2e` | 真实启动 `tsx src/main.ts`，把说明文档第 6 节命令序列喂给 stdin，与期望 transcript 逐行比对 |
| 架构测试 | `npm run lint:deps` | dependency-cruiser 检查依赖方向规则与循环依赖 |
| 不变量 | 测试工具 `DocumentInvariants` | 每次命令后检查：id 索引 = 树中实际 id 集合、父指针一致、无环 |

缺陷处理流程：测试失败 → 定位根因 → 先补/保留能复现的测试 → 修正 → 全量回归 → 以 PATCH 版本提交，并在 CHANGELOG 与 README"过程记录"中登记。
