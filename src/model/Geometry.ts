import { EditorError } from './EditorError.js';
import { GeometryMemento } from './GeometryMemento.js';
import type { GeometryAxis } from './GeometryAxis.js';

/**
 * 叶子图形的几何量：有序的"名字 → 数值"表，每个字段带一个轴策略。
 * 平移、缩放、校验都委托给字段的轴，从而不需要按属性名分支。
 */
export class Geometry {
  private readonly axes = new Map<string, GeometryAxis>();
  private readonly values = new Map<string, number>();

  /** 声明一个几何字段（构造期调用），声明顺序即序列化顺序。 */
  define(name: string, axis: GeometryAxis, value: number): this {
    axis.validate(name, value);
    this.axes.set(name, axis);
    this.values.set(name, value);
    return this;
  }

  has(name: string): boolean {
    return this.axes.has(name);
  }

  names(): string[] {
    return [...this.axes.keys()];
  }

  get(name: string): number {
    const value = this.values.get(name);
    if (value === undefined) {
      throw new Error(`geometry field not defined: ${name}`);
    }
    return value;
  }

  /** 校验后写入；校验失败抛出 EditorError 且不修改任何字段。 */
  set(name: string, value: number): void {
    this.axisOf(name).validate(name, value);
    this.values.set(name, value);
  }

  entries(): Array<[string, number]> {
    return [...this.values.entries()];
  }

  translate(dx: number, dy: number): void {
    this.assignAll((value, axis) => axis.translate(value, dx, dy));
  }

  scale(factor: number): void {
    this.assignAll((value) => value * factor);
  }

  createMemento(): GeometryMemento {
    return new GeometryMemento(this, new Map(this.values));
  }

  /** 仅供 GeometryMemento 调用。 */
  restore(snapshot: ReadonlyMap<string, number>): void {
    for (const [name, value] of snapshot) {
      this.values.set(name, value);
    }
  }

  /** 先算出全部新值并检查有限性，再一次性写入：结果溢出时抛出 `<name> out of range` 且不修改任何字段。 */
  private assignAll(next: (value: number, axis: GeometryAxis) => number): void {
    const updated = new Map<string, number>();
    for (const [name, axis] of this.axes) {
      const value = next(this.get(name), axis);
      if (!Number.isFinite(value)) {
        throw new EditorError(`${name} out of range`);
      }
      updated.set(name, value);
    }
    for (const [name, value] of updated) {
      this.values.set(name, value);
    }
  }

  private axisOf(name: string): GeometryAxis {
    const axis = this.axes.get(name);
    if (axis === undefined) {
      throw new Error(`geometry field not defined: ${name}`);
    }
    return axis;
  }
}
