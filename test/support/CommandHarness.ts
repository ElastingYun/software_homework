import { expect } from 'vitest';
import { SvgWriter } from '../../src/io/SvgWriter.js';
import type { Command } from '../../src/command/Command.js';
import { CreateShapeCommand } from '../../src/command/CreateShapeCommand.js';
import { EditorContext } from '../../src/command/EditorContext.js';
import type { SvgDocument } from '../../src/model/SvgDocument.js';
import { DocumentInvariants } from './DocumentInvariants.js';
import { InMemoryStorage } from './InMemoryStorage.js';
import { TestShapes } from './TestShapes.js';

/** 命令层测试夹具：内存存储 + 编辑会话 + 状态快照。 */
export class CommandHarness {
  readonly storage = new InMemoryStorage();
  readonly context = new EditorContext(this.storage);
  readonly factory = TestShapes.factory();
  private readonly writer = new SvgWriter();

  run(command: Command): string[] {
    const lines = command.execute(this.context);
    if (this.context.hasDocument) {
      DocumentInvariants.check(this.document);
    }
    return lines;
  }

  create(type: string, id: string, params: string[], containerId: string | null = null): string[] {
    return this.run(new CreateShapeCommand(this.factory.create(type, id, params), containerId));
  }

  get document(): SvgDocument {
    return this.context.requireDocument();
  }

  /** 文档内容 + 历史栈深度 + 路径：用于断言"失败不改变任何状态"。 */
  snapshot(): string {
    const document = this.context.hasDocument ? this.writer.write(this.document) : '(no document)';
    const history = this.context.history;
    return `${document}\nundo=${history.undoDepth} redo=${history.redoDepth} path=${this.context.documentPath}`;
  }

  /** 命令必须以给定消息失败，且失败前后状态完全相同。 */
  expectFailure(command: Command, message: string): void {
    const before = this.snapshot();
    expect(() => command.execute(this.context)).toThrow(message);
    expect(this.snapshot()).toBe(before);
    if (this.context.hasDocument) {
      DocumentInvariants.check(this.document);
    }
  }

  /** 文档序的全部 id。 */
  ids(): string[] {
    return this.document.allShapes().map((shape) => shape.id);
  }
}
