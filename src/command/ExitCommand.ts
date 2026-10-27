import type { Command } from './Command.js';
import type { EditorContext } from './EditorContext.js';

/** exit：结束会话。 */
export class ExitCommand implements Command {
  execute(context: EditorContext): string[] {
    context.requestQuit();
    return [];
  }
}
