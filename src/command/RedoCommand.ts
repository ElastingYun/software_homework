import type { Command } from './Command.js';
import type { EditorContext } from './EditorContext.js';

/** redo：重做上一条被撤销的编辑命令。 */
export class RedoCommand implements Command {
  execute(context: EditorContext): string[] {
    context.requireDocument();
    return context.history.redo();
  }
}
