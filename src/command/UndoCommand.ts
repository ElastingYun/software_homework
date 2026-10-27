import type { Command } from './Command.js';
import type { EditorContext } from './EditorContext.js';

/** undo：撤销上一条编辑命令。 */
export class UndoCommand implements Command {
  execute(context: EditorContext): string[] {
    context.requireDocument();
    return context.history.undo();
  }
}
