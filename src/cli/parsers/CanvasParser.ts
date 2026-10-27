import type { Command } from '../../command/Command.js';
import { ResizeCanvasCommand } from '../../command/ResizeCanvasCommand.js';
import { ShowCanvasCommand } from '../../command/ShowCanvasCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class CanvasParser extends CommandParser {
  readonly name = 'canvas';
  readonly syntax = 'canvas [w] [h]';
  readonly description = 'show the canvas size, or change it';
  readonly category = 'document (undo/redo disabled afterwards)';

  parse(args: ArgumentList): Command {
    args.expectCount(0, 2);
    return args.length === 0 ? new ShowCanvasCommand() : new ResizeCanvasCommand(args.number(0), args.optionalNumber(1));
  }
}
