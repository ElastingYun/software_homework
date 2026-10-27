/**
 * SVG 文本的默认空白处理（xml:space="default"）：连续空白折叠为一个空格、去掉首尾空白。
 * 读入时用它规范化文本；写出时据此判断是否需要声明 xml:space="preserve"。
 */
export class SvgWhitespace {
  private constructor() {}

  static collapse(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /** 文本在默认空白处理下会改变，即依赖 preserve 才能原样保留。 */
  static isSignificant(text: string): boolean {
    return SvgWhitespace.collapse(text) !== text;
  }
}
