import { createInterface } from 'node:readline';
import type { CommandInterpreter } from './CommandInterpreter.js';

/**
 * `svg>` 交互循环。非交互输入（管道 / 重定向脚本）时回显每条命令，
 * 注释与空行原样输出，使脚本回放得到与手工操作一致的 transcript。
 */
export class Repl {
  static readonly PROMPT = 'svg> ';

  constructor(
    private readonly interpreter: CommandInterpreter,
    private readonly input: NodeJS.ReadableStream,
    private readonly output: NodeJS.WritableStream,
    private readonly interactive: boolean,
  ) {}

  async run(banner: string): Promise<void> {
    this.print(banner);
    this.print('');
    const reader = createInterface({
      input: this.input,
      output: this.interactive ? this.output : undefined,
      terminal: this.interactive,
      prompt: Repl.PROMPT,
      crlfDelay: Infinity,
    });
    reader.on('SIGINT', () => reader.close());
    reader.prompt();
    for await (const line of reader) {
      this.echo(line);
      for (const out of this.interpreter.interpret(line)) {
        this.print(out);
      }
      if (this.interpreter.finished) {
        break;
      }
      reader.prompt();
    }
    reader.close();
    if (this.interactive && !this.interpreter.finished) {
      this.print('');
    }
  }

  private echo(line: string): void {
    if (this.interactive) {
      return;
    }
    const trimmed = line.trim();
    this.print(trimmed === '' || trimmed.startsWith('#') ? line : `${Repl.PROMPT}${line}`);
  }

  private print(line: string): void {
    this.output.write(`${line}\n`);
  }
}
