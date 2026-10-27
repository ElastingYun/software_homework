import { SvgDocument } from '../model/SvgDocument.js';
import { DocumentCommand } from './DocumentCommand.js';
import type { EditorContext } from './EditorContext.js';

/** init [w] [h]：新建空画布（默认 800×600）作为当前文档。 */
export class InitDocumentCommand extends DocumentCommand {
  constructor(
    private readonly width: number = SvgDocument.DEFAULT_WIDTH,
    private readonly height: number = SvgDocument.DEFAULT_HEIGHT,
  ) {
    super();
  }

  protected run(context: EditorContext): string[] {
    const document = new SvgDocument(this.width, this.height);
    context.openDocument(document, null);
    return [`canvas ${document.sizeLabel} created`];
  }
}
