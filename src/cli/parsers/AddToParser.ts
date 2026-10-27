import { AddToGroupCommand } from '../../command/AddToGroupCommand.js';
import type { Command } from '../../command/Command.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class AddToParser extends CommandParser {
  readonly name = 'addto';
  readonly syntax = 'addto <gid> <id>';
  readonly description = 'move an existing shape into a container (last child)';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(2);
    return new AddToGroupCommand(args.text(0), args.text(1));
  }
}
