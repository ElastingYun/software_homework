import type { SvgDocument } from '../model/SvgDocument.js';
import type { Command } from './Command.js';
import type { EditorContext } from './EditorContext.js';

/**
 * 可撤销的编辑命令（Template Method）：
 * execute = 取当前文档 → perform（先校验、后修改）→ 记入历史。
 * redo 默认再次 perform（undo 已把文档恢复到 perform 之前）。
 */
export abstract class EditCommand implements Command {
  private boundDocument: SvgDocument | null = null;

  execute(context: EditorContext): string[] {
    const document = context.requireDocument();
    const lines = this.perform(document);
    this.boundDocument = document;
    context.history.recordEdit(this);
    return lines;
  }

  abstract undo(): string[];

  redo(): string[] {
    return this.perform(this.document);
  }

  /** 校验全部通过后才修改文档；校验失败抛出 EditorError。 */
  protected abstract perform(document: SvgDocument): string[];

  /** 命令作用的文档（execute 之后可用）。 */
  protected get document(): SvgDocument {
    if (this.boundDocument === null) {
      throw new Error('command has not been executed');
    }
    return this.boundDocument;
  }
}
