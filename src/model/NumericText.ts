import { EditorError } from './EditorError.js';

/** 数字与文本之间的唯一转换点：严格解析用户/文件输入，统一格式化输出。 */
export class NumericText {
  private static readonly PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
  private static readonly MAX_DECIMALS = 6;

  private constructor() {}

  /** 严格解析十进制数；不接受 "10px"、"0x10"、"Infinity"、空串，失败返回 null。 */
  static parse(text: string): number | null {
    if (!NumericText.PATTERN.test(text)) {
      return null;
    }
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  }

  /** 同 parse，失败时抛出 `invalid number: <text>`。 */
  static require(text: string): number {
    const value = NumericText.parse(text);
    if (value === null) {
      throw new EditorError(`invalid number: ${text}`);
    }
    return value;
  }

  /** 整数原样输出；小数最多保留 6 位并去掉末尾的 0，消除浮点噪声。 */
  static format(value: number): string {
    const rounded = Number(value.toFixed(NumericText.MAX_DECIMALS));
    return Object.is(rounded, -0) ? '0' : String(rounded);
  }
}
