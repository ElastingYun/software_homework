import { EditorError } from './EditorError.js';
import { NumericText } from './NumericText.js';
import type { Shape } from './Shape.js';

/**
 * `create <type> <id> …` 中 id 之后的位置参数（已去掉 `in` 子句）。
 * 每种图形按自己的参数表依次读取；数量不符时报 `usage: <语法>`。
 */
export class ShapeParams {
  private position = 0;

  constructor(
    private readonly tokens: readonly string[],
    private readonly syntax: string,
  ) {}

  number(): number {
    return NumericText.require(this.next());
  }

  text(): string {
    return this.next();
  }

  optional(): string | undefined {
    return this.position < this.tokens.length ? this.tokens[this.position++] : undefined;
  }

  /** 所有参数必须恰好读完。 */
  end(): void {
    if (this.position < this.tokens.length) {
      throw this.usage();
    }
  }

  /** 读取末尾可选的表现属性（如 rect 的 fill、line 的 stroke），并结束参数读取。 */
  finishWithOptionalStyle(shape: Shape, attribute: string): void {
    const value = this.optional();
    this.end();
    if (value !== undefined) {
      shape.setAttribute(attribute, value);
    }
  }

  private next(): string {
    if (this.position >= this.tokens.length) {
      throw this.usage();
    }
    return this.tokens[this.position++] as string;
  }

  private usage(): EditorError {
    return new EditorError(`usage: ${this.syntax}`);
  }
}
