import { HorizontalAxis } from './HorizontalAxis.js';
import { LeafShape } from './LeafShape.js';
import { SizeAxis } from './SizeAxis.js';
import { VerticalAxis } from './VerticalAxis.js';
import type { ElementSource } from './ElementSource.js';
import type { ShapeParams } from './ShapeParams.js';

export class EllipseShape extends LeafShape {
  static readonly typeName = 'ellipse';
  static readonly createSyntax = 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]';

  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.geometry
      .define('cx', HorizontalAxis.INSTANCE, cx)
      .define('cy', VerticalAxis.INSTANCE, cy)
      .define('rx', SizeAxis.INSTANCE, rx)
      .define('ry', SizeAxis.INSTANCE, ry);
  }

  static fromParams(id: string, params: ShapeParams): EllipseShape {
    const shape = new EllipseShape(id, params.number(), params.number(), params.number(), params.number());
    params.finishWithOptionalStyle(shape, 'fill');
    return shape;
  }

  static fromElement(source: ElementSource): EllipseShape {
    return new EllipseShape(source.id, source.number('cx'), source.number('cy'), source.number('rx'), source.number('ry'));
  }

  get tagName(): string {
    return EllipseShape.typeName;
  }

  summary(): string {
    return this.withFill(`cx=${this.show('cx')} cy=${this.show('cy')} rx=${this.show('rx')} ry=${this.show('ry')}`);
  }

  protected anchor(): [number, number] {
    return [this.geometry.get('cx'), this.geometry.get('cy')];
  }
}
