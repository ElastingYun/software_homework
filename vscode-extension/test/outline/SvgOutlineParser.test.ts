import { describe, expect, it } from 'vitest';
import { IncompleteXmlError } from '../../src/outline/IncompleteXmlError';
import { SvgOutlineParser } from '../../src/outline/SvgOutlineParser';
import { OutlineText } from '../support/OutlineText';

const parser = new SvgOutlineParser();
const outline = (text: string) => OutlineText.of(parser.parse(text));

/** 需求文档 §0.1 的第二个示例：外层 g 带 transform、嵌套 g、无 id 的 rect 与 text。 */
const NESTED = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <!-- 外层 <g>：一次性把整组向右下平移 (60,40)，子元素坐标无需修改 -->
  <g id="diagram" transform="translate(60,40)">
    <rect id="a" x="0" y="0" width="120" height="60" fill="#4a90d9"/>
    <line id="e" x1="120" y1="30" x2="200" y2="30" stroke="black"/>
    <!-- 嵌套 <g>：只把右端节点整体缩小并平移 -->
    <g id="nodeB" transform="translate(200,0) scale(0.8)">
      <rect x="0" y="0" width="120" height="60" fill="#f5a623"/>
      <text x="60" y="38" text-anchor="middle" font-size="16" fill="white">End</text>
    </g>
  </g>
