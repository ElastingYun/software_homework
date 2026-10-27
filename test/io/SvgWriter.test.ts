import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { SvgDocument } from '../../src/model/SvgDocument.js';
import { TestShapes } from '../support/TestShapes.js';

const factory = TestShapes.factory();

describe('SvgWriter', () => {
  it('reproduces the spec example (section 0.1) byte for byte', () => {
    const document = new SvgDocument(400, 200);
    const flow = factory.create('g', 'flow', []);
    document.attach(flow, document.root);
    const container = document.requireContainer('flow');
    document.attach(factory.create('rect', 'start', ['30', '70', '120', '60', '#4a90d9']), container);
    document.attach(factory.create('line', 'edge', ['150', '100', '250', '100', 'black']), container);
    document.attach(factory.create('rect', 'end', ['250', '70', '120', '60', '#f5a623']), container);
    expect(new SvgWriter().write(document)).toBe(readFileSync('test/fixtures/flow.svg', 'utf8'));
  });

  it('writes empty groups self-closing and text as child content', () => {
    const document = new SvgDocument();
    document.attach(factory.create('g', 'scene', []), document.root);
    document.attach(factory.create('text', 't1', ['20', '40', 'My Diagram']), document.root);
    expect(new SvgWriter().write(document)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">',
        '  <g id="scene"/>',
        '  <text id="t1" x="20" y="40">My Diagram</text>',
        '</svg>',
        '',
      ].join('\n'),
    );
  });

  it('escapes XML special characters in text and attributes', () => {
    const document = new SvgDocument();
    const text = factory.create('text', 't"1', ['0', '0', 'a < b & c > "d"']);
    text.setAttribute('fill', 'url(#g)&"x"');
    document.attach(text, document.root);
    expect(new SvgWriter().write(document)).toContain(
      '<text id="t&quot;1" x="0" y="0" fill="url(#g)&amp;&quot;x&quot;">a &lt; b &amp; c &gt; "d"</text>',
    );
  });

  it('formats numbers without floating noise', () => {
    const document = new SvgDocument(800.5, 600);
    const rect = factory.create('rect', 'r', ['0.1', '0', '1', '1']);
    rect.moveBy(0.2, 0);
    document.attach(rect, document.root);
    const xml = new SvgWriter().write(document);
    expect(xml).toContain('width="800.5" height="600" viewBox="0 0 800.5 600"');
    expect(xml).toContain('<rect id="r" x="0.3" y="0" width="1" height="1"/>');
  });
});
