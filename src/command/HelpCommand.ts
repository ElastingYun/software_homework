import type { Command } from './Command.js';

/** help：显示命令与语法。文本由输入通道提供（CLI 由命令注册表生成）。 */
export class HelpCommand implements Command {
  constructor(private readonly lines: readonly string[]) {}

  execute(): string[] {
    return [...this.lines];
  }
}
