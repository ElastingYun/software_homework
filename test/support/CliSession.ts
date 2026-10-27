import { expect } from 'vitest';
import { SvgEditorApp } from '../../src/app/SvgEditorApp.js';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import { InMemoryStorage } from './InMemoryStorage.js';

/** 进程内 CLI 会话：逐行执行命令，并能对"文档 + 历史"做快照。 */
export class CliSession {
  readonly storage = new InMemoryStorage();
  readonly app = new SvgEditorApp(this.storage);

  run(...lines: string[]): string[] {
    return lines.flatMap((line) => this.app.interpreter.interpret(line));
  }

  snapshot(): string {
    const context = this.app.context;
    const document = context.hasDocument ? new SvgWriter().write(context.requireDocument()) : '(none)';
    return `${document}|undo=${context.history.undoDepth}|redo=${context.history.redoDepth}|path=${context.documentPath}`;
  }

  /** 该行必须只输出给定错误，且不改变任何状态。 */
  expectError(line: string, error: string): void {
    const before = this.snapshot();
    expect(this.run(line)).toEqual([`error: ${error}`]);
    expect(this.snapshot()).toBe(before);
  }

  file(path: string): string {
    return this.storage.files.get(path) ?? '';
  }
}
