// A.3 复用评估的验证脚本：Phase 1 使用的 xmldom 能提供哪些位置信息、如何对待不完整 XML。
// 在仓库根目录运行（使用 CLI 已安装的 @xmldom/xmldom）：node vscode-extension/docs/evidence/xmldom-probe.mjs
import { DOMParser } from '@xmldom/xmldom';

const text = '<svg>\n  <g id="flow">\n    <rect id="start"/>\n    <text>hi</text>\n  </g>\n</svg>';
const document = new DOMParser().parseFromString(text, 'image/svg+xml');
const walk = (node, depth) => {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 1) {
      console.log(`${'  '.repeat(depth)}<${child.tagName}> id=${child.getAttribute('id')} line=${child.lineNumber} column=${child.columnNumber}`);
      walk(child, depth + 1);
    }
  }
};
walk(document, 0);
console.log('position-related properties on an element:', Object.keys(document.documentElement).filter((key) => /line|col|pos|end/i.test(key)));

for (const broken of ['<svg><g id="a"><rect/></svg>', '<svg><rect x="1"', '<svg><g>']) {
  try {
    new DOMParser({ onError: () => undefined }).parseFromString(broken, 'image/svg+xml');
    console.log(JSON.stringify(broken), '=> parsed');
  } catch (error) {
    console.log(JSON.stringify(broken), '=> threw:', error.message.split('\n')[0]);
  }
}
