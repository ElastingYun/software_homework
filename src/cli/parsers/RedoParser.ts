import type { Command } from '../../command/Command.js';
import { RedoCommand } from '../../command/RedoCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class RedoParser extends CommandParser {
  readonly name = 'redo';
  readonly syntax = 'redo';
  readonly description = 'redo (cleared by any new edit)';
  readonly category = 'history';

  parse(args: ArgumentList): Command {
    args.expectCount(0);
    return new RedoCommand();
  }
}
