import { EditorError } from '../model/EditorError.js';
import type { EditorContext } from '../command/EditorContext.js';
import { ArgumentList } from './ArgumentList.js';
import type { CommandRegistry } from './CommandRegistry.js';
import { Tokenizer } from './Tokenizer.js';

/**
 * 命令的调用者（Command 模式中的 Invoker）：一行文本 → 解析器 → 命令对象 → 执行 → 输出行。
 * 空行与 `#` 注释被忽略；EditorError 统一转成一行 `error: …`。
 */
export class CommandInterpreter {
  private readonly tokenizer = new Tokenizer();

  constructor(
    private readonly registry: CommandRegistry,
    private readonly context: EditorContext,
  ) {}

  get finished(): boolean {
    return this.context.shouldQuit;
  }

  interpret(line: string): string[] {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      return [];
    }
    try {
      const [name, ...args] = this.tokenizer.tokenize(trimmed);
      const parser = this.registry.find(name?.text ?? '');
      return parser.parse(new ArgumentList(args, parser.syntax)).execute(this.context);
    } catch (error) {
      if (error instanceof EditorError) {
        return [`error: ${error.message}`];
      }
      return [`error: internal error: ${error instanceof Error ? error.message : String(error)}`];
    }
  }
}
