# SVG Badge & Outline（第一部分：VSCode 插件实践）

两个功能：

- **A.1 文件标记**：Explorer 中 `.svg` 文件右侧显示 `[]`。不改文件名或内容；其他文件和目录不加标记。
- **A.2 SVG 大纲**：用文本编辑器打开 `.svg` 后，"大纲（Outline）"面板显示元素层级。
  - 节点名称：有 id 时显示 `标签名#id`，没有 id 时只显示标签名。
  - 点击节点，光标跳到对应源码。
  - 编辑后大纲自动更新。
  - XML 不完整（比如编辑到一半）时大纲暂时清空，不会报错。

方案与决定见 [`GUIDE.md`](GUIDE.md)；A.3 要求的分析（VSCode 与插件的职责及注册调用过程、文件装饰与 Decorator/Adapter 模式、Phase 1 复用评估）见 [`ANALYSIS.md`](ANALYSIS.md)。

## 安装（推荐：直接安装 .vsix，不需要 Node.js）

> `.vsix` 是构建产物，不在 git 仓库中。从仓库获取源码时，先按下一节用 `npm run package` 生成；拿到现成的 `.vsix` 文件时可直接安装。

1. 在 VSCode 左侧打开"扩展"面板，点面板右上角的 **"…" → 从 VSIX 安装…（Install from VSIX…）**，选择 `svg-badge-outline-0.1.2.vsix`。
2. 安装完成后，扩展在 VSCode 启动后自动激活。如果没有生效，执行一次 **开发人员：重新加载窗口（Developer: Reload Window）**。

卸载：在扩展面板搜索 `SVG Badge & Outline` → 卸载。

## 从源码构建与调试（需要 Node.js ≥ 22）

```bash
cd vscode-extension
npm ci             # 安装依赖
npm run check      # 类型检查 + 单元测试
npm run package    # 编译并打包成 svg-badge-outline-0.1.2.vsix
```

调试：用 VSCode 打开 `vscode-extension` 文件夹，按 **F5**（运行配置 "Run Extension (open samples)"）。VSCode 会先编译，再打开一个"扩展开发宿主"窗口，自动载入 `samples/` 目录。

## 演示与截图步骤

用 VSCode 打开 `vscode-extension/samples/` 文件夹（文件 → 打开文件夹）。

**截图 1：文件标记**
在资源管理器中展开全部内容，应能看到：
- `flowchart.svg`、`nested.svg`、`incomplete.svg`，以及 `sub-folder/inside.svg` 右侧有 `[]`；
- `notes.txt`、`sub-folder` 目录、`folder-named.svg` 目录（名字以 .svg 结尾但它是目录）都**没有**标记。

**截图 2：大纲与源码定位**
1. 打开 `flowchart.svg`，它会直接以文本方式打开（v0.1.1 起）。如果仍显示为图片，说明用户设置里另有关联：按 `Cmd+Shift+P`，执行"重新打开编辑器的方式…（Reopen Editor With…）"，选择"文本编辑器"。
2. 展开左下角的"大纲"，应显示：
   ```
   svg
   └ g#flowchart
     ├ g#node1  → rect#start, text#start-label
     ├ g#node2  → rect#process, text（这个 text 没有 id）
     └ line#arrow1
   ```
3. 点击大纲中的 `rect#start`，光标应跳到第 5 行的 `rect` 上。截图。

**截图 3：编辑更新与不完整 XML**
1. 在 `flowchart.svg` 中把 `id="start"` 改成 `id="begin"`，大纲随之变成 `rect#begin`。
2. 打开 `incomplete.svg`（同样用文本编辑器打开）。它故意写到一半，大纲为空，没有任何报错弹窗。截图。
3. 把文件补完整：删掉最后一行 `<circle …`，在末尾加上 `</g></svg>`。大纲立即出现 `svg → g#half-typed → rect#r1`。

> 从 v0.1.1 起，扩展把 `.svg` 的默认打开方式设为文本编辑器（否则点击大纲节点时 VSCode 会切换回图片预览，见 GUIDE.md 第 8 节 BUG-V1）。这只是默认值：如果想恢复双击 `.svg` 时显示图片，在用户设置中加入 `"workbench.editorAssociations": { "*.svg": "imagePreview.previewEditor" }`。

## 真实运行证据（macOS 上的 VSCode，用户截图）

| 需求 | 截图 | 说明 |
|---|---|---|
| 实现前：VSCode 不分析 SVG 结构 | [`before-image-preview.png`](docs/images/before-image-preview.png)、[`before-text-editor.png`](docs/images/before-text-editor.png)、[`before-outline-empty-annotated.png`](docs/images/before-outline-empty-annotated.png) | 默认以图片预览打开；文本方式下语言为 XML；大纲"找不到符号" |
| A.1 文件标记 | [`after-badge-and-click-leaf.png`](docs/images/after-badge-and-click-leaf.png) 等 | `.svg` 文件右侧 `[]`；`.txt`、`.transcript`、目录无标记 |
| A.2 层级、`标签名#id`、点击叶子定位 | [`after-badge-and-click-leaf.png`](docs/images/after-badge-and-click-leaf.png)、[`after-click-leaf-text.png`](docs/images/after-click-leaf-text.png) | 点 `circle#c1` → 第 6 行；点 `text#title` → 第 4 行 |
| A.2 多层嵌套、点击容器定位 | [`after-nested-click-container.png`](docs/images/after-nested-click-container.png) | `svg → g#flowchart → g#node2`，点 `g#node2` → 第 8 行，面包屑同步 |
| A.2 编辑更新、无 id 元素 | [`after-edit-update-no-id.png`](docs/images/after-edit-update-no-id.png) | 未保存的编辑中把 `id` 删空，大纲立即从 `text#title` 变为 `text` |
| A.2 不完整 XML | [`after-incomplete-xml-empty.png`](docs/images/after-incomplete-xml-empty.png) | 删掉 `</g>` 后大纲清空，无报错弹窗，问题面板 0 错误 |

## 目录

```
src/extension.ts                          VSCode 入口：activate()
src/SvgExtension.ts                       组装两个提供者并注册到 VSCode
src/decoration/SvgFileRule.ts             判断是否为 .svg 路径（纯逻辑）
src/decoration/SvgFileDecorationProvider.ts  文件装饰提供者
src/outline/SvgOutlineParser.ts           SVG 文本 → 大纲节点树（纯逻辑，不依赖 VSCode）
src/outline/OutlineScan.ts                单次解析：带位置的容错扫描
src/outline/OutlineNode.ts 等             节点与位置值对象
src/outline/SvgDocumentSymbolProvider.ts  文档符号提供者：把节点树适配成 VSCode 的 DocumentSymbol
test/                                     单元测试（vitest；用 test/support/vscode.ts 替代 vscode 模块）
samples/                                  演示用文件
docs/images/                              截图
```
