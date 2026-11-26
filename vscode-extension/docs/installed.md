# SVG Badge & Outline

在 VS Code 的资源管理器中，SVG 文件名右侧会出现 `[]`。用文本编辑器打开文件，展开“大纲”即可查看元素的嵌套关系。

可以把下面的内容保存为 `example.svg`，然后在 VS Code 中打开它所在的文件夹。

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <g id="flow">
    <rect id="start" width="40" height="20"/>
    <text>开始</text>
  </g>
</svg>
```

在大纲里展开 `svg → g#flow`。点击 `rect#start` 会定位到第 3 行，下面的无 id 元素显示为 `text`。在编辑器中将 `start` 改为 `begin`，无需保存即可看到新名称。删除 `</g>` 会暂时清空大纲，撤销后可继续导航。

如果文件打开后显示为图片，在命令面板运行“重新打开编辑器的方式…”并选择“文本编辑器”。用户自行设置的 SVG 编辑器关联优先于扩展提供的默认值。
