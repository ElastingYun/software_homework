# Changelog（第一部分：VSCode 扩展）

版本号规则与 CLI 一致：MINOR 为功能/模块更新，PATCH 为测试或实际运行中发现的缺陷修正。

## [0.1.1] — 修正：点击大纲节点会切换到图片预览

### Fixed
- **BUG-V1**（用户在 macOS 的 VSCode 中实际运行时发现）用文本编辑器打开 `.svg` 后，点击大纲节点会立即切换成图片预览，无法定位源码。
  - 原因：该环境中 `.svg` 的默认编辑器是图片预览；点击大纲节点时 VSCode 按默认编辑器重新打开文件再定位。
  - 验证：用户手动添加 `"workbench.editorAssociations": {"*.svg": "default"}` 后，点击节点光标正确定位，确认了原因。
  - 修正：扩展通过 `contributes.configurationDefaults` 提供该默认值（GUIDE E11），用户设置仍然优先。
  - 测试：`test/extension/Manifest.test.ts` 检查清单中的该默认值。

## [0.1.0] — A.1 文件标记与 A.2 SVG 大纲

### Added
- `.svg` 文件在 Explorer 中显示 `[]`（目录与其他文件不加）。
- SVG 大纲：元素层级、`标签名#id`、点击定位、编辑后更新、XML 不完整时清空。
- 63 个单元测试；示例文件；安装与截图步骤。
