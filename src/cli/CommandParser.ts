import type { Command } from '../command/Command.js';
import type { ArgumentList } from './ArgumentList.js';

/** 一个 CLI 命令的文本语法：把参数解析成命令对象，并提供帮助信息。 */
export abstract class CommandParser {
  abstract readonly name: string;
  abstract readonly syntax: string;
  abstract readonly description: string;
  /** help 中的分组标题。 */
  abstract readonly category: string;

  abstract parse(args: ArgumentList): Command;

  /** help 中附加在本命令下方的说明行。 */
  helpDetails(): string[] {
    return [];
  }
}
