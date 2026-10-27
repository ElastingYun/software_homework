import { ChildList } from './ChildList.js';
import type { Container } from './Container.js';
import type { Shape } from './Shape.js';

/** 画布根 `<svg>`：没有 id、不能被移动或删除，是所有顶层图形的容器。 */
export class CanvasRoot implements Container {
  readonly containerLabel = 'svg';
  private readonly children = new ChildList(this);
  private readonly preserved = new Map<string, string>();

  get parent(): Container | null {
    return null;
  }

  isRoot(): boolean {
    return true;
  }

  childShapes(): readonly Shape[] {
    return this.children.toArray();
  }

  indexOfChild(shape: Shape): number {
    return this.children.indexOf(shape);
  }

  insertChild(shape: Shape, index: number): void {
    this.children.insert(shape, index);
  }

  removeChild(shape: Shape): number {
    return this.children.remove(shape);
  }

  /** 读入时根元素上无法编辑的属性（如 version、xmlns:xlink），保存时原样写回。 */
  preserveAttribute(name: string, value: string): void {
    this.preserved.set(name, value);
  }

  preservedAttributes(): Array<[string, string]> {
    return [...this.preserved.entries()];
  }
}
