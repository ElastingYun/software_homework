import { EditorError } from './EditorError.js';

/**
 * 数字与文本之间的唯一转换点：严格解析用户/文件输入；
 * 显示（format）与存盘（serialize）采用不同精度——显示求易读，存盘求无损。
 */
export class NumericText {
  private static readonly PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
  private static readonly MAX_DECIMALS = 6;
  private static readonly SIGNIFICANT_DIGITS = 15;

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

  /**
   * 显示用：整数原样输出；小数最多保留 6 位并去掉末尾的 0（消除浮点噪声）；
   * 绝对值过小、按 6 位小数会显示成 0 的非零值改用 6 位有效数字（如 2.5e-7）。
   */
  static format(value: number): string {
    const rounded = Number(value.toFixed(NumericText.MAX_DECIMALS));
    if (rounded === 0 && value !== 0) {
      return String(Number(value.toPrecision(NumericText.MAX_DECIMALS)));
    }
    return NumericText.withoutNegativeZero(rounded);
  }

  /** 存盘用：15 位有效数字——对实际数据无损（double 有 15–17 位），同时去掉 0.1+0.2 式的二进制噪声。 */
  static serialize(value: number): string {
    return NumericText.withoutNegativeZero(Number(value.toPrecision(NumericText.SIGNIFICANT_DIGITS)));
  }

  private static withoutNegativeZero(value: number): string {
    return Object.is(value, -0) ? '0' : String(value);
  }
}
