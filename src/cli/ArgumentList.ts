import { EditorError } from '../model/EditorError.js';
import { NumericText } from '../model/NumericText.js';
import type { Token } from './Token.js';

/** 命令名之后的参数；数量或格式不符时给出 `usage: <语法>`。 */
export class ArgumentList {
  constructor(
    private readonly tokens: readonly Token[],
    private readonly syntax: string,
  ) {}

  get length(): number {
    return this.tokens.length;
  }

  /** 参数个数必须在 [min, max] 之间。 */
  expectCount(min: number, max: number = min): void {
    if (this.tokens.length < min || this.tokens.length > max) {
      throw this.usage();
    }
  }

  text(index: number): string {
    const token = this.tokens[index];
    if (token === undefined) {
      throw this.usage();
    }
    return token.text;
  }

  number(index: number): number {
    return NumericText.require(this.text(index));
  }

  optionalText(index: number): string | null {
    return this.tokens[index]?.text ?? null;
  }

  optionalNumber(index: number): number | null {
    return index < this.tokens.length ? this.number(index) : null;
  }

  /** 从 index 开始的全部参数文本。 */
  rest(index: number): string[] {
    return this.tokens.slice(index).map((token) => token.text);
  }

  /** 末尾的 `in <containerId>` 子句：返回 [去掉子句后的参数, 容器 id 或 null]。 */
  splitInClause(): [ArgumentList, string | null] {
    const count = this.tokens.length;
    if (count > 0 && this.tokens[count - 1]?.is('in')) {
      throw this.usage();
    }
    if (count >= 2 && this.tokens[count - 2]?.is('in')) {
      return [new ArgumentList(this.tokens.slice(0, count - 2), this.syntax), this.text(count - 1)];
    }
    return [this, null];
  }

  private usage(): EditorError {
    return new EditorError(`usage: ${this.syntax}`);
  }
}
