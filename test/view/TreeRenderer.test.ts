import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgReader } from '../../src/io/SvgReader.js';
import { SvgDocument } from '../../src/model/SvgDocument.js';
import { TreeRenderer } from '../../src/view/TreeRenderer.js';
import { TestShapes } from '../support/TestShapes.js';

const factory = TestShapes.factory();
const renderer = new TreeRenderer();

/** 说明文档 5.1 / 第 6 节主 transcript 中 group 之后的文档。 */
function markersDocument(): SvgDocument {
  const document = new SvgDocument(800, 600);
  document.attach(factory.create('rect', 'bg', ['0', '0', '800', '600', '#ffffff']), document.root);
  document.attach(factory.create('text', 'title', ['20', '40', 'My Diagram']), document.root);
  document.attach(factory.create('g', 'markers', []), document.root);
  const markers = document.requireContainer('markers');
  document.attach(factory.create('circle', 'c1', ['100', '100', '20', 'red']), markers);
  document.attach(factory.create('rect', 'box', ['200', '80', '60', '60', '#3366ff']), markers);
  return document;
}

describe('TreeRenderer', () => {
  it('matches spec section 5.1 exactly', () => {
    expect(renderer.renderDocument(markersDocument())).toEqual([
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
  });

  it('matches the tree of other.svg in the spec transcript exactly', () => {
    const document = new SvgReader(factory).read(readFileSync('test/fixtures/other.svg', 'utf8'), 'other.svg').document;
    expect(renderer.renderDocument(document)).toEqual([
      'svg (400x300)',
      '├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff',
      '├── text#t1        (10,290) "imported"',
      '├── circle#c1      cx=50 cy=50 r=10',
      '├── g#g1',
      '│   ├── rect#r2    x=0 y=0 w=10 h=10',
      '│   └── circle#c2  cx=5 cy=5 r=2',
      '└── ellipse#e1     cx=1 cy=2 rx=3 ry=4',
    ]);
  });

  it('renders a subtree rooted at the given shape (tree <id>)', () => {
    const document = markersDocument();
    expect(renderer.renderSubtree(document.requireShape('markers'))).toEqual([
      'g#markers',
      '├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    ]);
    expect(renderer.renderSubtree(document.requireShape('c1'))).toEqual(['circle#c1  cx=100 cy=100 r=20 fill=red']);
  });

  it('renders an empty canvas', () => {
    expect(renderer.renderDocument(new SvgDocument(1024, 768))).toEqual(['svg (1024x768)']);
  });

  it('flowchart (spec 6.1): same structure and content; column = longest label + 2', () => {
    const document = new SvgDocument();
    document.attach(factory.create('g', 'flowchart', []), document.root);
    const flowchart = document.requireContainer('flowchart');
    document.attach(factory.create('g', 'node1', []), flowchart);
    document.attach(factory.create('rect', 'start', ['120', '100', '160', '60', '#4a90d9']), document.requireContainer('node1'));
    document.attach(factory.create('text', 'start-label', ['155', '135', '开始']), document.requireContainer('node1'));
    document.attach(factory.create('g', 'node2', []), flowchart);
    document.attach(factory.create('rect', 'process', ['520', '100', '160', '60', '#f5a623']), document.requireContainer('node2'));
    document.attach(factory.create('text', 'process-label', ['545', '135', '处理数据']), document.requireContainer('node2'));
    document.attach(factory.create('line', 'arrow1', ['280', '130', '520', '130', 'black']), flowchart);
    const lines = renderer.renderDocument(document);
    // 说明文档中该图为手工对齐；这里只比较去掉多余空格后的内容。
    expect(lines.map((line) => line.replace(/(\S) {2,}/g, '$1 '))).toEqual([
      'svg (800x600)',
      '└── g#flowchart',
      '    ├── g#node1',
      '    │ ├── rect#start x=120 y=100 w=160 h=60 fill=#4a90d9',
      '    │ └── text#start-label (155,135) "开始"',
      '    ├── g#node2',
      '    │ ├── rect#process x=520 y=100 w=160 h=60 fill=#f5a623',
      '    │ └── text#process-label (545,135) "处理数据"',
      '    └── line#arrow1 (280,130) -> (520,130)',
    ]);
    // 摘要列 = 最长的"前缀+标签"（第 8 行，宽 30）+ 2 = 32。
    expect(lines[7]).toBe('    │   └── text#process-label  (545,135) "处理数据"');
    expect(lines[8]).toBe(`    └── line#arrow1${' '.repeat(32 - 19)}(280,130) -> (520,130)`);
  });
});
