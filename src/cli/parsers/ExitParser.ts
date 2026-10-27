import type { Command } from '../../command/Command.js';
import { ExitCommand } from '../../command/ExitCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class ExitParser extends CommandParser {
  readonly name = 'exit';
  readonly syntax = 'exit';
  readonly description = 'quit (or press Ctrl-D)';
  readonly category = 'session';

  parse(args: ArgumentList): Command {
    args.expectCount(0);
    return new ExitCommand();
  }
}
