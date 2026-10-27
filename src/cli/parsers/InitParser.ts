import type { Command } from '../../command/Command.js';
import { InitDocumentCommand } from '../../command/InitDocumentCommand.js';
import { SvgDocument } from '../../model/SvgDocument.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class InitParser extends CommandParser {
  readonly name = 'init';
  readonly syntax = 'init [w] [h]';
  readonly description = 'new empty canvas (default 800x600)';
  readonly category = 'document (undo/redo disabled afterwards)';

  parse(args: ArgumentList): Command {
    args.expectCount(0, 2);
    return new InitDocumentCommand(
      args.optionalNumber(0) ?? SvgDocument.DEFAULT_WIDTH,
      args.optionalNumber(1) ?? SvgDocument.DEFAULT_HEIGHT,
    );
  }
}