</svg>
`;

describe('nested groups', () => {
  it('reproduces the element hierarchy in document order', () => {
    expect(outline(NESTED)).toEqual([
      'svg',
      '  g#diagram',
      '    rect#a',
      '    line#e',
      '    g#nodeB',
      '      rect',
      '      text',
    ]);
  });

  it('records the source range of each element and of its tag name', () => {
    const [svg] = parser.parse(NESTED);
    const nodeB = svg!.children[0]!.children[2]!;
    expect(nodeB.label).toBe('g#nodeB');
    expect(nodeB.nameSpan.start).toEqual({ line: 7, character: 5 });
    expect(nodeB.nameSpan.end).toEqual({ line: 7, character: 6 });
    expect(nodeB.span.start).toEqual({ line: 7, character: 4 });
    expect(nodeB.span.end).toEqual({ line: 10, character: 8 });
    expect(svg!.span.start).toEqual({ line: 1, character: 0 });
    expect(svg!.span.end).toEqual({ line: 12, character: 6 });
  });

  it('matches the spec screenshot: selecting rect#start jumps to line 3', () => {
    const text = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">',
      '  <g id="flow">',
      '    <rect id="start" x="30" y="70" width="120" height="60"/>',
      '    <text x="90" y="105">开始</text>',
      '  </g>',
      '</svg>',
    ].join('\n');
    const start = parser.parse(text)[0]!.children[0]!.children[0]!;
    expect(start.label).toBe('rect#start');
    expect(start.nameSpan.start.line + 1).toBe(3);
    expect(OutlineText.of(parser.parse(text))).toEqual(['svg', '  g#flow', '    rect#start', '    text']);
  });

  it('handles deeply nested groups', () => {
    const depth = 200;
    const text = `<svg>${'<g>'.repeat(depth)}<rect/>${'</g>'.repeat(depth)}</svg>`;
    const lines = outline(text);
    expect(lines).toHaveLength(depth + 2);
    expect(lines.at(-1)).toBe(`${'  '.repeat(depth + 1)}rect`);
  });
});

describe('elements without id', () => {
  it.each([
    ['<svg><text x="1">hi</text></svg>', 'text'],
    ['<svg><rect id=""/></svg>', 'rect'],
    ['<svg><rect id="   "/></svg>', 'rect'],
    ["<svg><rect id='r1'/></svg>", 'rect#r1'],
    ['<svg><rect data-id="x" xml:id="y"/></svg>', 'rect'],
    ['<svg><rect id="a&amp;b"/></svg>', 'rect#a&b'],
    ['<svg><rect id="&#x41;&#66;"/></svg>', 'rect#AB'],
    ['<svg><rect id="节点一"/></svg>', 'rect#节点一'],
  ])('%s → %s', (text, label) => {
    expect(outline(text)[1]).toBe(`  ${label}`);
  });

  it('shows every element, including ones the CLI does not support', () => {
    expect(outline('<svg><defs><linearGradient id="lg"><stop/></linearGradient></defs><path d="M0 0"/></svg>')).toEqual([
      'svg',
      '  defs',
      '    linearGradient#lg',
      '      stop',
      '  path',
    ]);
  });
});

describe('edit update: the outline always reflects the current text', () => {
  const before = '<svg>\n  <g id="g1">\n    <rect id="r1"/>\n  </g>\n</svg>';

  it.each([
    ['add an element', before.replace('<rect id="r1"/>', '<rect id="r1"/><circle id="c1"/>'), ['svg', '  g#g1', '    rect#r1', '    circle#c1']],
    ['remove an element', before.replace('<rect id="r1"/>', ''), ['svg', '  g#g1']],
    ['rename an id', before.replace('r1', 'renamed'), ['svg', '  g#g1', '    rect#renamed']],
    ['move out of the group', '<svg>\n  <g id="g1">\n  </g>\n  <rect id="r1"/>\n</svg>', ['svg', '  g#g1', '  rect#r1']],
  ])('%s', (_name, after, expected) => {
    expect(outline(before)).toEqual(['svg', '  g#g1', '    rect#r1']);
    expect(outline(after)).toEqual(expected);
  });

  it('positions shift with inserted lines', () => {
    const after = `<!-- new\nheader -->\n${before}`;
    const rect = (text: string) => parser.parse(text)[0]!.children[0]!.children[0]!;
    expect(rect(before).nameSpan.start.line).toBe(2);
    expect(rect(after).nameSpan.start.line).toBe(4);
  });

  it('recovers once the text becomes complete again', () => {
    const typing = ['<svg><g id="g1"><re', '<svg><g id="g1"><rect id="r', '<svg><g id="g1"><rect id="r2"/>', '<svg><g id="g1"><rect id="r2"/></g></svg>'];
    expect(typing.map((text) => OutlineText.of(parser.parseOrEmpty(text)))).toEqual([
      [],
      [],
      [],
      ['svg', '  g#g1', '    rect#r2'],
    ]);
  });
});

describe('incomplete XML: empty outline, never an exception', () => {
  it.each([
    ['unclosed element', '<svg><g id="a"><rect/></svg>'],
    ['missing end of root', '<svg><rect/>'],
    ['mismatched end tag', '<svg><g></rect></svg>'],
    ['unexpected end tag', '<svg/></g>'],
    ['half a start tag', '<svg><rect x="1"'],
    ['lone "<"', '<svg><</svg>'],
    ['unterminated attribute value', '<svg><rect id="r1/></svg>'],
    ['attribute without value', '<svg><rect hidden/></svg>'],
    ['unquoted attribute value', '<svg><rect x=1/></svg>'],
    ['attributes without whitespace', '<svg><rect x="1"y="2"/></svg>'],
    ['unterminated comment', '<svg><!-- note </svg>'],
    ['unterminated CDATA', '<svg><text><![CDATA[ a </text></svg>'],
    ['unterminated processing instruction', '<?xml version="1.0"'],
    ['unterminated DOCTYPE', '<!DOCTYPE svg [ <!ENTITY a "b"> '],
    ['unterminated end tag', '<svg></svg'],
  ])('%s', (_name, text) => {
    expect(() => parser.parse(text)).toThrow(IncompleteXmlError);
    expect(parser.parseOrEmpty(text)).toEqual([]);
  });

  it('empty and whitespace-only documents have an empty outline', () => {
    expect(parser.parse('')).toEqual([]);
    expect(parser.parse('  \n ')).toEqual([]);
  });
});

describe('markup that is not an element', () => {
  it('ignores declarations, comments, CDATA and processing instructions', () => {
    const text = [
      '<?xml version="1.0"?>',
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd" [ <!ENTITY e "<g>"> ]>',
      '<svg>',
      '  <!-- <rect id="commented"/> -->',
      '  <text><![CDATA[ <rect id="cdata"/> ]]></text>',
      '  <?pi <rect?>',
      '</svg>',
    ].join('\n');
    expect(outline(text)).toEqual(['svg', '  text']);
  });

  it('allows ">" in attribute values and whitespace around "="', () => {
    expect(outline('<svg><text id = "t" title="a > b">x</text></svg>')).toEqual(['svg', '  text#t']);
  });

  it('counts positions with CRLF and CR line endings', () => {
    for (const eol of ['\r\n', '\r', '\n']) {
      const rect = parser.parse(['<svg>', '  <rect id="r"/>', '</svg>'].join(eol))[0]!.children[0]!;
      expect(rect.nameSpan.start, JSON.stringify(eol)).toEqual({ line: 1, character: 3 });
    }
  });

  it('handles multi-line start tags and namespaced names', () => {
    const [svg] = parser.parse('<svg:svg\n  xmlns:svg="http://www.w3.org/2000/svg"\n  id="root">\n  <svg:rect id="r"/>\n</svg:svg>');
    expect(svg!.label).toBe('svg:svg#root');
    expect(svg!.children[0]!.label).toBe('svg:rect#r');
    expect(svg!.nameSpan.start).toEqual({ line: 0, character: 1 });
  });
});
