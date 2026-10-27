import { EditorError } from '../model/EditorError.js';
import { DocumentCommand } from './DocumentCommand.js';
import type { EditorContext } from './EditorContext.js';
import { Quantity } from './Quantity.js';

/** save [file]：保存当前文档；无参数时保存到最近一次 read / save 的路径。 */
export class SaveDocumentCommand extends DocumentCommand {
  constructor(private readonly path: string | null = null) {
    super();
  }

  protected run(context: EditorContext): string[] {
    const document = context.requireDocument();
    const target = this.path ?? context.documentPath;
    if (target === null) {
      throw new EditorError("no file path. use 'save <file.svg>'");
    }
    context.storage.save(document, target);
    context.rememberPath(target);
    return [`saved to ${target} (${Quantity.elements(document.shapeCount())})`];
  }
}
