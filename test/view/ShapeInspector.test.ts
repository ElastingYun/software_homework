import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgReader } from '../../src/io/SvgReader.js';
import { SvgDocument } from '../../src/model/SvgDocument.js';
import { ShapeInspector } from '../../src/view/ShapeInspector.js';
import { TestShapes } from '../support/TestShapes.js';

const factory = TestShapes.factory();
const inspector = new ShapeInspector();

describe('ShapeInspector', () => {
  it('matches spec section 5.2 exactly', () => {
    const document = new SvgDocument();
    document.attach(factory.create('g', 'markers', []), document.root);
    document.attach(factory.create('circle', 'c1', ['100', '100', '20', 'red']), document.requireContainer('markers'));
    expect(inspector.render(document.requireShape('c1'))).toEqual([
      'circle#c1  parent=g#markers',
      '  cx=100 cy=100 r=20',
      '  fill=red',
    ]);
  });

  it('shows text content, top-level parent and missing style', () => {
    const document = new SvgDocument();
    document.attach(factory.create('text', 'title', ['20', '40', 'My Diagram']), document.root);
    expect(inspector.render(document.requireShape('title'))).toEqual([
      'text#title  parent=svg',
      '  x=20 y=40 text="My Diagram"',
    ]);
  });

  it('shows containers with children and preserved attributes', () => {
    const document = new SvgReader(factory).read(readFileSync('test/fixtures/transform.svg', 'utf8'), 't.svg').document;
    expect(inspector.render(document.requireShape('nodeB'))).toEqual([
      'g#nodeB  parent=g#diagram',
      '  preserved: transform="translate(200,0) scale(0.8)"',
      '  children: rect#rect1, text#text1',
    ]);
    expect(inspector.render(document.requireShape('text1'))).toEqual([
      'text#text1  parent=g#nodeB',
      '  x=60 y=38 text="End"',
      '  fill=white',
      '  preserved: text-anchor="middle" font-size="16"',
    ]);
  });

  it('shows empty containers', () => {
    const document = new SvgDocument();
    const group = factory.create('g', 'scene', []);
    group.setAttribute('stroke', 'blue');
    document.attach(group, document.root);
    expect(inspector.render(group)).toEqual(['g#scene  parent=svg', '  stroke=blue', '  children: (none)']);
  });
});
