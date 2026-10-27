import type { GeometryAxis } from './GeometryAxis.js';

/** y 方向坐标（y、cy、y1、y2）：平移时加 dy。 */
export class VerticalAxis implements GeometryAxis {
  static readonly INSTANCE = new VerticalAxis();

  private constructor() {}

  translate(value: number, _dx: number, dy: number): number {
    return value + dy;
  }

  validate(): void {}
}
