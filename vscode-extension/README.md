# SVG Badge & Outline（第一部分：VSCode 插件实践）

两个功能：

- **A.1 文件标记**：Explorer 中 `.svg` 文件右侧显示 `[]`。不改文件名或内容；其他文件和目录不加标记。
- **A.2 SVG 大纲**：用文本编辑器打开 `.svg` 后，"大纲（Outline）"面板显示元素层级。
  - 节点名称：有 id 时显示 `标签名#id`，没有 id 时只显示标签名。
  - 点击节点，光标跳到对应源码。
  - 编辑后大纲自动更新。
  - XML 不完整（比如编辑到一半）时大纲暂时清空，不会报错。

方案与决定见 [`GUIDE.md`](GUIDE.md)。

## 安装（推荐：直接安装 .vsix，不需要 Node.js）

1. 在 VSCode 左侧打开"扩展"面板，点面板右上角的 **"…" → 从 VSIX 安装…（Install from VSIX…）**，选择 `svg-badge-outline-0.1.0.vsix`。
2. 安装完成后，扩展在 VSCode 启动后自动激活。如果没有生效，执行一次 **开发人员：重新加载窗口（Developer: Reload Window）**。

卸载：在扩展面板搜索 `SVG Badge & Outline` → 卸载。

## 从源码构建与调试（需要 Node.js ≥ 22）

```bash
cd vscode-extension
npm ci             # 安装依赖
npm run check      # 类型检查 + 单元测试
npm run package    # 编译并打包成 svg-badge-outline-0.1.0.vsix
```

调试：用 VSCode 打开 `vscode-extension` 文件夹，按 **F5**（运行配置 "Run Extension (open samples)"）。VSCode 会先编译，再打开一个"扩展开发宿主"窗口，自动载入 `samples/` 目录。

## 演示与截图步骤

用 VSCode 打开 `vscode-extension/samples/` 文件夹（文件 → 打开文件夹）。

**截图 1：文件标记**
在资源管理器中展开全部内容，应能看到：
- `flowchart.svg`、`nested.svg`、`incomplete.svg`，以及 `sub-folder/inside.svg` 右侧有 `[]`；
- `notes.txt`、`sub-folder` 目录、`folder-named.svg` 目录（名字以 .svg 结尾但它是目录）都**没有**标记。

**截图 2：大纲与源码定位**
1. 打开 `flowchart.svg`。VSCode 默认会用图片预览打开，需要改成文本编辑器：按 `Cmd+Shift+P`，执行"重新打开编辑器的方式…（Reopen Editor With…）"，选择"文本编辑器"。
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

> 小技巧：想让 `.svg` 默认用文本方式打开，可以在设置（JSON）中加入 `"workbench.editorAssociations": { "*.svg": "default" }`。

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
