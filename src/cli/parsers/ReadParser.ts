import type { Command } from '../../command/Command.js';
import { ReadDocumentCommand } from '../../command/ReadDocumentCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class ReadParser extends CommandParser {
  readonly name = 'read';
  readonly syntax = 'read <file.svg>';
  readonly description = 'open an SVG file as the current document';
  readonly category = 'document (undo/redo disabled afterwards)';

  parse(args: ArgumentList): Command {
    args.expectCount(1);
    return new ReadDocumentCommand(args.text(0));
  }
}
