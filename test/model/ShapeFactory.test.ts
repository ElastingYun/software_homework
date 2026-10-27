import { describe, expect, it } from 'vitest';
import type { ElementSource } from '../../src/model/ElementSource.js';
import { RectShape } from '../../src/model/RectShape.js';
import { ShapeFactory } from '../../src/model/ShapeFactory.js';
import { TestShapes } from '../support/TestShapes.js';

/** 内存版 ElementSource：记录被消费的属性。 */
class FakeElement implements ElementSource {
  private readonly attributes: Map<string, string>;

  constructor(
    readonly id: string,
    attributes: Record<string, string>,
    private readonly content = '',
  ) {
    this.attributes = new Map(Object.entries(attributes));
  }

  number(name: string): number {
    const value = this.take(name);
    return value === undefined ? 0 : Number(value);
  }

  take(name: string): string | undefined {
    const value = this.attributes.get(name);
    this.attributes.delete(name);
    return value;
  }

  text(): string {
    return this.content;
  }

  remaining(): Array<[string, string]> {
    return [...this.attributes.entries()];
  }
}

describe('ShapeFactory', () => {
  const factory = TestShapes.factory();

  it('knows the six built-in types and their syntax', () => {
    expect(['rect', 'circle', 'ellipse', 'line', 'text', 'g'].every((type) => factory.supports(type))).toBe(true);
    expect(factory.supports('box')).toBe(false);
    expect(factory.syntaxes()).toContain('create circle <id> <cx> <cy> <r> [fill]');
  });

  it('refuses duplicate registration', () => {
    expect(() => new ShapeFactory().register(RectShape).register(RectShape)).toThrow('already registered');
  });

  it('builds shapes from elements: geometry, style, passthrough', () => {
    const shape = factory.fromElement(
      'rect',
      new FakeElement('r1', { x: '1', y: '2', width: '3', height: '4', fill: 'red', rx: '2', 'data-kind': 'box' }),
    );
    expect(shape.svgAttributes()).toEqual([
      ['id', 'r1'],
      ['x', '1'],
      ['y', '2'],
      ['width', '3'],
      ['height', '4'],
      ['fill', 'red'],
      ['rx', '2'],
      ['data-kind', 'box'],
    ]);
  });

  it('missing geometry defaults to 0; text content comes from the element', () => {
    const text = factory.fromElement('text', new FakeElement('t1', { 'font-size': '16' }, 'imported'));
    expect(text.summary()).toBe('(0,0) "imported"');
    expect(text.preservedAttributes()).toEqual([['font-size', '16']]);
  });

  it('g keeps transform as a passthrough attribute', () => {
    const group = factory.fromElement('g', new FakeElement('g1', { transform: 'translate(60,40)' }));
    expect(group.svgAttributes()).toEqual([
      ['id', 'g1'],
      ['transform', 'translate(60,40)'],
    ]);
  });
});
