import type { Command } from '../../command/Command.js';
import { UndoCommand } from '../../command/UndoCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class UndoParser extends CommandParser {
  readonly name = 'undo';
  readonly syntax = 'undo';
  readonly description = 'undo the last edit';
  readonly category = 'history';

  parse(args: ArgumentList): Command {
    args.expectCount(0);
    return new UndoCommand();
  }
}
