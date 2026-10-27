import type { Geometry } from './Geometry.js';
import type { ShapeMemento } from './ShapeMemento.js';

/** 叶子图形的备忘录：几何字段的完整快照，恢复时不做任何反向运算。 */
export class GeometryMemento implements ShapeMemento {
  constructor(
    private readonly geometry: Geometry,
    private readonly snapshot: ReadonlyMap<string, number>,
  ) {}

  restore(): void {
    this.geometry.restore(this.snapshot);
  }
}
