import type { Command } from '../../command/Command.js';
import { GroupShapesCommand } from '../../command/GroupShapesCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class GroupParser extends CommandParser {
  readonly name = 'group';
  readonly syntax = 'group <newGid> <id1> <id2>…';
  readonly description = 'new container holding existing shapes';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(2, Infinity);
    return new GroupShapesCommand(args.text(0), args.rest(1));
  }
}
