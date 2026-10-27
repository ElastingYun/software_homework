import type { Command } from '../../command/Command.js';
import { TreeCommand } from '../../command/TreeCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class TreeParser extends CommandParser {
  readonly name = 'tree';
  readonly syntax = 'tree [id]';
  readonly description = 'structure tree (whole document or one subtree)';
  readonly category = 'display';

  parse(args: ArgumentList): Command {
    args.expectCount(0, 1);
    return new TreeCommand(args.optionalText(0));
  }
}
