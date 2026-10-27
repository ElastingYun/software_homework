import type { ChildPosition } from '../model/ChildPosition.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** front / back 的共同骨架：在同级兄弟中调整 z-order。 */
export abstract class ReorderCommand extends EditCommand {
  private moved: Shape | null = null;
  private previous: ChildPosition | null = null;

  constructor(private readonly id: string) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    const shape = document.requireShape(this.id);
    const parent = document.positionOf(shape).container;
    const siblingsAfterRemoval = parent.childShapes().length - 1;
    this.previous = document.relocate(shape, parent, this.destination(siblingsAfterRemoval));
    this.moved = shape;
    return [`${shape.label} ${this.outcome()}`];
  }

  undo(): string[] {
    const shape = this.moved as Shape;
    const previous = this.previous as ChildPosition;
    this.document.relocate(shape, previous.container, previous.index);
    return [`${shape.label} z-order restored`];
  }

  /** 摘出后插入的下标。 */
  protected abstract destination(siblingsAfterRemoval: number): number;

  protected abstract outcome(): string;
}
