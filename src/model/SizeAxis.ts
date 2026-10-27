import { EditorError } from './EditorError.js';
import type { GeometryAxis } from './GeometryAxis.js';

/** 尺寸（width、height、r、rx、ry）：平移时不变，不得为负。 */
export class SizeAxis implements GeometryAxis {
  static readonly INSTANCE = new SizeAxis();

  private constructor() {}

  translate(value: number): number {
    return value;
  }

  validate(name: string, value: number): void {
    if (value < 0) {
      throw new EditorError(`${name} must be non-negative`);
    }
  }
}
