import { IncompleteXmlError } from './IncompleteXmlError';
import { LineIndex } from './LineIndex';
import { OutlineNode } from './OutlineNode';
import { SourceSpan } from './SourceSpan';

/**
 * 一次解析的状态：从左到右扫描一遍文本，用栈匹配开始/结束标签，
 * 只关心元素结构、标签名、id 与位置。任何不完整之处都抛出 IncompleteXmlError。
 * 不做 DTD、命名空间或 SVG 规范校验。
 */
export class OutlineScan {
  private static readonly NAME = /[A-Za-z_:\u00C0-\uFFFF][\w.:\-\u00B7\u00C0-\uFFFF]*/y;
  private static readonly WHITESPACE = /[ \t\r\n]*/y;
  private static readonly ENTITIES: Readonly<Record<string, string>> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };

  private readonly lines: LineIndex;
  private readonly roots: OutlineNode[] = [];
  private readonly open: Array<{ node: OutlineNode; start: number }> = [];
  private offset = 0;

  constructor(private readonly text: string) {
    this.lines = new LineIndex(text);
  }

  run(): OutlineNode[] {
    for (let next = this.text.indexOf('<', this.offset); next >= 0; next = this.text.indexOf('<', this.offset)) {
      this.offset = next;
      this.markup();
    }
    const unclosed = this.open.at(-1);
    if (unclosed !== undefined) {
      throw new IncompleteXmlError(`unclosed element <${unclosed.node.tagName}>`, unclosed.start);
    }
    return this.roots;
  }

  /** 当前位置是 `<`：按类型分派到注释、CDATA、处理指令、声明、结束标签或开始标签。 */
  private markup(): void {
    if (this.startsWith('<!--')) {
      this.offset = this.endOf(this.offset, '<!--', '-->', 'unterminated comment');
    } else if (this.startsWith('<![CDATA[')) {
      this.offset = this.endOf(this.offset, '<![CDATA[', ']]>', 'unterminated CDATA section');
    } else if (this.startsWith('<?')) {
      this.offset = this.endOf(this.offset, '<?', '?>', 'unterminated processing instruction');
    } else if (this.startsWith('<!')) {
      this.skipDeclaration();
    } else if (this.startsWith('</')) {
      this.endTag();
    } else {
      this.startTag();
    }
  }

  private startTag(): void {
    const start = this.offset;
    this.offset += 1;
    const nameStart = this.offset;
    const tagName = this.readName('expected element name after "<"');
    const nameSpan = this.span(nameStart, this.offset);
    let id: string | null = null;
    for (;;) {
      const hadSpace = this.skipWhitespace();
      if (this.startsWith('/>')) {
        this.offset += 2;
        this.attach(new OutlineNode(tagName, id, nameSpan), start, true);
        return;
      }
      if (this.startsWith('>')) {
        this.offset += 1;
        this.attach(new OutlineNode(tagName, id, nameSpan), start, false);
        return;
      }
      if (this.offset >= this.text.length) {
        throw new IncompleteXmlError(`unterminated start tag <${tagName}>`, start);
      }
      if (!hadSpace) {
        throw new IncompleteXmlError(`expected whitespace before attribute in <${tagName}>`, this.offset);
      }
      const [name, value] = this.attribute(tagName);
      if (name === 'id') {
        const decoded = this.decode(this.normaliseWhitespace(value)).trim();
        id = decoded === '' ? null : decoded;
      }
    }
  }

  private attribute(tagName: string): [string, string] {
    const name = this.readName(`expected attribute name in <${tagName}>`);
    this.skipWhitespace();
    if (!this.startsWith('=')) {
      throw new IncompleteXmlError(`expected "=" after attribute ${name}`, this.offset);
    }
    this.offset += 1;
    this.skipWhitespace();
    const quote = this.text[this.offset];
    if (quote !== '"' && quote !== "'") {
      throw new IncompleteXmlError(`expected quoted value for attribute ${name}`, this.offset);
    }
    const close = this.text.indexOf(quote, this.offset + 1);
    if (close < 0) {
      throw new IncompleteXmlError(`unterminated value of attribute ${name}`, this.offset);
    }
    const value = this.text.slice(this.offset + 1, close);
    if (value.includes('<')) {
      throw new IncompleteXmlError(`"<" in value of attribute ${name}`, this.offset);
    }
    this.offset = close + 1;
    return [name, value];
  }

  private endTag(): void {
    const start = this.offset;
    this.offset += 2;
    const tagName = this.readName('expected element name after "</"');
    this.skipWhitespace();
    if (!this.startsWith('>')) {
      throw new IncompleteXmlError(`unterminated end tag </${tagName}>`, start);
    }
    this.offset += 1;
    const current = this.open.pop();
    if (current === undefined) {
      throw new IncompleteXmlError(`unexpected end tag </${tagName}>`, start);
    }
    if (current.node.tagName !== tagName) {
      throw new IncompleteXmlError(`end tag </${tagName}> does not match <${current.node.tagName}>`, start);
    }
    current.node.close(this.span(current.start, this.offset));
  }

  /** 挂到当前父元素（或作为根）；非自闭合元素入栈等待结束标签。 */
  private attach(node: OutlineNode, start: number, selfClosing: boolean): void {
    const parent = this.open.at(-1);
    if (parent === undefined) {
      this.roots.push(node);
    } else {
      parent.node.appendChild(node);
    }
    if (selfClosing) {
      node.close(this.span(start, this.offset));
    } else {
      this.open.push({ node, start });
    }
  }

  /** `<!DOCTYPE …>` 等声明：跳到配对的 `>`，其间的引号、`[…]` 内部子集以及子集中的注释与处理指令不计。 */
  private skipDeclaration(): void {
    const start = this.offset;
    let depth = 0;
    let quote: string | null = null;
    for (let i = this.offset + 2; i < this.text.length; i++) {
      const char = this.text[i];
      if (quote !== null) {
        quote = char === quote ? null : quote;
      } else if (this.text.startsWith('<!--', i)) {
        i = this.endOf(i, '<!--', '-->', 'unterminated comment') - 1;
      } else if (this.text.startsWith('<?', i)) {
        i = this.endOf(i, '<?', '?>', 'unterminated processing instruction') - 1;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '[') {
        depth += 1;
      } else if (char === ']') {
        depth -= 1;
      } else if (char === '>' && depth <= 0) {
        this.offset = i + 1;
        return;
      }
    }
    throw new IncompleteXmlError('unterminated declaration', start);
  }

  /** 从 start 处的 opener 之后查找 terminator，返回其后的位置（`<!-->` 中的 `-->` 不算结束）。 */
  private endOf(start: number, opener: string, terminator: string, problem: string): number {
    const end = this.text.indexOf(terminator, start + opener.length);
    if (end < 0) {
      throw new IncompleteXmlError(problem, start);
    }
    return end + terminator.length;
  }

  private readName(problem: string): string {
    OutlineScan.NAME.lastIndex = this.offset;
    const match = OutlineScan.NAME.exec(this.text);
    if (match === null) {
      throw new IncompleteXmlError(problem, this.offset);
    }
    this.offset += match[0].length;
    return match[0];
  }

  /** 跳过空白，返回是否跳过了至少一个字符。 */
  private skipWhitespace(): boolean {
    OutlineScan.WHITESPACE.lastIndex = this.offset;
    const length = (OutlineScan.WHITESPACE.exec(this.text) as RegExpExecArray)[0].length;
    this.offset += length;
    return length > 0;
  }

  private startsWith(prefix: string): boolean {
    return this.text.startsWith(prefix, this.offset);
  }

  private span(from: number, to: number): SourceSpan {
    return new SourceSpan(this.lines.positionAt(from), this.lines.positionAt(to));
  }

  /** XML 属性值规范化：换行统一后，字面的制表、换行、回车都变成空格（字符引用 `&#10;` 不受影响）。 */
  private normaliseWhitespace(value: string): string {
    return value.replace(/\r\n?/g, '\n').replace(/[\t\n]/g, ' ');
  }

  /** 属性值中的预定义实体与数字字符引用；无法识别的保持原样。 */
  private decode(value: string): string {
    return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (whole, body: string) => {
      if (body.startsWith('#')) {
        const code = body[1] === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
      }
      return OutlineScan.ENTITIES[body] ?? whole;
    });
  }
}
