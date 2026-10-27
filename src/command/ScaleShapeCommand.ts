import { EditorError } from '../model/EditorError.js';
import { NumericText } from '../model/NumericText.js';
import type { Shape } from '../model/Shape.js';
import type { ShapeMemento } from '../model/ShapeMemento.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** scale：等比缩放全部几何属性；容器递归到每个子孙。 */
export class ScaleShapeCommand extends EditCommand {
  private target: Shape | null = null;
  private memento: ShapeMemento | null = null;

  constructor(
    private readonly id: string,
    private readonly factor: number,
  ) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    if (!(this.factor > 0) || !Number.isFinite(this.factor)) {
      throw new EditorError('scale factor must be positive');
    }
    const shape = document.requireShape(this.id);
    this.memento = shape.createMemento();
    shape.scaleBy(this.factor);
    this.target = shape;
    return [`${shape.label} scaled by ${NumericText.format(this.factor)}`];
  }

  undo(): string[] {
    (this.memento as ShapeMemento).restore();
    return [`${(this.target as Shape).label} scale by ${NumericText.format(this.factor)} undone`];
  }
}
