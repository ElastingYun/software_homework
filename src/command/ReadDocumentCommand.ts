import { DocumentCommand } from './DocumentCommand.js';
import type { EditorContext } from './EditorContext.js';
import { Quantity } from './Quantity.js';

/** read <file>：读入 SVG 作为当前文档；缺 id 等问题以警告输出。 */
export class ReadDocumentCommand extends DocumentCommand {
  constructor(private readonly path: string) {
    super();
  }

  protected run(context: EditorContext): string[] {
    const loaded = context.storage.load(this.path);
    context.openDocument(loaded.document, this.path);
    return [
      ...loaded.warnings.map((warning) => `warning: ${warning}`),
      `read ${this.path} (${Quantity.elements(loaded.document.shapeCount())})`,
    ];
  }
}
