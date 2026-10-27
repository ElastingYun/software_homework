# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)：
**MAJOR** 大版本（可交付的完整系统）· **MINOR** 模块更新（新增模块或功能）· **PATCH** 修正（测试中发现的缺陷）。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [v0.8.8] — 修正：根 `<svg>` 的 id 可与图形 id 重复

### Fixed
- **BUG-9**（独立黑盒测试发现）读入 `<svg id="root">` 后 `create rect root …` 成功，保存的文件出现两个 `id="root"`，违反说明文档第 2 节"id 强制唯一"。
  - 原因：根元素的 id 作为透传属性保存，不在 id 索引中。
  - 修正：`SvgDocument.hasId`（`attach` / `create` / `group` 共用）把根 id 视为已占用；读入时先占用根 id，与之冲突的元素按重复 id 规则改名并警告。
  - 回归测试：BUG-9（2 个用例）。

## [v0.8.7] — 修正：接受 XML 无法表示的字符

### Fixed
- **BUG-8**（独立黑盒测试发现）`create text t 0 0 "a<U+0001>b"`（或 id 中含 NUL）被接受并保存，得到的文件不是合法 XML（`xmllint`: PCDATA invalid Char value 1），浏览器拒绝渲染。
  - 原因：只校验了数字，字符串原样进入模型。
  - 修正：新增 `model/XmlCharacters`：id、表现属性值、文本内容在进入模型时检查（`error: invalid character U+0001 in text`）；制表、换行、CJK、emoji 不受影响。
  - 回归测试：BUG-8（6 个用例，含孤立代理项与 U+FFFE）。

## [v0.8.6] — 修正：文本中的空白在保存/读回后改变

### Fixed
- **BUG-7**（独立黑盒测试发现）`create text t 0 0 "a   b  "` 保存后再读回变成 `"a b"`；外部文件中 `xml:space="preserve"` 的文本被折叠空白后写回，渲染结果改变。
  - 原因：读入时总是按默认规则折叠空白，写出时又从不声明 `xml:space`，两端规则不对称。
  - 修正：新增 `SvgWhitespace`（默认空白规则的唯一实现）；读入时遵循自身或祖先的 `xml:space="preserve"`；写出时若文本依赖空白则声明 `xml:space="preserve"`。
  - 回归测试：BUG-7（3 个用例，含继承自祖先的 preserve）。

## [v0.8.5] — 修正：叶子图形的子元素被静默丢弃

### Fixed
- **BUG-6**（独立黑盒测试发现）读入 `<rect><title>tip</title><animate/></rect>`、`<circle><rect id="inner"/></circle>` 时子元素被丢弃且没有任何警告（违反 GUIDE D7"不静默丢弃"）；`<text>a<title>tt</title>b</text>` 中的 tooltip 文本被并入可见文本，变成 `"attb"`。
  - 原因：读入只对容器递归处理子元素；`text()` 直接取 `textContent`，把所有后代的字符数据都算作文本。
  - 修正：`DomElementSource.text()` 只收集直接的文本/CDATA 节点与 `tspan` / `textPath` / `a` 中的文本；叶子图形构造后，未被使用的子元素以 `warning: dropped child elements of <rect id=r>: <title>, <animate>` 报告。
  - 回归测试：BUG-6（3 个用例）。

## [v0.8.4] — 修正：带 UTF-8 BOM 的文件无法读入

### Fixed
- **BUG-5**（独立黑盒测试发现）以 BOM（`EF BB BF`）开头的合法 SVG 文件读入失败：`invalid XML: … Unexpected content outside root element`。Windows 记事本等编辑器常写入 BOM。
  - 原因：`readFileSync(…, 'utf8')` 保留了 `\uFEFF`，xmldom 把它当成根元素之外的内容。
  - 修正：`SvgReader` 在解析前去掉开头的 BOM。
  - 回归测试：BUG-5（内存存储与真实文件各一例）。

## [v0.8.3] — 修正：保存时数值被四舍五入到 6 位小数

### Fixed
- **BUG-4**（独立黑盒测试发现）`save` 把所有数值按显示规则保留 6 位小数：读入 `x="0.12345678" width="0.0000003"` 后不做任何修改直接保存，得到 `x="0.123457" width="0"`——图形消失；`canvas 1e-7 1` 存为 `width="0"`，读回时又退回 800。
  - 原因：v0.2.0 把"去掉浮点噪声"的显示格式化 `NumericText.format` 也用在了序列化上，显示精度与存储精度混为一谈。
  - 修正：新增 `NumericText.serialize`（15 位有效数字）供 `SvgWriter` / `LeafShape.ownSvgAttributes` 使用；`format` 仅用于显示，并对按 6 位小数会显示成 0 的非零值改用有效数字（`w=2.5e-7`）。
  - 回归测试：BUG-4（4 个用例）；`NumericText.test` 新增 serialize 用例。

