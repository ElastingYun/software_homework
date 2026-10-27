import type { Shape } from '../model/Shape.js';
import type { ShapeMemento } from '../model/ShapeMemento.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** move：增量平移；容器整体平移。撤销用备忘录精确恢复。 */
export class MoveShapeCommand extends EditCommand {
  private target: Shape | null = null;
  private memento: ShapeMemento | null = null;

  constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    const shape = document.requireShape(this.id);
    this.memento = shape.createMemento();
    shape.moveBy(this.dx, this.dy);
    this.target = shape;
    return [`${shape.label} ${shape.describeMove('moved', this.dx, this.dy)}`];
  }

  undo(): string[] {
    const shape = this.target as Shape;
    (this.memento as ShapeMemento).restore();
    return [`${shape.label} ${shape.describeMove('moved back', -this.dx, -this.dy)}`];
  }
}
