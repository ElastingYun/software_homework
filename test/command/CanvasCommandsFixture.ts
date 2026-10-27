import { InitDocumentCommand } from '../../src/command/InitDocumentCommand.js';
import { CommandHarness } from '../support/CommandHarness.js';

/** 常用的初始文档。 */
export class CanvasCommandsFixture {
  /** 800x600 画布 + circle#c1 (100,100) r=20 red（create 已入栈）。 */
  static withCircle(): CommandHarness {
    const harness = new CommandHarness();
    harness.run(new InitDocumentCommand(800, 600));
    harness.create('circle', 'c1', ['100', '100', '20', 'red']);
    return harness;
  }

  /** 说明文档第 6 节 group 之前的状态：bg、title、c1、box 都在画布根。 */
  static transcriptScene(): CommandHarness {
    const harness = new CommandHarness();
    harness.run(new InitDocumentCommand(800, 600));
    harness.create('rect', 'bg', ['0', '0', '800', '600', '#ffffff']);
    harness.create('text', 'title', ['20', '40', 'My Diagram']);
    harness.create('circle', 'c1', ['100', '100', '20', 'red']);
    harness.create('rect', 'box', ['200', '80', '60', '60', '#3366ff']);
    return harness;
  }
}
