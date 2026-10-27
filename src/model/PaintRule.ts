import { EditorError } from './EditorError.js';
import type { StyleRule } from './StyleRule.js';

/** fill / stroke：颜色、`none`、`url(#id)` 等写法繁多，只要求非空。 */
export class PaintRule implements StyleRule {
  static readonly INSTANCE = new PaintRule();

  private constructor() {}

  validate(name: string, value: string): void {
    if (value.trim() === '') {
      throw new EditorError(`${name} must not be empty`);
    }
  }
}
