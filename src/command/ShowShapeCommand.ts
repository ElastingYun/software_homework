import type { SvgDocument } from '../model/SvgDocument.js';
import { ShapeInspector } from '../view/ShapeInspector.js';
import { QueryCommand } from './QueryCommand.js';

/** show <id>：单个图形的属性明细。 */
export class ShowShapeCommand extends QueryCommand {
  private readonly inspector = new ShapeInspector();

  constructor(private readonly id: string) {
    super();
  }

  protected query(document: SvgDocument): string[] {
    return this.inspector.render(document.requireShape(this.id));
  }
}
