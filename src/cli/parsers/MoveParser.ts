import type { Command } from '../../command/Command.js';
import { MoveShapeCommand } from '../../command/MoveShapeCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class MoveParser extends CommandParser {
  readonly name = 'move';
  readonly syntax = 'move <id> <dx> <dy>';
  readonly description = 'translate by (dx,dy); containers move as a whole';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(3);
    return new MoveShapeCommand(args.text(0), args.number(1), args.number(2));
  }
}
