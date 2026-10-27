import type { GeometryAxis } from './GeometryAxis.js';

/** x 方向坐标（x、cx、x1、x2）：平移时加 dx。 */
export class HorizontalAxis implements GeometryAxis {
  static readonly INSTANCE = new HorizontalAxis();

  private constructor() {}

  translate(value: number, dx: number): number {
    return value + dx;
  }

  validate(): void {}
}
