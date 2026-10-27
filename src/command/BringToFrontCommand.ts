import { ReorderCommand } from './ReorderCommand.js';

/** front：移到同级最前（最后绘制，位于最上层）。 */
export class BringToFrontCommand extends ReorderCommand {
  protected destination(siblingsAfterRemoval: number): number {
    return siblingsAfterRemoval;
  }

  protected outcome(): string {
    return 'brought to front';
  }
}
