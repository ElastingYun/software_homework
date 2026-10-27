import { HorizontalAxis } from './HorizontalAxis.js';
import { LeafShape } from './LeafShape.js';
import { VerticalAxis } from './VerticalAxis.js';
import type { ElementSource } from './ElementSource.js';
import type { ShapeParams } from './ShapeParams.js';

export class LineShape extends LeafShape {
  static readonly typeName = 'line';
  static readonly createSyntax = 'create line <id> <x1> <y1> <x2> <y2> [stroke]';

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.geometry
      .define('x1', HorizontalAxis.INSTANCE, x1)
      .define('y1', VerticalAxis.INSTANCE, y1)
      .define('x2', HorizontalAxis.INSTANCE, x2)
      .define('y2', VerticalAxis.INSTANCE, y2);
  }

  static fromParams(id: string, params: ShapeParams): LineShape {
    const shape = new LineShape(id, params.number(), params.number(), params.number(), params.number());
    params.finishWithOptionalStyle(shape, 'stroke');
    return shape;
  }

  static fromElement(source: ElementSource): LineShape {
    return new LineShape(source.id, source.number('x1'), source.number('y1'), source.number('x2'), source.number('y2'));
  }

  get tagName(): string {
    return LineShape.typeName;
  }

  summary(): string {
    return `(${this.show('x1')},${this.show('y1')}) -> (${this.show('x2')},${this.show('y2')})`;
  }

  protected anchor(): [number, number] {
    return [this.geometry.get('x1'), this.geometry.get('y1')];
  }
}
