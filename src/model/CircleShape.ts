import { HorizontalAxis } from './HorizontalAxis.js';
import { LeafShape } from './LeafShape.js';
import { SizeAxis } from './SizeAxis.js';
import { VerticalAxis } from './VerticalAxis.js';
import type { ElementSource } from './ElementSource.js';
import type { ShapeParams } from './ShapeParams.js';

export class CircleShape extends LeafShape {
  static readonly typeName = 'circle';
  static readonly createSyntax = 'create circle <id> <cx> <cy> <r> [fill]';

  constructor(id: string, cx: number, cy: number, r: number) {
    super(id);
    this.geometry
      .define('cx', HorizontalAxis.INSTANCE, cx)
      .define('cy', VerticalAxis.INSTANCE, cy)
      .define('r', SizeAxis.INSTANCE, r);
  }

  static fromParams(id: string, params: ShapeParams): CircleShape {
    const shape = new CircleShape(id, params.number(), params.number(), params.number());
    params.finishWithOptionalStyle(shape, 'fill');
    return shape;
  }

  static fromElement(source: ElementSource): CircleShape {
    return new CircleShape(source.id, source.number('cx'), source.number('cy'), source.number('r'));
  }

  get tagName(): string {
    return CircleShape.typeName;
  }

  summary(): string {
    return this.withFill(`cx=${this.show('cx')} cy=${this.show('cy')} r=${this.show('r')}`);
  }

  protected anchor(): [number, number] {
    return [this.geometry.get('cx'), this.geometry.get('cy')];
  }
}
