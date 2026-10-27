import { ChildList } from './ChildList.js';
import { CompositeMemento } from './CompositeMemento.js';
import { NumericText } from './NumericText.js';
import { Shape } from './Shape.js';
import type { Container } from './Container.js';
import type { ElementSource } from './ElementSource.js';
import type { ShapeMemento } from './ShapeMemento.js';
import type { ShapeParams } from './ShapeParams.js';

/**
 * 容器 `<g>`（Composite 中的组合）。move / scale / 撤销快照都递归到每个子孙；
 * 自身没有几何量，可设置表现属性（由子图形继承渲染）。
 */
export class GroupShape extends Shape implements Container {
  static readonly typeName = 'g';
  static readonly createSyntax = 'create g <id>';

  private readonly members = new ChildList(this);

  constructor(id: string) {
    super(id);
  }

  static fromParams(id: string, params: ShapeParams): GroupShape {
    params.end();
    return new GroupShape(id);
  }

  static fromElement(source: ElementSource): GroupShape {
    return new GroupShape(source.id);
  }

  get tagName(): string {
    return GroupShape.typeName;
  }

  get containerLabel(): string {
    return this.label;
  }

  isRoot(): boolean {
    return false;
  }

  childShapes(): readonly Shape[] {
    return this.members.toArray();
  }

  indexOfChild(shape: Shape): number {
    return this.members.indexOf(shape);
  }

  insertChild(shape: Shape, index: number): void {
    this.members.insert(shape, index);
  }

  removeChild(shape: Shape): number {
    return this.members.remove(shape);
  }

  override children(): readonly Shape[] {
    return this.childShapes();
  }

  override asContainer(): GroupShape {
    return this;
  }

  override isAncestorOf(other: Shape): boolean {
    return this.childShapes().some((child) => child === other || child.isAncestorOf(other));
  }

  moveBy(dx: number, dy: number): void {
    for (const child of this.childShapes()) {
      child.moveBy(dx, dy);
    }
  }

  scaleBy(factor: number): void {
    for (const child of this.childShapes()) {
      child.scaleBy(factor);
    }
  }

  createMemento(): ShapeMemento {
    return new CompositeMemento(this.childShapes().map((child) => child.createMemento()));
  }

  describeMove(verb: string, dx: number, dy: number): string {
    return `${verb} by (${NumericText.format(dx)},${NumericText.format(dy)})`;
  }

  summary(): string {
    return this.styleDescriptions().join(' ');
  }
}
