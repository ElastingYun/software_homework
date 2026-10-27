# svg-editor-cli

Lab1 Phase 1 —— 命令行 SVG 编辑器（TypeScript，面向对象，Command 模式）。

## 快速开始

```bash
npm install
npm run cli                                   # 进入 svg> 交互式 REPL（exit 或 Ctrl-D 退出）
cd examples && npx tsx ../src/main.ts < demo.txt   # 回放说明文档第 6 节的典型会话
npm run check                                 # 类型检查 + 依赖方向规则 + 全部测试
npm run test:coverage                         # 覆盖率
npm run build && npm start                    # 编译为 dist/ 后运行
```

脚本模式：把命令逐行写进文件、重定向到 stdin，输出就是 transcript（命令前带 `svg>` 回显，`#` 注释原样保留）。

## 命令速查

| 类别 | 命令 |
|---|---|
| 文档（执行后不可 undo） | `init [w] [h]` · `read <file.svg>` · `save [file.svg]` · `canvas [w] [h]` |
| 编辑（可 undo/redo） | `create <type> <id> [params…] [in <containerId>]`（rect / circle / ellipse / line / text / g）· `delete <id>` · `move <id> <dx> <dy>` · `scale <id> <factor>` · `set <id> <attr> <value>` · `group <newGid> <id…>` · `ungroup <gid>` · `addto <gid> <id>` · `front <id>` · `back <id>` |
| 显示 | `tree [id]` · `show <id>` · `help` |
| 历史 / 会话 | `undo` · `redo` · `exit` |

完整语法见 `help`；各命令的细节与未在说明文档中写死之处的决定见 [`doc/GUIDE.md`](doc/GUIDE.md) 第 4 节。

## 目录

```
src/
  model/    领域模型：Shape 类层次（Composite）、SvgDocument、ShapeFactory、Geometry …
  io/       SVG 读写与文件存储（DocumentStorage 端口）
  view/     tree / show 文本渲染
  command/  Command 模式：命令、历史栈、编辑会话
  cli/      分词、参数解析、命令注册表、REPL（parsers/ 每个命令一个解析器）
  app/      组装根 SvgEditorApp；main.ts 为入口
test/       model · io · view · command · cli · spec（按说明文档章节）· e2e（真实进程）· regression（BUG-1…13）· architecture
examples/   说明文档中的命令脚本、期望 transcript 与手写的期望 SVG
doc/        README.md（架构方案 / 过程记录 / 一致性自查 / 质量保证）· GUIDE.md（开发指导）
```

## 文档

- 设计与过程文档：[`doc/README.md`](doc/README.md)
- 开发指导（范围、约定、决定 D1–D24、里程碑）：[`doc/GUIDE.md`](doc/GUIDE.md)
- 版本历史（每个模块更新与缺陷修正）：[`CHANGELOG.md`](CHANGELOG.md)，git tag `v0.1.0` … `v1.0.0`，最终提交另有 tag `final`
