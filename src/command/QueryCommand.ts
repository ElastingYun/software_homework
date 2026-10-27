import type { SvgDocument } from '../model/SvgDocument.js';
import type { Command } from './Command.js';
import type { EditorContext } from './EditorContext.js';

/** 显示类命令（Template Method）：只读当前文档，不进入历史。 */
export abstract class QueryCommand implements Command {
  execute(context: EditorContext): string[] {
    return this.query(context.requireDocument());
  }

  protected abstract query(document: SvgDocument): string[];
}
