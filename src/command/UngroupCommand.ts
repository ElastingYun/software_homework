import { EditorError } from '../model/EditorError.js';
import type { ChildPosition } from '../model/ChildPosition.js';
import type { GroupShape } from '../model/GroupShape.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { Quantity } from './Quantity.js';

/** ungroup：解散容器，子图形提升到原容器的父级并占据原容器的位置。 */
export class UngroupCommand extends EditCommand {
  private group: GroupShape | null = null;
  private moves: Array<[Shape, ChildPosition]> = [];
  private position: ChildPosition | null = null;

  constructor(private readonly groupId: string) {
    super();
  }

  protected perform(document: SvgDocument): string[] {
    const group = this.validate(document);
    const parent = group.parent as NonNullable<GroupShape['parent']>;
    const lines = this.droppedAttributesWarning(group);
    const index = parent.indexOfChild(group);
    this.moves = group
      .childShapes()
      .map((child, offset) => [child, document.relocate(child, parent, index + 1 + offset)]);
    this.position = document.detach(group);
    this.group = group;
    lines.push(`${group.label} ungrouped, ${Quantity.children(this.moves.length)} moved to ${parent.containerLabel}`);
    return lines;
  }

  undo(): string[] {
    const group = this.group as GroupShape;
    const position = this.position as ChildPosition;
    this.document.attach(group, position.container, position.index);
    for (const [child, old] of [...this.moves].reverse()) {
      this.document.relocate(child, old.container, old.index);
    }
    return [`${group.label} regrouped with ${Quantity.children(this.moves.length)}`];
  }

  private validate(document: SvgDocument): GroupShape {
    const shape = document.requireShape(this.groupId);
    const group = shape.asContainer();
    if (group === null) {
      throw new EditorError(`not a container: ${this.groupId}`);
    }
    if (group.isComposite()) {
      throw new EditorError(`cannot ungroup composite shape: ${this.groupId}`);
    }
    if (group.parent === null || group.parent.isRoot()) {
      throw new EditorError(`cannot ungroup top-level container: ${this.groupId}`);
    }
    return group;
  }

  /** 容器自身的属性（表现属性、transform 等）不会转移给子图形，如实提示。 */
  private droppedAttributesWarning(group: GroupShape): string[] {
    const names = [...group.styleAttributes(), ...group.preservedAttributes()].map(([name]) => name);
    return names.length === 0 ? [] : [`warning: attributes of ${group.label} are not kept: ${names.join(', ')}`];
  }
}
