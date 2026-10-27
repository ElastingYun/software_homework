import { EditorError } from '../model/EditorError.js';
import type { EditCommand } from './EditCommand.js';

/**
 * undo / redo 历史（Command 模式中的 Caretaker）。
 * - 每条成功的编辑命令是一个撤销单元；有新编辑时清空 redo 栈；
 * - IO 类命令设置"历史屏障"：清空两个栈并禁止 undo/redo，直到下一条编辑命令。
 */
export class CommandHistory {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private lockedByIo = false;

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  recordEdit(command: EditCommand): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.lockedByIo = false;
  }

  markIoBarrier(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.lockedByIo = true;
  }

  undo(): string[] {
    if (this.lockedByIo) {
      throw new EditorError('undo not allowed after io command');
    }
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      throw new EditorError('nothing to undo');
    }
    const lines = command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return lines;
  }

  redo(): string[] {
    if (this.lockedByIo) {
      throw new EditorError('redo not allowed after io command');
    }
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      throw new EditorError('nothing to redo');
    }
    const lines = command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return lines;
  }
}
