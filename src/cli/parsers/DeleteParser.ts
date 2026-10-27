import type { Command } from '../../command/Command.js';
import { DeleteShapeCommand } from '../../command/DeleteShapeCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class DeleteParser extends CommandParser {
  readonly name = 'delete';
  readonly syntax = 'delete <id>';
  readonly description = 'delete a shape (a container with all its descendants)';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(1);
    return new DeleteShapeCommand(args.text(0));
  }
}
