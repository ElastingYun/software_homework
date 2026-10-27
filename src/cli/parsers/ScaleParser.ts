import type { Command } from '../../command/Command.js';
import { ScaleShapeCommand } from '../../command/ScaleShapeCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class ScaleParser extends CommandParser {
  readonly name = 'scale';
  readonly syntax = 'scale <id> <factor>';
  readonly description = 'multiply all positions and sizes (recursive for containers)';
  readonly category = 'edit (undoable)';

  parse(args: ArgumentList): Command {
    args.expectCount(2);
    return new ScaleShapeCommand(args.text(0), args.number(1));
  }
}
