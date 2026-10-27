import { describe, expect, it } from 'vitest';
import { GroupShape } from '../../src/model/GroupShape.js';
import { RectShape } from '../../src/model/RectShape.js';
import { TestShapes } from '../support/TestShapes.js';

const factory = TestShapes.factory();

describe('leaf shapes created from CLI params', () => {
  it.each([
    ['rect', ['10', '20', '100', '50', '#eee'], 'x=10 y=20 w=100 h=50 fill=#eee'],
    ['rect', ['0', '0', '800', '600'], 'x=0 y=0 w=800 h=600'],
    ['circle', ['100', '100', '20', 'red'], 'cx=100 cy=100 r=20 fill=red'],
    ['ellipse', ['1', '2', '3', '4'], 'cx=1 cy=2 rx=3 ry=4'],
    ['line', ['280', '130', '520', '130', 'black'], '(280,130) -> (520,130)'],
    ['text', ['20', '40', 'My Diagram'], '(20,40) "My Diagram"'],
    ['g', [], ''],
  ])('%s %j → summary %j', (type, params, summary) => {
    expect(factory.create(type, 's1', params).summary()).toBe(summary);
  });

  it('serialises attributes in canonical order: id, geometry, style', () => {
    expect(factory.create('rect', 'r1', ['10', '20', '100', '50', '#eee']).svgAttributes()).toEqual([
      ['id', 'r1'],
      ['x', '10'],
      ['y', '20'],
      ['width', '100'],
      ['height', '50'],
      ['fill', '#eee'],
    ]);
    expect(factory.create('line', 'e', ['150', '100', '250', '100', 'black']).svgAttributes()).toEqual([
      ['id', 'e'],
      ['x1', '150'],
      ['y1', '100'],
      ['x2', '250'],
      ['y2', '100'],
      ['stroke', 'black'],
    ]);
  });

  it('text content is child text, not an attribute', () => {
    const text = factory.create('text', 't1', ['20', '40', 'Hi there']);
    expect(text.textContent()).toBe('Hi there');
    expect(text.svgAttributes()).toEqual([
      ['id', 't1'],
      ['x', '20'],
      ['y', '40'],
    ]);
  });

  it.each([
    ['rect', ['1', '2', '3'], 'usage: create rect <id> <x> <y> <w> <h> [fill]'],
    ['rect', ['1', '2', '3', '4', 'red', 'extra'], 'usage: create rect <id> <x> <y> <w> <h> [fill]'],
    ['circle', ['1', 'x', '3'], 'invalid number: x'],
    ['circle', ['1', '2', '-3'], 'r must be non-negative'],
    ['text', ['1', '2'], 'usage: create text <id> <x> <y> "content"'],
    ['g', ['extra'], 'usage: create g <id>'],
  ])('%s %j fails with %j', (type, params, message) => {
    expect(() => factory.create(type, 's1', params)).toThrow(message);
  });

  it('unknown type mentions plugins', () => {
    expect(() => factory.create('hexagon', 'h1', [])).toThrow('unknown shape type: hexagon (is the plugin loaded?)');
    expect(() => factory.create('box', 'n1', [])).toThrow('unknown shape type: box (is the plugin loaded?)');
  });
});

