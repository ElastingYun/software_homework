import type { ChildPosition } from '../model/ChildPosition.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** delete：删除图形（容器连同全部子孙），撤销时放回原位置。 */
export class DeleteShapeCommand extends EditCommand {
  private removed: Shape | null = null;
  private position: ChildPosition | null = null;

  constructor(private readonly id: string) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    const shape = document.requireShape(this.id);
    this.position = document.detach(shape);
    this.removed = shape;
    return [`${shape.label} deleted`];
  }

  undo(): string[] {
    const shape = this.removed as Shape;
    const position = this.position as ChildPosition;
    this.document.attach(shape, position.container, position.index);
    const where = position.container.isRoot() ? '' : ` into ${position.container.containerLabel}`;
    return [`${shape.label} restored${where}`];
  }
}
