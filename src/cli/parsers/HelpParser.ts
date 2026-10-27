import type { Command } from '../../command/Command.js';
import { HelpCommand } from '../../command/HelpCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';
import type { CommandRegistry } from '../CommandRegistry.js';

export class HelpParser extends CommandParser {
  readonly name = 'help';
  readonly syntax = 'help';
  readonly description = 'this list';
  readonly category = 'display';

  constructor(private readonly registry: CommandRegistry) {
    super();
  }

  parse(args: ArgumentList): Command {
    args.expectCount(0);
    return new HelpCommand(this.registry.helpLines());
  }
}
