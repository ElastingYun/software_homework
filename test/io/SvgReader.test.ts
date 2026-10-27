import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgReader } from '../../src/io/SvgReader.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { DocumentInvariants } from '../support/DocumentInvariants.js';
import { TestShapes } from '../support/TestShapes.js';

const reader = new SvgReader(TestShapes.factory());
const writer = new SvgWriter();

function svg(body: string, rootAttributes = 'width="100" height="100"'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" ${rootAttributes}>${body}</svg>`;
}

describe('SvgReader', () => {
  it('reads the spec other.svg: auto id with warning, 7 elements', () => {
    const loaded = reader.read(readFileSync('test/fixtures/other.svg', 'utf8'), 'other.svg');
    expect(loaded.warnings).toEqual(['assigned id rect1 to unnamed <rect>']);
    const document = loaded.document;
    expect(document.sizeLabel).toBe('400x300');
    expect(document.shapeCount()).toBe(7);
    expect(document.allShapes().map((shape) => `${shape.label} ${shape.summary()}`)).toEqual([
      'rect#rect1 x=0 y=0 w=400 h=300 fill=#ffffff',
      'text#t1 (10,290) "imported"',
      'circle#c1 cx=50 cy=50 r=10',
      'g#g1 ',
      'rect#r2 x=0 y=0 w=10 h=10',
      'circle#c2 cx=5 cy=5 r=2',
      'ellipse#e1 cx=1 cy=2 rx=3 ry=4',
    ]);
    expect(document.requireShape('c2').parent).toBe(document.requireShape('g1'));
    DocumentInvariants.check(document);
  });

  it('round-trips: read → write reproduces a file written by the editor', () => {
    const xml = readFileSync('test/fixtures/flow.svg', 'utf8');
    expect(writer.write(reader.read(xml, 'flow.svg').document)).toBe(xml);
  });

  it('preserves transform and unknown attributes, skipping comments', () => {
    const loaded = reader.read(readFileSync('test/fixtures/transform.svg', 'utf8'), 'transform.svg');
    expect(loaded.warnings).toEqual(['assigned id rect1 to unnamed <rect>', 'assigned id text1 to unnamed <text>']);
    const xml = writer.write(loaded.document);
    expect(xml).toContain('<g id="diagram" transform="translate(60,40)">');
    expect(xml).toContain('<g id="nodeB" transform="translate(200,0) scale(0.8)">');
    expect(xml).toContain('<text id="text1" x="60" y="38" fill="white" text-anchor="middle" font-size="16">End</text>');
    expect(writer.write(reader.read(xml, 'again.svg').document)).toBe(xml);
  });

  it('auto ids avoid explicit ids that appear later in the file', () => {
    const loaded = reader.read(svg('<rect/><rect id="rect1"/><rect/>'), 'x.svg');
    expect(loaded.document.allShapes().map((shape) => shape.id)).toEqual(['rect2', 'rect1', 'rect3']);
    expect(loaded.warnings).toEqual(['assigned id rect2 to unnamed <rect>', 'assigned id rect3 to unnamed <rect>']);
  });

  it('renames duplicate ids (first occurrence wins)', () => {
    const loaded = reader.read(svg('<rect id="a"/><circle id="a"/>'), 'x.svg');
    expect(loaded.document.allShapes().map((shape) => shape.label)).toEqual(['rect#a', 'circle#circle1']);
    expect(loaded.warnings).toEqual(['duplicate id a on <circle>, assigned circle1']);
    DocumentInvariants.check(loaded.document);
  });

  it('skips unsupported elements (and their subtree) with a warning', () => {
    const loaded = reader.read(
      svg('<defs><rect id="hidden"/></defs><path d="M0 0"/><rect id="r"/>'),
      'x.svg',
    );
    expect(loaded.document.allShapes().map((shape) => shape.id)).toEqual(['r']);
    expect(loaded.warnings).toEqual(['skipped unsupported element <defs>', 'skipped unsupported element <path>']);
  });

  it('skips foreign-namespace elements but keeps root namespace declarations', () => {
    const xml =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:x" version="1.1" width="10" height="10">' +
      '<x:meta/><rect id="r" x:label="hi"/></svg>';
    const loaded = reader.read(xml, 'x.svg');
    expect(loaded.warnings).toEqual(['skipped unsupported element <x:meta>']);
    const out = writer.write(loaded.document);
    expect(out).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" xmlns:x="urn:x" version="1.1">');
    expect(out).toContain('<rect id="r" x="0" y="0" width="0" height="0" x:label="hi"/>');
    expect(reader.read(out, 'again.svg').warnings).toEqual([]);
  });

  it('accepts files without xmlns', () => {
    const loaded = reader.read('<svg width="10" height="20"><circle id="c" r="1"/></svg>', 'x.svg');
    expect(loaded.document.sizeLabel).toBe('10x20');
    expect(loaded.document.shapeCount()).toBe(1);
  });

  it('derives canvas size from viewBox, px units, or defaults', () => {
    expect(reader.read(svg('', 'viewBox="0 0 300 150"'), 'x.svg').document.sizeLabel).toBe('300x150');
    expect(reader.read(svg('', 'width="300px" height="150px"'), 'x.svg').document.sizeLabel).toBe('300x150');
    const loaded = reader.read(svg('', ''), 'x.svg');
    expect(loaded.document.sizeLabel).toBe('800x600');
    expect(loaded.warnings).toEqual(['canvas size not specified, using 800x600']);
  });

  it('warns when the viewBox is not 0 0 w h', () => {
    const loaded = reader.read(svg('', 'width="400" height="200" viewBox="0 0 100 50"'), 'x.svg');
    expect(loaded.warnings).toEqual(['viewBox "0 0 100 50" ignored, using "0 0 400 200"']);
  });

  it('lenient numbers: px accepted, garbage warned and replaced by 0', () => {
    const loaded = reader.read(svg('<rect id="r" x="5px" y="50%" width="10" height="1e1"/>'), 'x.svg');
    expect(loaded.document.requireShape('r').summary()).toBe('x=5 y=0 w=10 h=10');
    expect(loaded.warnings).toEqual(['invalid number y="50%" on <rect id=r>, using 0']);
  });

  it('skips elements whose geometry is invalid', () => {
    const loaded = reader.read(svg('<circle id="c" r="-5"/><rect id="r"/>'), 'x.svg');
    expect(loaded.document.allShapes().map((shape) => shape.id)).toEqual(['r']);
    expect(loaded.warnings).toEqual(['skipped <circle id=c>: r must be non-negative']);
  });

  it('normalises text whitespace and flattens nested tspans', () => {
    const loaded = reader.read(svg('<text id="t">\n   Hello\n   <tspan>big</tspan>  world  </text>'), 'x.svg');
    expect(loaded.document.requireShape('t').textContent()).toBe('Hello big world');
    expect(loaded.warnings).toEqual(['flattened nested elements in <text id=t>']);
  });

  it('rejects malformed XML and non-svg roots', () => {
    expect(() => reader.read('<svg><rect></svg>', 'bad.svg')).toThrow(/^cannot read file: bad\.svg \(invalid XML: /);
    expect(() => reader.read('<html/>', 'page.svg')).toThrow('cannot read file: page.svg (root element is not <svg>)');
    expect(() => reader.read('', 'empty.svg')).toThrow(/^cannot read file: empty\.svg/);
  });
});
