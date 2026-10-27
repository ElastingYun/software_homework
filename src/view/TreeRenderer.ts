import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';

/**
 * `tree` 的文本渲染：树形连线 + 每个图形的内联摘要。
 * 所有摘要从同一列开始（最长"前缀+标签"之后留 2 个空格），便于脱离画布阅读。
 */
export class TreeRenderer {
  private static readonly GAP = 2;
  private static readonly BRANCH = '├── ';
  private static readonly LAST_BRANCH = '└── ';
  private static readonly PIPE = '│   ';
  private static readonly SPACE = '    ';
  /** Unicode East Asian Width 为 W / F 的主要区段。 */
  private static readonly WIDE_RANGES: ReadonlyArray<[number, number]> = [
    [0x1100, 0x115f],
    [0x2e80, 0x303e],
    [0x3041, 0x33ff],
    [0x3400, 0x4dbf],
    [0x4e00, 0x9fff],
    [0xa000, 0xa4cf],
    [0xac00, 0xd7a3],
    [0xf900, 0xfaff],
    [0xfe30, 0xfe4f],
    [0xff00, 0xff60],
    [0xffe0, 0xffe6],
    [0x1f300, 0x1f64f],
    [0x1f900, 0x1f9ff],
    [0x20000, 0x3fffd],
  ];

  /** 整个文档，首行为 `svg (800x600)`。 */
  renderDocument(document: SvgDocument): string[] {
    const rows: Array<[string, string]> = [];
    this.collect(document.root.childShapes(), '', rows);
    const viewBox = document.customViewBox === null ? '' : `, viewBox ${document.customViewBox}`;
    return [`svg (${document.sizeLabel}${viewBox})`, ...this.align(rows)];
  }

  /** 以某个图形为根的子树。 */
  renderSubtree(shape: Shape): string[] {
    const rows: Array<[string, string]> = [[shape.label, shape.summary()]];
    this.collect(shape.children(), '', rows);
    return this.align(rows);
  }

  private collect(children: readonly Shape[], indent: string, rows: Array<[string, string]>): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      rows.push([`${indent}${last ? TreeRenderer.LAST_BRANCH : TreeRenderer.BRANCH}${child.label}`, child.summary()]);
      this.collect(child.children(), indent + (last ? TreeRenderer.SPACE : TreeRenderer.PIPE), rows);
    });
  }

  private align(rows: ReadonlyArray<[string, string]>): string[] {
    const widths = rows.filter(([, summary]) => summary !== '').map(([head]) => this.width(head));
    const column = Math.max(0, ...widths) + TreeRenderer.GAP;
    return rows.map(([head, summary]) =>
      summary === '' ? head : `${head}${' '.repeat(Math.max(1, column - this.width(head)))}${summary}`,
    );
  }

  /** 终端显示宽度：按码点计数，东亚宽字符（中日韩文字、全角符号等）占 2 列。 */
  private width(text: string): number {
    let width = 0;
    for (const character of text) {
      width += this.isWide(character.codePointAt(0) as number) ? 2 : 1;
    }
    return width;
  }

  private isWide(code: number): boolean {
    return TreeRenderer.WIDE_RANGES.some(([from, to]) => code >= from && code <= to);
  }
}
