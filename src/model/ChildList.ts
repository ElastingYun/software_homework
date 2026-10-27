import type { Container } from './Container.js';
import type { Shape } from './Shape.js';

/** 有序子节点表：插入/移除时同步维护子节点的父指针。CanvasRoot 与 GroupShape 共用。 */
export class ChildList {
  private readonly items: Shape[] = [];

  constructor(private readonly owner: Container) {}

  toArray(): readonly Shape[] {
    return [...this.items];
  }

  indexOf(shape: Shape): number {
    return this.items.indexOf(shape);
  }

  insert(shape: Shape, index: number): void {
    if (shape.parent !== null) {
      throw new Error(`${shape.label} is still attached to ${shape.parent.containerLabel}`);
    }
    if (!Number.isInteger(index) || index < 0 || index > this.items.length) {
      throw new RangeError(`child index out of range: ${index}`);
    }
    this.items.splice(index, 0, shape);
    shape.setParent(this.owner);
  }

  remove(shape: Shape): number {
    const index = this.items.indexOf(shape);
    if (index < 0) {
      throw new Error(`${shape.label} is not a child of ${this.owner.containerLabel}`);
    }
    this.items.splice(index, 1);
    shape.setParent(null);
    return index;
  }
}
