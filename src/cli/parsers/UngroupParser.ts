import type { Command } from '../../command/Command.js';
import { UngroupCommand } from '../../command/UngroupCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class UngroupParser extends CommandParser {
  readonly name = 'ungroup';
  readonly syntax = 'ungroup <gid>';
  readonly description = 'dissolve a nested container into its parent';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(1);
    return new UngroupCommand(args.text(0));
  }
}
