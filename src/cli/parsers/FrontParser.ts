import { BringToFrontCommand } from '../../command/BringToFrontCommand.js';
import type { Command } from '../../command/Command.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class FrontParser extends CommandParser {
  readonly name = 'front';
  readonly syntax = 'front <id>';
  readonly description = 'bring to front among its siblings';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(1);
    return new BringToFrontCommand(args.text(0));
  }
}
