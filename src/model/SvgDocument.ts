import { CanvasRoot } from './CanvasRoot.js';
import { ChildPosition } from './ChildPosition.js';
import { EditorError } from './EditorError.js';
import { NumericText } from './NumericText.js';
import type { Container } from './Container.js';
import type { GroupShape } from './GroupShape.js';
import type { Shape } from './Shape.js';

/**
 * 当前编辑的 SVG 文档：画布尺寸 + 图形树 + id 索引。
 * 所有结构修改都经由 attach / detach / relocate，保证"id 唯一且索引与树一致"。
 */
export class SvgDocument {
  static readonly DEFAULT_WIDTH = 800;
  static readonly DEFAULT_HEIGHT = 600;

  readonly root = new CanvasRoot();
  private readonly index = new Map<string, Shape>();
  private canvasWidth = SvgDocument.DEFAULT_WIDTH;
  private canvasHeight = SvgDocument.DEFAULT_HEIGHT;

  constructor(width: number = SvgDocument.DEFAULT_WIDTH, height: number = SvgDocument.DEFAULT_HEIGHT) {
    this.resize(width, height);
  }

  get width(): number {
    return this.canvasWidth;
  }

  get height(): number {
    return this.canvasHeight;
  }

  /** 如 "800x600"。 */
  get sizeLabel(): string {
    return `${NumericText.format(this.canvasWidth)}x${NumericText.format(this.canvasHeight)}`;
  }

  resize(width: number, height: number): void {
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
      throw new EditorError('canvas size must be positive');
    }
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  // ---------- 查询 ----------

  hasId(id: string): boolean {
    return this.index.has(id);
  }

  findShape(id: string): Shape | undefined {
    return this.index.get(id);
  }

  requireShape(id: string): Shape {
    const shape = this.index.get(id);
    if (shape === undefined) {
      throw new EditorError(`no such shape: ${id}`);
    }
    return shape;
  }

  requireContainer(id: string): GroupShape {
    const shape = this.index.get(id);
    if (shape === undefined) {
      throw new EditorError(`no such container: ${id}`);
    }
    const container = shape.asContainer();
    if (container === null) {
      throw new EditorError(`not a container: ${id}`);
    }
    return container;
  }

  /** 图形（不含画布根）总数。 */
  shapeCount(): number {
    return this.index.size;
  }

  /** 全部图形，文档序（先序）。 */
  allShapes(): Shape[] {
    return this.root.childShapes().flatMap((shape) => shape.selfAndDescendants());
  }

  /** 在文档序中的位置，用于把一组图形按文档序排列。 */
  documentOrder(shape: Shape): number {
    return this.allShapes().indexOf(shape);
  }

  positionOf(shape: Shape): ChildPosition {
    const parent = SvgDocument.parentOf(shape);
    return new ChildPosition(parent, parent.indexOfChild(shape));
  }

  // ---------- 结构修改 ----------

  /**
   * 把一棵游离的子树挂到容器的 index 处（缺省为末尾），并登记子树中的全部 id。
   * 任一 id 冲突时抛出 `id already exists` 且不做任何修改。
   */
  attach(shape: Shape, container: Container, index: number = container.childShapes().length): void {
    const subtree = shape.selfAndDescendants();
    const seen = new Set<string>();
    for (const member of subtree) {
      if (this.index.has(member.id) || seen.has(member.id)) {
        throw new EditorError(`id already exists: ${member.id}`);
      }
      seen.add(member.id);
    }
    container.insertChild(shape, index);
    for (const member of subtree) {
      this.index.set(member.id, member);
    }
  }

  /** 把子树从文档中摘除并注销其全部 id；返回原位置。 */
  detach(shape: Shape): ChildPosition {
    const parent = SvgDocument.parentOf(shape);
    const position = new ChildPosition(parent, parent.removeChild(shape));
    for (const member of shape.selfAndDescendants()) {
      this.index.delete(member.id);
    }
    return position;
  }

  /**
   * 文档内移动（id 不变）：先从原容器摘出，再插入目标容器的 index 处（缺省为末尾；
   * index 按摘出之后的子节点表计算）。返回原位置。
   */
  relocate(shape: Shape, container: Container, index?: number): ChildPosition {
    if (container === shape.asContainer() || this.isInsideSubtree(container, shape)) {
      throw new Error(`cannot move ${shape.label} into its own subtree`);
    }
    const parent = SvgDocument.parentOf(shape);
    const position = new ChildPosition(parent, parent.removeChild(shape));
    container.insertChild(shape, index ?? container.childShapes().length);
    return position;
  }

  private isInsideSubtree(container: Container, shape: Shape): boolean {
    for (let current: Container | null = container; current !== null; current = current.parent) {
      if (current === shape.asContainer()) {
        return true;
      }
    }
    return false;
  }

  private static parentOf(shape: Shape): Container {
    if (shape.parent === null) {
      throw new Error(`${shape.label} is not attached to a document`);
    }
    return shape.parent;
  }
}
