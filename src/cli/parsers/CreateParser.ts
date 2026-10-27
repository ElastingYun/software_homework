import type { Command } from '../../command/Command.js';
import { CreateShapeCommand } from '../../command/CreateShapeCommand.js';
import type { ShapeFactory } from '../../model/ShapeFactory.js';
import type { ArgumentList } from '../ArgumentList.js';
import { CommandParser } from '../CommandParser.js';

/** create：类型参数表由图形工厂（各图形类）定义，这里只处理 type、id 与 `in` 子句。 */
export class CreateParser extends CommandParser {
  readonly name = 'create';
  readonly syntax = 'create <type> <id> [params…] [in <containerId>]';
  readonly description = 'create a shape (optionally inside a container):';
  readonly category = 'edit (undoable)';

  constructor(private readonly factory: ShapeFactory) {
    super();
  }

  parse(args: ArgumentList): Command {
    const [params, containerId] = args.splitInClause();
    params.expectCount(2, Infinity);
    const shape = this.factory.create(params.text(0), params.text(1), params.rest(2));
    return new CreateShapeCommand(shape, containerId);
  }

  override helpDetails(): string[] {
    return this.factory.syntaxes().map((syntax) => `${syntax} [in <containerId>]`);
  }
}
