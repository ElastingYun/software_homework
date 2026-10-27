import type { Command } from '../../command/Command.js';
import { SendToBackCommand } from '../../command/SendToBackCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class BackParser extends CommandParser {
  readonly name = 'back';
  readonly syntax = 'back <id>';
  readonly description = 'send to back among its siblings';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(1);
    return new SendToBackCommand(args.text(0));
  }
}
