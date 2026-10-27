import type { Command } from '../../command/Command.js';
import { SetAttributeCommand } from '../../command/SetAttributeCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class SetParser extends CommandParser {
  readonly name = 'set';
  readonly syntax = 'set <id> <attr> <value>';
  readonly description = 'set fill / stroke / stroke-width, a geometry attribute, or text';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(3);
    return new SetAttributeCommand(args.text(0), args.text(1), args.text(2));
  }
}
