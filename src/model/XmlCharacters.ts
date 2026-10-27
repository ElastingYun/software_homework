import { EditorError } from './EditorError.js';

/**
 * 文档中的每个字符串（id、属性值、文本）最终都要写进 XML 1.0 文件，
 * 而 XML 1.0 无法表示 C0 控制字符（制表、换行、回车除外）、U+FFFE/U+FFFF 与孤立代理项——连字符引用也不行。
 */
export class XmlCharacters {
  private static readonly FORBIDDEN =
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  private constructor() {}

  /** 含有无法表示的字符时抛出 `invalid character U+XXXX in <what>`。 */
  static require(value: string, what: string): string {
    const match = XmlCharacters.FORBIDDEN.exec(value);
    if (match !== null) {
      const code = (match[0].codePointAt(0) as number).toString(16).toUpperCase().padStart(4, '0');
      throw new EditorError(`invalid character U+${code} in ${what}`);
    }
    return value;
  }
}
