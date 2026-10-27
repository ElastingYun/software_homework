import { LengthRule } from './LengthRule.js';
import { PaintRule } from './PaintRule.js';
import type { StyleRule } from './StyleRule.js';

/**
 * 所有图形共有、可经 `set` 编辑的表现属性：fill / stroke / stroke-width。
 * 未设置的属性不写入 SVG（外观遵循渲染默认值）。
 */
export class PresentationStyle {
  private static readonly RULES: ReadonlyMap<string, StyleRule> = new Map<string, StyleRule>([
    ['fill', PaintRule.INSTANCE],
    ['stroke', PaintRule.INSTANCE],
    ['stroke-width', LengthRule.INSTANCE],
  ]);

  static readonly ATTRIBUTES: readonly string[] = [...PresentationStyle.RULES.keys()];

  private readonly values = new Map<string, string>();

  static accepts(name: string): boolean {
    return PresentationStyle.RULES.has(name);
  }

  /** 用户编辑的取值校验；不合法时抛出 EditorError。 */
  static validate(name: string, value: string): void {
    PresentationStyle.RULES.get(name)?.validate(name, value);
  }

  get(name: string): string | undefined {
    return this.values.get(name);
  }

  set(name: string, value: string): void {
    if (!PresentationStyle.accepts(name)) {
      throw new Error(`not a presentation attribute: ${name}`);
    }
    this.values.set(name, value);
  }

  remove(name: string): void {
    this.values.delete(name);
  }

  /** 按固定顺序（fill、stroke、stroke-width）列出已设置的属性。 */
  entries(): Array<[string, string]> {
    const result: Array<[string, string]> = [];
    for (const name of PresentationStyle.ATTRIBUTES) {
      const value = this.values.get(name);
      if (value !== undefined) {
        result.push([name, value]);
      }
    }
    return result;
  }
}
