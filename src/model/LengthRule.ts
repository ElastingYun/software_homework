import { EditorError } from './EditorError.js';
import type { StyleRule } from './StyleRule.js';

/** stroke-width：非负数，可带 SVG 长度单位（如 2、0.5、2px、0.1em、50%）。 */
export class LengthRule implements StyleRule {
  static readonly INSTANCE = new LengthRule();
  private static readonly PATTERN = /^\+?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?(px|em|ex|%|pt|pc|cm|mm|in)?$/;

  private constructor() {}

  validate(name: string, value: string): void {
    if (!LengthRule.PATTERN.test(value)) {
      throw new EditorError(`invalid ${name}: ${value}`);
    }
  }
}