describe('attribute whitelist (set)', () => {
  it('lists geometry + style (+ text for text)', () => {
    expect(factory.create('rect', 'r', ['0', '0', '1', '1']).settableAttributes()).toEqual([
      'x', 'y', 'width', 'height', 'fill', 'stroke', 'stroke-width',
    ]);
    expect(factory.create('text', 't', ['0', '0', 'a']).settableAttributes()).toEqual([
      'x', 'y', 'text', 'fill', 'stroke', 'stroke-width',
    ]);
    expect(factory.create('g', 'g', []).settableAttributes()).toEqual(['fill', 'stroke', 'stroke-width']);
  });

  it('sets geometry with validation and describes values', () => {
    const rect = factory.create('rect', 'r', ['0', '0', '1', '1']);
    rect.setAttribute('width', '12.5');
    expect(rect.describeAttribute('width')).toBe('width=12.5');
    expect(() => rect.setAttribute('width', 'wide')).toThrow('invalid number: wide');
    expect(() => rect.setAttribute('height', '-1')).toThrow('height must be non-negative');
    expect(rect.getAttribute('height')).toBe('1');
  });

  it('rejects attributes outside the whitelist of the type', () => {
    const circle = factory.create('circle', 'c', ['0', '0', '1']);
    expect(() => circle.setAttribute('width', '3')).toThrow('unknown attribute: width');
    expect(() => circle.setAttribute('text', 'x')).toThrow('unknown attribute: text');
    expect(() => circle.setAttribute('opacity', '0.5')).toThrow('unknown attribute: opacity');
    expect(() => circle.getAttribute('opacity')).toThrow('unknown attribute: opacity');
  });

  it('style attributes can be set, described and removed', () => {
    const circle = factory.create('circle', 'c', ['0', '0', '1']);
    expect(circle.getAttribute('fill')).toBeUndefined();
    expect(circle.describeAttribute('fill')).toBe('fill unset');
    circle.setAttribute('fill', 'red');
    expect(circle.describeAttribute('fill')).toBe('fill=red');
    circle.removeAttribute('fill');
    expect(circle.getAttribute('fill')).toBeUndefined();
    expect(() => circle.removeAttribute('r')).toThrow('cannot remove attribute: r');
  });

  it('text content is settable and quoted in descriptions', () => {
    const text = factory.create('text', 't', ['0', '0', 'old']);
    text.setAttribute('text', 'My Diagram v2');
    expect(text.describeAttribute('text')).toBe('text="My Diagram v2"');
    expect(text.getAttribute('text')).toBe('My Diagram v2');
  });

  it('getAttribute keeps full precision for exact undo', () => {
    const rect = factory.create('rect', 'r', ['0', '0', '1', '1']);
    rect.moveBy(0.1, 0);
    rect.moveBy(0.2, 0);
    const raw = rect.getAttribute('x') as string;
    rect.setAttribute('x', '5');
    rect.setAttribute('x', raw);
    expect(rect.getAttribute('x')).toBe(String(0.1 + 0.2));
    expect(rect.describeAttribute('x')).toBe('x=0.3');
  });
});

describe('composite operations', () => {
  function sample(): { group: GroupShape; rect: RectShape; inner: GroupShape } {
    const group = new GroupShape('g1');
    const rect = new RectShape('r1', 10, 20, 30, 40);
    const inner = new GroupShape('g2');
    group.insertChild(rect, 0);
    group.insertChild(inner, 1);
    inner.insertChild(new RectShape('r2', 1, 2, 3, 4), 0);
    return { group, rect, inner };
  }

  it('move on a leaf reports the new anchor; on a group the delta', () => {
    const { group, rect } = sample();
    rect.moveBy(30, 0);
    expect(rect.describeMove('moved')).toBe('moved to (40,20)');
    expect(group.describeMove('moved', 0, 100)).toBe('moved by (0,100)');
  });

  it('move and scale recurse into every descendant', () => {
    const { group } = sample();
    group.moveBy(1, 1);
    group.scaleBy(2);
    expect(group.selfAndDescendants().map((shape) => shape.summary())).toEqual([
      '',
      'x=22 y=42 w=60 h=80',
      '',
      'x=4 y=6 w=6 h=8',
    ]);
  });

  it('group memento restores the whole subtree', () => {
    const { group } = sample();
    const before = group.selfAndDescendants().map((shape) => shape.summary());
    const memento = group.createMemento();
    group.moveBy(0.1, 0.7);
    group.scaleBy(3);
    memento.restore();
    expect(group.selfAndDescendants().map((shape) => shape.summary())).toEqual(before);
  });

  it('ancestry and container queries', () => {
    const { group, rect, inner } = sample();
    const r2 = inner.childShapes()[0]!;
    expect(group.isAncestorOf(r2)).toBe(true);
    expect(inner.isAncestorOf(rect)).toBe(false);
    expect(rect.isAncestorOf(group)).toBe(false);
    expect(rect.asContainer()).toBeNull();
    expect(group.asContainer()).toBe(group);
    expect(group.isComposite()).toBe(false);
    expect(r2.parent).toBe(inner);
    expect(inner.containerLabel).toBe('g#g2');
  });

  it('group summary shows its style attributes', () => {
    const group = new GroupShape('g');
    group.setAttribute('fill', 'red');
    group.setAttribute('stroke-width', '2');
    expect(group.summary()).toBe('fill=red stroke-width=2');
  });
});
