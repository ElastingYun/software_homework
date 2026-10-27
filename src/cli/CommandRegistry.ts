import { EditorError } from '../model/EditorError.js';
import type { CommandParser } from './CommandParser.js';

/**
 * 命令分发：命令名 → 解析器。
 * 【按名字分派之二，待重构】本阶段由组装根注册全部内置命令；可演进为命令插件插槽。
 */
export class CommandRegistry {
  private static readonly SYNTAX_WIDTH = 30;
  private readonly parsers = new Map<string, CommandParser>();

  register(parser: CommandParser): this {
    if (this.parsers.has(parser.name)) {
      throw new Error(`command already registered: ${parser.name}`);
    }
    this.parsers.set(parser.name, parser);
    return this;
  }

  find(name: string): CommandParser {
    const parser = this.parsers.get(name);
    if (parser === undefined) {
      throw new EditorError(`unknown command: ${name} (type 'help' for commands)`);
    }
    return parser;
  }

  /** 按注册顺序分组列出全部命令与语法。 */
  helpLines(): string[] {
    const lines: string[] = [];
    const categories = [...new Set([...this.parsers.values()].map((parser) => parser.category))];
    for (const category of categories) {
      lines.push(`${category}:`);
      for (const parser of this.parsers.values()) {
        if (parser.category === category) {
          lines.push(`  ${parser.syntax.padEnd(CommandRegistry.SYNTAX_WIDTH)}  ${parser.description}`);
          lines.push(...parser.helpDetails().map((detail) => `      ${detail}`));
        }
      }
    }
    return lines;
  }
}
