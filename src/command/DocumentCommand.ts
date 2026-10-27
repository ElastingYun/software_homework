import type { Command } from './Command.js';
import type { EditorContext } from './EditorContext.js';

/** 文档类（IO）命令（Template Method）：执行成功后设置历史屏障，禁止 undo/redo。 */
export abstract class DocumentCommand implements Command {
  execute(context: EditorContext): string[] {
    const lines = this.run(context);
    context.history.markIoBarrier();
    return lines;
  }

  protected abstract run(context: EditorContext): string[];
}
