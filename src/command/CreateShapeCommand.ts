import { EditorError } from '../model/EditorError.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** create：把（由工厂构造好的）新图形挂到画布根或指定容器（`in <containerId>`）的末尾。 */
export class CreateShapeCommand extends EditCommand {
  constructor(
    private readonly shape: Shape,
    private readonly containerId: string | null,
  ) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    if (document.hasId(this.shape.id)) {
      throw new EditorError(`id already exists: ${this.shape.id}`);
    }
    const container = this.containerId === null ? document.root : document.requireContainer(this.containerId);
    document.attach(this.shape, container);
    const where = container.isRoot() ? '' : ` in ${container.containerLabel}`;
    return [`${this.shape.label} created${where}`];
  }

  undo(): string[] {
    this.document.detach(this.shape);
    return [`${this.shape.label} removed`];
  }
}
