# 第一部分（VSCode 插件实践）开发指导

> 需求来源：`phase_cli_2-研-1.md` 第一部分（A.1–A.3）。本文先定方案，再写代码。
> 扩展代码放在本仓库顶层 `vscode-extension/`，与 CLI（`src/`、`test/`）完全分开，不修改 CLI 的任何文件。

## 1. 交付物与验收

| 需求 | 交付物 | 验收方式 |
|---|---|---|
| A.1 SVG 文件标记 | Explorer 中 `.svg` 文件右侧显示 `[]`；非 SVG 文件、目录不加标记；不改文件名和内容 | 单元测试（判定逻辑）+ 真实 VSCode 截图 |
| A.2 SVG 大纲 | Outline 显示元素嵌套层级；`标签名#id` / 无 id 时 `标签名`；点击定位源码；编辑后更新；XML 不完整时清空大纲、不崩溃 | 单元测试覆盖嵌套分组、无 id、编辑更新、不完整 XML + 真实 VSCode 截图 |
| A.3 分析与提交 | 源码、安装/启动步骤、示例 SVG、截图；三段分析（职责与注册调用过程 / Decorator 与 Adapter / Phase 1 复用评估） | 文档审阅 |

## 2. 实现前的观察（O1–O3）

在 VSCode（macOS）中打开 Phase 1 的 `examples/expected/demo.svg`，记录如下（截图：`docs/images/before-image-preview.png`、`docs/images/before-text-editor.png`、`docs/images/before-outline-empty.png`，带标注版 `before-outline-empty-annotated.png`）：

| # | 观察 | 对设计的影响 |
|---|---|---|
| O1 | 双击 `.svg` 默认以 **Image Preview**（图片预览）打开，看到的是渲染图形，不是源码 | 大纲只对文本编辑器生效；文档中说明需用"重新打开编辑器的方式 → 文本编辑器"打开 |
| O2 | 以文本方式打开后，状态栏语言模式为 **XML** | 大纲提供者按文件名模式 `**/*.svg` 注册，而不是按语言 `xml` 注册，避免影响其他 XML 文件 |
| O3 | 大纲面板显示"在文档'demo.svg'中找不到符号" | VSCode 本身不分析 SVG 结构，这正是 A.2 要补上的能力 |

## 3. 技术选型

| 关注点 | 选择 | 理由 |
|---|---|---|
| 语言 | TypeScript 5.9，`strict` | 与 Phase 1 一致 |
| 模块格式 | 编译为 CommonJS（`out/`） | VSCode 扩展最通用的形式，兼容旧版本 VSCode |
| 最低 VSCode 版本 | `engines.vscode: ^1.85.0`（`@types/vscode` 1.85） | 两个所需 API（`FileDecorationProvider`、`DocumentSymbolProvider`）早已稳定；版本要求低，组员的 VSCode 都能装 |
| XML 解析 | **自己写一个容错的、记录位置的扫描器**，不引入第三方库 | 大纲需要每个元素在源码中的起止位置，并要能识别"不完整"；Phase 1 用的 xmldom 不提供完整位置信息（见 A.3 复用评估） |
| 测试 | vitest，测试纯逻辑（不依赖 VSCode） | 服务器上可运行；VSCode 集成部分很薄，用真实运行截图验证 |
| 打包 | `@vscode/vsce` 打成 `.vsix` | 使用者无需安装 Node.js，在 VSCode 中"从 VSIX 安装"即可 |

## 4. 结构设计（面向对象，一类一文件）

```
vscode-extension/
├── package.json            扩展清单：activationEvents、contributes
├── src/
│   ├── extension.ts        入口：activate() 中向 VSCode 注册两个提供者
│   ├── decoration/
│   │   ├── SvgFileRule.ts              判定"是不是 SVG 文件"（纯逻辑，可单测）
│   │   └── SvgFileDecorationProvider.ts 实现 vscode.FileDecorationProvider
│   └── outline/
│       ├── SvgOutlineParser.ts         扫描 SVG 文本 → OutlineNode 树（纯逻辑，可单测）
│       ├── OutlineNode.ts              元素节点：标签名、id、源码起止位置、子节点
│       ├── SourcePosition.ts / SourceSpan.ts  位置值对象（行、列，从 0 开始）
│       ├── IncompleteXmlError.ts       不完整 / 不合法 XML
│       └── SvgDocumentSymbolProvider.ts 实现 vscode.DocumentSymbolProvider：把 OutlineNode 适配成 vscode.DocumentSymbol
├── test/                    vitest 单元测试
└── samples/                 示例 SVG
```

