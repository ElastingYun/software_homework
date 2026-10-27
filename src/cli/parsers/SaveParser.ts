import type { Command } from '../../command/Command.js';
import { SaveDocumentCommand } from '../../command/SaveDocumentCommand.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

export class SaveParser extends CommandParser {
  readonly name = 'save';
  readonly syntax = 'save [file.svg]';
  readonly description = 'save (default: the file last read or saved)';
  readonly category = 'document (undo/redo disabled afterwards)';

  parse(args: ArgumentList): Command {
    args.expectCount(0, 1);
    return new SaveDocumentCommand(args.optionalText(0));
  }
}