## [v0.8.2] — 修正：内层元素的命名空间声明在移动图形后丢失

### Fixed
- **BUG-3**（独立黑盒测试发现）读入 `<g id="sub" xmlns:inkscape="…"><rect inkscape:label="box"/></g>` 后执行 `ungroup sub`（或 `addto` 把 rect 移出），保存的文件中 `inkscape:label` 的前缀不在任何声明的作用域内，不是合法 XML，编辑器自己也读不回来（`NamespaceError`）。
  - 原因：命名空间声明被当成普通透传属性挂在原元素上；`ungroup` 丢弃容器属性（并把 `xmlns:inkscape` 当成"不保留的属性"警告），`addto` 则把图形移出了声明的作用域。
  - 修正：读入时把所有被导入元素上的 `xmlns:p` 声明提升到根 `<svg>`（同一前缀绑定不同 URI 时保留第一个并警告），`xmlns`/`xmlns:p` 不再作为图形的透传属性。
  - 回归测试：BUG-3（ungroup / addto 后保存再读回、提升后 ungroup 无多余警告、前缀冲突）。

## [v0.8.1] — 修正：极深嵌套导致命令执行到一半时栈溢出、状态损坏

### Fixed
- **BUG-2**（独立黑盒测试发现）嵌套约 2200 层的 `g` 链上执行 `delete g0` 报 `internal error: Maximum call stack size exceeded`，且此时 g0 已从树中摘出但 id 仍在索引中：`tree` 为空、`show g0` 显示 `parent=(detached)`、`save` 写出空文件——违反"命令失败不改变任何状态"。
  - 原因：Composite 上的算法（先序遍历、备忘录、渲染、序列化）都是递归的，深度不受限；`detach` 又是"先摘出、再遍历子树"，遍历溢出时修改已发生一半。
  - 修正：`SvgDocument` 新增第三条不变量"嵌套不超过 `MAX_DEPTH`（500）层"，在 `attach` / `relocate` 修改之前检查（`error: nesting too deep (at most 500 levels)`），`group` 在修改前预检；`heightOf` / `depthOf` 迭代实现；`detach` 改为先计算子树再修改；读入时先以迭代方式测量嵌套深度，超限文件在任何递归之前被拒绝。由此所有递归算法的深度都有界（500 层下全部操作经测试可用，留有约 4 倍栈余量）。
  - 回归测试：BUG-2（4 个用例，含 50 000 层的文件也能干净地报错）；`SvgDocument.test` 固定层级语义。

## [v0.8.0] — 架构 / 范式守卫测试

### Added
- `test/architecture/Paradigm.test.ts`：把说明文档 2.1"实现范式"写成可执行检查——每个源文件恰好导出一个与文件同名的类/接口；无自由函数、无导出常量；无 `switch`；`instanceof` 只用于错误类型；"名字 → 行为提供者"的注册表只有 `CommandRegistry` 与 `ShapeFactory` 两处且均标注"待重构"；具体类的注册只出现在组装根。
- GUIDE 新增决定 D21（scale 不缩放 stroke-width / font-size）、D22（溢出拒绝）。

## [v0.7.1] — 修正：几何量溢出为 Infinity

### Fixed
- **BUG-1** `scale` / `move` 的结果可能溢出为 `Infinity`（如 `create circle c 1e300 0 1e300` 后 `scale c 1e10`）：tree 显示 `cx=Infinity`，保存出 `cx="Infinity"` 的非法 SVG，读回时被当作 0，数据静默丢失。
  - 原因：输入数字有严格的有限性校验（`NumericText`），但运算结果没有；容器的递归操作也不是原子的。
  - 修正：`Geometry.translate/scale` 先计算全部新值并检查有限性，再一次性写入（`error: cx out of range`）；`GroupShape.moveBy/scaleBy` 在任一子图形失败时用备忘录恢复整棵子树——"全有或全无"由模型自身保证，而不是依赖调用方。
  - 回归测试：`test/regression/Defects.test.ts` BUG-1（4 个用例，含"容器不会被缩放一半"）。

## [v0.7.0] — 系统测试

### Added
- `examples/`：从说明文档中**程序化提取**的命令脚本 `demo.txt`（第 6 节典型会话）、`flowchart.txt`（6.1 节版本 A）与 `other.svg`；`examples/expected/` 中为期望 transcript（同样提取自说明文档）与**手写**的期望 SVG（独立于程序生成的判定依据）。
- 端到端测试 `test/e2e`：以子进程真实启动 CLI 回放脚本，与说明文档 transcript 逐行比对（第 6 节完全一致；6.1 节除手工对齐的空格外一致），保存出的 SVG 与手写期望逐字节一致，并验证"保存 → 新会话读回"的树完全相同。
- 验收测试 `test/spec`：按说明文档章节组织（§2 通用约定、§2.1 Composite、§4.1 参数与 SVG 片段及 set 白名单、§4.2 错误表**逐行**、§4.3 undo 粒度、§5 显示、§3 group/ungroup/addto/front/back 语义），每个错误场景同时断言"状态不变"。
- 测试辅助 `CliSession`、`CliProcess`。共 245 个测试；语句覆盖率 98.7%，分支覆盖率 94%。

