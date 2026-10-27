import type { Command } from '../../command/Command.js';
import { ShowShapeCommand } from '../../command/ShowShapeCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class ShowParser extends CommandParser {
  readonly name = 'show';
  readonly syntax = 'show <id>';
  readonly description = 'attributes of one shape';
  readonly category = 'display';

  parse(args: ArgumentList): Command {
    args.expectCount(1);
    return new ShowShapeCommand(args.text(0));
  }
}
