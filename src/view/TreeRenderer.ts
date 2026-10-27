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

  /** 整个文档，首行为 `svg (800x600)`。 */
  renderDocument(document: SvgDocument): string[] {
    const rows: Array<[string, string]> = [];
    this.collect(document.root.childShapes(), '', rows);
    return [`svg (${document.sizeLabel})`, ...this.align(rows)];
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

  /** 按码点计宽（避免代理对把一个字符算成 2）。 */
  private width(text: string): number {
    return [...text].length;
  }
}
