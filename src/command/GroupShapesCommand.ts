import { EditorError } from '../model/EditorError.js';
import { GroupShape } from '../model/GroupShape.js';
import type { ChildPosition } from '../model/ChildPosition.js';
import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';
import { Quantity } from './Quantity.js';

/**
 * group：新建容器并收入若干已存在的图形（从各自原父容器摘出，按文档序排列）。
 * 新容器占据文档序第一个成员原来的位置。整条命令是一个撤销单元。
 */
export class GroupShapesCommand extends EditCommand {
  private readonly group: GroupShape;
  private moves: Array<[Shape, ChildPosition]> = [];

  constructor(
    groupId: string,
    private readonly memberIds: readonly string[],
  ) {
    super();
    this.group = new GroupShape(groupId);
  }

  protected perform(document: SvgDocument): string[] {
    const members = this.validate(document);
    const anchor = document.positionOf(members[0] as Shape);
    document.attach(this.group, anchor.container, anchor.index);
    this.moves = members.map((member) => [member, document.relocate(member, this.group)]);
    return [`${this.group.label} created with ${Quantity.children(members.length)}`];
  }

  undo(): string[] {
    for (const [member, position] of [...this.moves].reverse()) {
      this.document.relocate(member, position.container, position.index);
    }
    this.document.detach(this.group);
    return [`${this.group.label} dissolved, ${Quantity.children(this.moves.length)} restored`];
  }

  /** 全部校验通过后返回按文档序排列的成员。 */
  private validate(document: SvgDocument): Shape[] {
    if (document.hasId(this.group.id)) {
      throw new EditorError(`id already exists: ${this.group.id}`);
    }
    if (this.memberIds.length === 0) {
      throw new EditorError('group requires at least one shape');
    }
    const seen = new Set<string>();
    for (const id of this.memberIds) {
      if (seen.has(id)) {
        throw new EditorError(`duplicate id in group list: ${id}`);
      }
      seen.add(id);
    }
    const members = this.memberIds.map((id) => document.requireShape(id));
    for (const ancestor of members) {
      if (members.some((member) => ancestor.isAncestorOf(member))) {
        throw new EditorError(`cannot group a container into its own descendant: ${ancestor.id}`);
      }
    }
    return members.sort((a, b) => document.documentOrder(a) - document.documentOrder(b));
  }
}