依赖方向：`extension.ts` → 两个 Provider → 纯逻辑类。**纯逻辑类不 import `vscode`**，因此可在没有 VSCode 的环境中测试；只有 Provider 与入口依赖 VSCode API。

## 5. 关键行为决定（E1–E10）

| # | 问题 | 决定 |
|---|---|---|
| E1 | 什么算 SVG 文件 | 扩展名 `.svg`（不区分大小写）且是**普通文件**；目录（即使名为 `x.svg`）不加标记 |
| E2 | 标记内容 | `badge: "[]"`（VSCode 的 badge 最多 2 个字符，恰好放下），`tooltip: "SVG file"`；不设颜色，避免改变文件名颜色 |
| E3 | 大纲对哪些文件生效 | 文件名匹配 `**/*.svg` 的文本文档（O2） |
| E4 | 节点名称 | 有非空 id：`标签名#id`；否则 `标签名`（如 `text`） |
| E5 | 哪些节点进入大纲 | 全部元素（包括 `path`、`defs`、`title` 等），从根 `svg` 开始；注释、处理指令（`<?xml …?>`）、CDATA、文本不进入大纲 |
| E6 | 点击定位 | `range` = 元素从 `<` 到结束标签 `>` 的完整范围；`selectionRange` = 开始标签中的标签名，点击时光标落到标签名处 |
| E7 | 编辑后更新 | VSCode 在文档变化后会重新请求符号；提供者每次都从当前文本重新解析，不缓存旧结果 |
| E8 | XML 不完整 | 标签未闭合、结束标签不匹配、引号或注释未结束等：返回**空大纲**（空数组），不抛异常、不弹错误提示 |
| E9 | 非 SVG 根元素 / 空文件 | 空文件 → 空大纲；根元素不是 `svg` 仍按 XML 显示层级（不做 SVG 规范校验，需求明确不要求） |
| E10 | 节点类型图标 | 根与容器（有子元素的）用 `SymbolKind.Namespace`，叶子用 `SymbolKind.Field`，只影响图标 |

## 6. 测试策略

| 测试 | 内容 |
|---|---|
| 嵌套分组 | 多层 `<g>` 的层级、顺序、源码位置正确 |
| 无 id 元素 | 显示为标签名；空 id `id=""` 也按无 id 处理 |
| 编辑更新 | 同一文档改动前后各解析一次，大纲反映新内容（新增、删除、改 id、改嵌套） |
| 不完整 XML | 未闭合标签、标签不匹配、属性引号未闭合、注释未结束、只有半个 `<`：都返回空结果且不抛异常 |
| 其他 | 注释与 `<?xml?>` 被忽略、CDATA 中的 `<` 不被当成标签、自闭合标签、中文 id、多行开始标签的位置 |
| 文件标记 | `.svg` / `.SVG` 文件加标记；`.txt`、无扩展名文件、名为 `x.svg` 的目录不加 |
| 真实运行 | 在 VSCode 中安装 `.vsix`，截图两项效果与"不完整 XML 时大纲清空" |

## 7. 安装与运行（使用者）

1. 获取 `vscode-extension/svg-outline-*.vsix`；
2. VSCode → 扩展面板右上角"…" → **从 VSIX 安装…** → 选择该文件；
3. 打开包含 `.svg` 的文件夹，Explorer 中可见 `[]`；用"重新打开编辑器的方式 → 文本编辑器"打开 SVG，展开"大纲"面板。

从源码构建（需要 Node.js ≥ 22）：`cd vscode-extension && npm ci && npm test && npm run package`。
