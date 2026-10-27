import { EditorError } from '../model/EditorError.js';
import type { ChildPosition } from '../model/ChildPosition.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** addto：把已有图形移入容器，作为最后一个子节点。 */
export class AddToGroupCommand extends EditCommand {
  private moved: Shape | null = null;
  private previous: ChildPosition | null = null;

  constructor(
    private readonly groupId: string,
    private readonly id: string,
  ) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    const group = document.requireContainer(this.groupId);
    const shape = document.requireShape(this.id);
    if (shape === group || shape.isAncestorOf(group)) {
      throw new EditorError(`cannot move a container into its own descendant: ${this.id}`);
    }
    this.previous = document.relocate(shape, group);
    this.moved = shape;
    return [`${shape.label} added to ${group.label}`];
  }

  undo(): string[] {
    const shape = this.moved as Shape;
    const previous = this.previous as ChildPosition;
    this.document.relocate(shape, previous.container, previous.index);
    return [`${shape.label} moved back into ${previous.container.containerLabel}`];
  }
}
