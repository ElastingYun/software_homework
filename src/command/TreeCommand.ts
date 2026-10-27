import type { SvgDocument } from '../model/SvgDocument.js';
import { TreeRenderer } from '../view/TreeRenderer.js';
import { QueryCommand } from './QueryCommand.js';

/** tree [id]：结构树（默认全文档）。 */
export class TreeCommand extends QueryCommand {
  private readonly renderer = new TreeRenderer();

  constructor(private readonly rootId: string | null = null) {
    super();
  }

  protected query(document: SvgDocument): string[] {
    return this.rootId === null
      ? this.renderer.renderDocument(document)
      : this.renderer.renderSubtree(document.requireShape(this.rootId));
  }
}
