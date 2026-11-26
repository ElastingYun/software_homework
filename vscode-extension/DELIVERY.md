# 第一部分验收记录 · SVG Badge & Outline 0.1.2

主仓库为 `ElastingYun/software_homework`，Phase 1 基线为 `final`（`8edfba0`）。仓库级报告收录了 A.3 的分析与演示入口。[小组报告](../doc/README.md)

## 原作者的界面演示

原作者先在自己的 macOS 环境用文本编辑器打开 SVG，记录语言模式为 XML、内置大纲提示找不到符号的情形，再实现扩展。下表引用原作者的截图，截图中的行号按各图打开的文件计算。[开发前观察](GUIDE.md) · [内置大纲截图](docs/images/before-outline-empty.png)

| 验收项 | 图中可核对的结果 | 证据 |
|---|---|---|
| A.1 文件标记 | Explorer 中 SVG 旁出现 `[]`，相邻的普通文件和目录未显示标记。提供者仅用文件状态判断类型，单测另覆盖名为 `icons.svg` 的目录。 | [Explorer 截图](docs/images/after-badge-and-click-leaf.png) · [文件装饰测试](test/decoration/SvgFileDecorationProvider.test.ts) |
| A.2 层级与定位 | 在原生大纲中点击叶子 `circle#c1`、`text#title`，分别定位到第 6、4 行；点击嵌套容器 `g#node2` 定位到第 8 行。 | [圆形叶子](docs/images/after-badge-and-click-leaf.png) · [文本叶子](docs/images/after-click-leaf-text.png) · [嵌套容器](docs/images/after-nested-click-container.png) |
| A.2 编辑与异常输入 | 编辑中的 `text#title` 清空 id 后显示为 `text`。删除结束标签后，大纲显示找不到符号。 | [编辑更新](docs/images/after-edit-update-no-id.png) · [不完整 XML](docs/images/after-incomplete-xml-empty.png) |

## 2026 年 11 月 26 日独立复核

在 macOS、VS Code 1.147.0 的独立用户数据目录和扩展目录中启动扩展宿主，加载交接 VSIX 解出的扩展。启动配置没有手工指定 SVG 编辑器关联。以下行号从 1 开始。[宿主观测记录](docs/evidence/vscode-host.json)

| 操作 | 实测结果 |
|---|---|
| 启动后检查扩展与配置 | 扩展自动激活。宿主报告 `workbench.editorAssociations` 的默认值含 `"*.svg": "default"`。 |
| 打开 `flowchart.svg` 并请求文档符号 | 默认进入文本编辑器，符号树包含 `svg → g#flowchart → g#node1 → rect#start`。该叶子的源码位置为第 5 行，`g#node2` 下无 id 的文本节点显示为 `text`，位置为第 10 行。 |
| 在原生 Outline 中选择叶子 | 通过 Outline 的列表选择命令激活 `rect#start`，读回活动文本编辑器的文件名为 `flowchart.svg`，光标行是第 5 行，行内为 `<rect id="start" …/>`。 |
| 编辑同一未保存的文档，每次重新请求符号 | 把 `id="start"` 改为 `id="begin"` 后返回 `rect#begin`。把文档改为 `<svg><g>` 后返回空列表；再改为 `<svg><text/></svg>` 后返回 `svg → text`。 |
| 以 `UPPER.SVG` 打开嵌套示例的副本 | 默认进入文本编辑器，符号树包含 `g#diagram → g#nodeB` 以及其下的 `rect` 和 `text`。 |

## 从当前仓库复现

在仓库根目录运行以下命令。复核使用 Node.js 24.3.0。类型检查通过，Vitest 共运行 7 个测试文件，79 个用例全部通过，打包生成 `svg-badge-outline-0.1.2.vsix`。嵌套分组、无 id、编辑更新和不完整 XML 均有自动化用例。[解析器测试](test/outline/SvgOutlineParser.test.ts) · [符号提供者测试](test/outline/SvgDocumentSymbolProvider.test.ts)

```sh
cd vscode-extension
npm ci
npm run check
npm run package
```

本次还用 VS Code 安装命令把重新构建的 VSIX 装进独立扩展目录，安装成功。包内 12 个已编译的 JavaScript 文件与上述宿主复核所用版本逐字节相同。

在 VS Code 的扩展面板选择“从 VSIX 安装…”，载入生成的文件，再打开本目录的 `samples/`。需要调试源码时，直接用 VS Code 打开 `vscode-extension/` 并按 F5。[安装与调试](README.md)

1. 在 Explorer 中对照 `flowchart.svg`、`notes.txt` 和目录 `folder-named.svg`，检查只有 SVG 文件旁出现 `[]`。
2. 以文本方式打开 `flowchart.svg`，展开大纲并点击 `rect#start`，核对第 5 行。把 id 改为 `begin`，观察未保存状态下的大纲名称。
3. 打开 `incomplete.svg`，观察空大纲。删去末行未完成的 `<circle …`，补上 `</g></svg>`，可看到 `svg → g#half-typed → rect#r1`。

A.3 的接口与调用关系、Decorator 和 Adapter 的角色对照、对 Phase 1 解析/模型/遍历的复用评估见专题分析。AI 建议的核查与修正单独保留在过程记录中。[A.3 分析](ANALYSIS.md) · [过程记录](PROCESS.md)