## [v0.6.0] — cli 模块 + 组装根：首个可运行版本

### Added
- `Tokenizer` / `Token`：空白分隔、双引号（含 `\"`、`\\` 转义与空串），引号内的 `in` 不是关键字；未闭合引号报错。
- `ArgumentList`：参数个数、严格数字、尾部 `in <containerId>` 子句；统一 `usage: <语法>` 错误。
- `CommandParser` 抽象类 + 20 个解析器（每命令一个类）；`CreateParser` 的 help 由图形工厂已注册的类型自动生成。
- `CommandRegistry`（命令名 → 解析器，按名字分派之二）与分组 help。
- `CommandInterpreter`（Invoker）：注释/空行、`error:` 前缀、内部异常兜底。
- `Repl`：`svg>` 提示符；非交互输入时回显命令与注释（脚本回放即 transcript）；`exit` / EOF / Ctrl-C 退出；兼容 CRLF。
- `app/SvgEditorApp`（组装根）与 `main.ts`；`npm run cli`、`npm run build && npm start` 均可运行。
- 22 个 cli 测试（含横幅版本号与 package.json 一致的守卫测试）。
- GUIDE 新增决定 D18–D20。

## [v0.5.0] — command 模块（Command 模式）

### Added
- `Command` 接口与三个模板方法基类：`EditCommand`（执行后入 undo 栈、清空 redo）、`DocumentCommand`（执行后设历史屏障）、`QueryCommand`（只读）。
- `CommandHistory`：undo / redo 栈；IO 屏障（`undo not allowed after io command`）；`nothing to undo/redo`。
- `EditorContext`：当前文档与路径、历史、存储端口、退出标志。
- 编辑命令：`CreateShapeCommand`、`DeleteShapeCommand`、`MoveShapeCommand`、`ScaleShapeCommand`、`SetAttributeCommand`、`GroupShapesCommand`、`UngroupCommand`、`AddToGroupCommand`、`BringToFrontCommand` / `SendToBackCommand`（共同基类 `ReorderCommand`）。
- 文档命令：`InitDocumentCommand`、`ReadDocumentCommand`、`SaveDocumentCommand`、`ResizeCanvasCommand`；显示命令：`ShowCanvasCommand`、`TreeCommand`、`ShowShapeCommand`、`HelpCommand`；`UndoCommand`、`RedoCommand`、`ExitCommand`。
- 80 个命令层测试：每条编辑命令执行/撤销/重做的逐字节状态比对；说明文档 4.2 错误表与"命令失败不改变任何状态"（文档 + 历史 + 路径快照）。

### Changed
- GUIDE D12 推广为"ungroup 时容器的任何属性都不会转移，输出警告"。

## [v0.4.0] — view 模块

### Added
- `TreeRenderer`：`tree` / `tree <id>` 的树形文本；摘要列统一对齐（最长"前缀+标签" + 2）。与说明文档 5.1 节及 `other.svg` transcript 逐字一致。
- `ShapeInspector`：`show <id>` 的属性明细（父容器、自身属性、表现属性、只读透传属性、子图形）。与说明文档 5.2 节逐字一致。
- `Shape.describeOwnAttributes()` / `describeStyle()`（原 protected `styleDescriptions` 改为公开的 `describeStyle`）。
- 9 个 view 测试。

## [v0.3.0] — io 模块

### Added
- `DocumentStorage` 端口 + `LoadedDocument`；文件适配器 `SvgFileStorage`（`cannot read file` / `cannot write file`）。
- `SvgWriter`：只经 `Shape` 通用接口序列化（无类型分支）；与说明文档 0.1 节示例逐字节一致；XML 转义、数字去噪。
- `SvgReader`（@xmldom/xmldom）：两遍读入——先收集显式 id，再按文档序构造；缺 id 分配 `标签名+序号` 并警告，重复 id 改名并警告；不支持/外部命名空间的元素跳过并警告；`transform`、`font-size`、`data-*` 等透传属性与根元素命名空间声明原样保留；viewBox / 画布尺寸推导；非法数值宽松处理。
- `IdAllocator`、`DomElementSource`（`ElementSource` 的 DOM 实现）。
- 22 个 io 测试（含说明文档 `other.svg` 与 0.1 节两份 SVG 作为夹具，round-trip 校验）。

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
