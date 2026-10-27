import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

/** set：修改白名单内的一个属性；撤销时恢复原值（原来未设置则移除）。 */
export class SetAttributeCommand extends EditCommand {
  private target: Shape | null = null;
  private previous: string | undefined;

  constructor(
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string,
  ) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    const shape = document.requireShape(this.id);
    const previous = shape.getAttribute(this.attribute);
    shape.setAttribute(this.attribute, this.value);
    this.previous = previous;
    this.target = shape;
    return [this.report(shape)];
  }

  undo(): string[] {
    const shape = this.target as Shape;
    if (this.previous === undefined) {
      shape.removeAttribute(this.attribute);
    } else {
      shape.setAttribute(this.attribute, this.previous);
    }
    return [this.report(shape)];
  }

  private report(shape: Shape): string {
    return `${shape.label} updated: ${shape.describeAttribute(this.attribute)}`;
  }
}
