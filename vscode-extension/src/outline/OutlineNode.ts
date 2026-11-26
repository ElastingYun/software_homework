import type { SourceSpan } from './SourceSpan';

/**
 * 大纲中的一个元素：标签名、id、源码范围与子元素。
 * 由 SvgOutlineParser 构建；构建完成后对外只读。
 */
export class OutlineNode {
  private readonly childNodes: OutlineNode[] = [];
  private fullSpan: SourceSpan | null = null;

  constructor(
    readonly tagName: string,
    readonly id: string | null,
    /** 开始标签中标签名的范围：点击大纲节点时光标落在这里。 */
    readonly nameSpan: SourceSpan,
  ) {}

  /** 大纲中显示的名称：有 id 时 `标签名#id`，否则 `标签名`。 */
  get label(): string {
    return this.id === null ? this.tagName : `${this.tagName}#${this.id}`;
  }

  get children(): readonly OutlineNode[] {
    return this.childNodes;
  }

  /** 元素的完整范围：从 `<` 到结束标签（或自闭合标签）的 `>`。 */
  get span(): SourceSpan {
    if (this.fullSpan === null) {
      throw new Error(`element <${this.tagName}> is not closed yet`);
    }
    return this.fullSpan;
  }

  /** 仅供解析器调用。 */
  appendChild(child: OutlineNode): void {
    this.childNodes.push(child);
  }

  /** 仅供解析器调用：元素结束时记录完整范围。 */
  close(span: SourceSpan): void {
    this.fullSpan = span;
  }
}
