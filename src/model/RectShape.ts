import { HorizontalAxis } from './HorizontalAxis.js';
import { LeafShape } from './LeafShape.js';
import { SizeAxis } from './SizeAxis.js';
import { VerticalAxis } from './VerticalAxis.js';
import type { ElementSource } from './ElementSource.js';
import type { ShapeParams } from './ShapeParams.js';

export class RectShape extends LeafShape {
  static readonly typeName = 'rect';
  static readonly createSyntax = 'create rect <id> <x> <y> <w> <h> [fill]';

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.geometry
      .define('x', HorizontalAxis.INSTANCE, x)
      .define('y', VerticalAxis.INSTANCE, y)
      .define('width', SizeAxis.INSTANCE, width)
      .define('height', SizeAxis.INSTANCE, height);
  }

  static fromParams(id: string, params: ShapeParams): RectShape {
    const shape = new RectShape(id, params.number(), params.number(), params.number(), params.number());
    params.finishWithOptionalStyle(shape, 'fill');
    return shape;
  }

  static fromElement(source: ElementSource): RectShape {
    return new RectShape(source.id, source.number('x'), source.number('y'), source.number('width'), source.number('height'));
  }

  get tagName(): string {
    return RectShape.typeName;
  }

  summary(): string {
    return this.withFill(`x=${this.show('x')} y=${this.show('y')} w=${this.show('width')} h=${this.show('height')}`);
  }

  protected anchor(): [number, number] {
    return [this.geometry.get('x'), this.geometry.get('y')];
  }
}
