import { describe, expect, it } from 'vitest';
import { Geometry } from '../../src/model/Geometry.js';
import { HorizontalAxis } from '../../src/model/HorizontalAxis.js';
import { SizeAxis } from '../../src/model/SizeAxis.js';
import { VerticalAxis } from '../../src/model/VerticalAxis.js';

function rectGeometry(): Geometry {
  return new Geometry()
    .define('x', HorizontalAxis.INSTANCE, 10)
    .define('y', VerticalAxis.INSTANCE, 20)
    .define('width', SizeAxis.INSTANCE, 100);
}

describe('Geometry', () => {
  it('translates coordinates per axis and leaves sizes unchanged', () => {
    const geometry = rectGeometry();
    geometry.translate(5, -7);
    expect(geometry.entries()).toEqual([
      ['x', 15],
      ['y', 13],
      ['width', 100],
    ]);
  });

  it('scales every field', () => {
    const geometry = rectGeometry();
    geometry.scale(0.5);
    expect(geometry.entries()).toEqual([
      ['x', 5],
      ['y', 10],
      ['width', 50],
    ]);
  });

  it('rejects negative sizes on define and set without changing state', () => {
    expect(() => new Geometry().define('r', SizeAxis.INSTANCE, -1)).toThrow('r must be non-negative');
    const geometry = rectGeometry();
    expect(() => geometry.set('width', -5)).toThrow('width must be non-negative');
    expect(geometry.get('width')).toBe(100);
  });

  it('memento restores the exact values (no floating error)', () => {
    const geometry = new Geometry().define('x', HorizontalAxis.INSTANCE, 0.1);
    const memento = geometry.createMemento();
    geometry.translate(0.2, 0);
    geometry.scale(3);
    memento.restore();
    expect(geometry.get('x')).toBe(0.1);
  });

  it('keeps declaration order for names', () => {
    expect(rectGeometry().names()).toEqual(['x', 'y', 'width']);
  });
});
